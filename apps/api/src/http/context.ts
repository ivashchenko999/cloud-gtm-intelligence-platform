import { Logger } from '@aws-lambda-powertools/logger';

/**
 * Per-request context threaded through every handler. `workspaceId` scopes all
 * data access; `requestId` correlates logs and error envelopes; `logger` is a
 * Powertools logger already bound to those keys.
 */
export interface RequestContext {
  workspaceId: string;
  requestId: string;
  logger: Logger;
}

/** Shared base logger; per-request children add request-scoped keys. */
const baseLogger = new Logger({ serviceName: 'cloud-gtm-api' });

export function createRequestContext(input: {
  workspaceId: string;
  requestId: string;
  route: string;
}): RequestContext {
  const logger = baseLogger.createChild();
  logger.appendKeys({
    requestId: input.requestId,
    workspaceId: input.workspaceId,
    route: input.route,
  });
  return { workspaceId: input.workspaceId, requestId: input.requestId, logger };
}
