import { randomUUID } from 'node:crypto';
import type { APIGatewayProxyEventV2, APIGatewayProxyResultV2 } from 'aws-lambda';
import type { Repositories } from '@cloud-gtm/database';
import type { z, ZodTypeAny } from 'zod';
import type { ApiConfig } from '../config';
import { createRequestContext, type RequestContext } from './context';
import { HttpError } from './errors';
import { errorResponse } from './responses';

/** Everything a handler needs beyond the raw event: data access and config. */
export interface HandlerDeps {
  repositories: Repositories;
  config: ApiConfig;
}

/** Arguments passed to every route handler after middleware runs. */
export interface HandlerArgs {
  event: APIGatewayProxyEventV2;
  /** Path parameters extracted from the matched route (e.g. `accountId`). */
  params: Record<string, string>;
  ctx: RequestContext;
  deps: HandlerDeps;
}

export type RouteHandler = (args: HandlerArgs) => Promise<APIGatewayProxyResultV2>;

interface Route {
  method: string;
  /** Pattern segments; a leading `:` marks a path parameter. */
  segments: string[];
  handler: RouteHandler;
}

/** Declares one route. `path` uses `:name` for parameters, e.g. `/accounts/:id`. */
export function route(method: string, path: string, handler: RouteHandler): Route {
  return { method, segments: splitPath(path), handler };
}

function splitPath(path: string): string[] {
  return path.split('/').filter((segment) => segment.length > 0);
}

/**
 * Normalizes an incoming request path: drops the CloudFront/API Gateway `/api`
 * prefix and any trailing slash so routes are declared without them.
 */
function normalizePath(rawPath: string): string[] {
  const segments = splitPath(rawPath);
  return segments[0] === 'api' ? segments.slice(1) : segments;
}

function matchRoute(
  routes: readonly Route[],
  method: string,
  segments: string[],
): { handler: RouteHandler; params: Record<string, string> } | undefined {
  for (const candidate of routes) {
    if (candidate.method !== method || candidate.segments.length !== segments.length) continue;

    const params: Record<string, string> = {};
    let matched = true;
    for (const [index, pattern] of candidate.segments.entries()) {
      const value = segments[index] ?? '';
      if (pattern.startsWith(':')) {
        params[pattern.slice(1)] = decodeURIComponent(value);
      } else if (pattern !== value) {
        matched = false;
        break;
      }
    }
    if (matched) return { handler: candidate.handler, params };
  }
  return undefined;
}

/**
 * Validates `data` against `schema`, throwing a 400 {@link HttpError} whose
 * details map one-to-one to the Zod issues. Handlers use this for query and
 * path parameters so validation failures share one JSON shape.
 */
export function parseOrThrow<TSchema extends ZodTypeAny>(
  schema: TSchema,
  data: unknown,
): z.infer<TSchema> {
  const result = schema.safeParse(data);
  if (!result.success) throw HttpError.fromZodError(result.error);
  return result.data;
}

/**
 * Builds the Lambda handler from a route table and its dependencies. The
 * dependency seam lets tests drive real handlers against an in-memory table
 * while production wires a DynamoDB-backed gateway.
 */
export function createRouter(routes: readonly Route[], deps: HandlerDeps) {
  return async function handler(event: APIGatewayProxyEventV2): Promise<APIGatewayProxyResultV2> {
    const method = event.requestContext.http.method;
    const segments = normalizePath(event.rawPath);
    const route = `${method} /${segments.join('/')}`;
    const requestId = event.requestContext.requestId ?? randomUUID();
    const ctx = createRequestContext({ workspaceId: deps.config.workspaceId, requestId, route });

    const match = matchRoute(routes, method, segments);
    if (!match) {
      return errorResponse(404, 'NOT_FOUND', `No route for ${route}`, { requestId });
    }

    try {
      return await match.handler({ event, params: match.params, ctx, deps });
    } catch (error) {
      if (error instanceof HttpError) {
        if (error.status >= 500) ctx.logger.error('Handler error', { error });
        else ctx.logger.warn('Request rejected', { code: error.code, reason: error.message });
        return errorResponse(error.status, error.code, error.message, {
          ...(error.details && { details: error.details }),
          requestId,
        });
      }
      ctx.logger.error('Unhandled error', { error });
      return errorResponse(500, 'INTERNAL_ERROR', 'Internal server error', { requestId });
    }
  };
}
