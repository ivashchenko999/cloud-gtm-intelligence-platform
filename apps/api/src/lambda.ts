import type { APIGatewayProxyEventV2, APIGatewayProxyResultV2 } from 'aws-lambda';
import { readConfig, type ApiConfig } from './config';
import { getAccount, listAccounts } from './handlers/accounts';
import { getDashboard } from './handlers/dashboard';
import { handleHealth } from './handlers/health';
import { createImport } from './handlers/imports';
import { createRouter, route, type HandlerDeps } from './http/router';
import { getRepositories } from './repositories';
import { getUploadSigner } from './storage/uploads';

/**
 * The API's route table. Paths are declared without the `/api` prefix and the
 * router strips it from incoming requests, so the same handlers serve both the
 * direct Lambda URL and CloudFront's `/api/*` behavior.
 */
export const routes = [
  route('GET', '/health', handleHealth),
  route('GET', '/dashboard', getDashboard),
  route('GET', '/accounts', listAccounts),
  route('GET', '/accounts/:accountId', getAccount),
  route('POST', '/imports', createImport),
] as const;

/** Builds a handler over injected dependencies — the seam tests drive. */
export function createHandler(deps: HandlerDeps) {
  return createRouter(routes, deps);
}

const config = readConfig();
const productionHandler = createHandler({
  config,
  repositories: getRepositories(config.tableName),
  uploads: getUploadSigner(),
});

/** API Gateway HTTP API (payload format 2.0) entry point. */
export function handler(event: APIGatewayProxyEventV2): Promise<APIGatewayProxyResultV2> {
  return productionHandler(event);
}

export { readConfig };
export type { ApiConfig };
