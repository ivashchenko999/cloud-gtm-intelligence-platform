export interface HealthResponse {
  status: 'ok';
  service: string;
  timestamp: string;
}

/**
 * Health handler exposed at `GET /api/health` (see `../lambda.ts`). Middleware
 * and the real resource handlers arrive in M4.
 */
export function getHealth(now: Date = new Date()): HealthResponse {
  return {
    status: 'ok',
    service: 'cloud-gtm-api',
    timestamp: now.toISOString(),
  };
}
