import { jsonResponse } from '../http/responses';
import type { RouteHandler } from '../http/router';

export interface HealthResponse {
  status: 'ok';
  service: string;
  timestamp: string;
}

/** Pure health payload; kept separate so tests assert it without a full event. */
export function getHealth(now: Date = new Date()): HealthResponse {
  return {
    status: 'ok',
    service: 'cloud-gtm-api',
    timestamp: now.toISOString(),
  };
}

/** Smoke route at `GET /api/health` — no auth, no data access. */
export const handleHealth: RouteHandler = () => Promise.resolve(jsonResponse(200, getHealth()));
