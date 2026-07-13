import type { APIGatewayProxyEventV2, APIGatewayProxyResultV2 } from 'aws-lambda';
import { getHealth } from './handlers/health';

/**
 * Runtime configuration resolved from the environment the CDK `ApiStack`
 * injects into the Lambda. Kept intentionally small for M8 — the data and AI
 * integrations grow into this as their handlers land.
 */
export interface ApiConfig {
  tableName: string;
  geminiSecretArn: string;
}

function readConfig(env: NodeJS.ProcessEnv = process.env): ApiConfig {
  return {
    tableName: env.TABLE_NAME ?? '',
    geminiSecretArn: env.GEMINI_SECRET_ARN ?? '',
  };
}

const JSON_HEADERS = { 'content-type': 'application/json' } as const;

function json(statusCode: number, body: unknown): APIGatewayProxyResultV2 {
  return {
    statusCode,
    headers: JSON_HEADERS,
    body: JSON.stringify(body),
  };
}

/**
 * API Gateway HTTP API (payload format 2.0) entry point. Routes are matched on
 * the normalized `METHOD /path` route key so the same handler works whether the
 * function is invoked directly or fronted by CloudFront's `/api/*` behavior.
 */
export async function handler(event: APIGatewayProxyEventV2): Promise<APIGatewayProxyResultV2> {
  const method = event.requestContext.http.method;
  const path = event.rawPath.replace(/\/+$/, '') || '/';
  const route = `${method} ${path}`;

  try {
    switch (route) {
      case 'GET /api/health':
      case 'GET /health':
        return json(200, getHealth());
      default:
        return json(404, { error: 'not_found', route });
    }
  } catch (error) {
    console.error('Unhandled error handling request', { route, error });
    return json(500, { error: 'internal_server_error' });
  }
}

export { readConfig };
