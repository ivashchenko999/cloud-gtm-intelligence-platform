export interface HealthResponse {
  status: 'ok';
  service: string;
  timestamp: string;
}

/**
 * Placeholder health handler. The API Gateway + Lambda wiring, middleware and
 * real resource handlers arrive in M4.
 */
export function getHealth(now: Date = new Date()): HealthResponse {
  return {
    status: 'ok',
    service: 'cloud-gtm-api',
    timestamp: now.toISOString(),
  };
}
