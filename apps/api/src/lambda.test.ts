import { describe, expect, it } from 'vitest';
import { createTestHandler, getEvent, parseResult } from './test-support';

describe('lambda router', () => {
  const handler = createTestHandler();

  it('returns the health payload for GET /api/health', async () => {
    const { statusCode, body } = parseResult(await handler(getEvent('/api/health')));
    expect(statusCode).toBe(200);
    expect(body).toMatchObject({ status: 'ok', service: 'cloud-gtm-api' });
  });

  it('serves routes without the /api prefix too', async () => {
    const { statusCode } = parseResult(await handler(getEvent('/health')));
    expect(statusCode).toBe(200);
  });

  it('tolerates a trailing slash on a route', async () => {
    const { statusCode } = parseResult(await handler(getEvent('/api/health/')));
    expect(statusCode).toBe(200);
  });

  it('returns a NOT_FOUND error envelope for unknown routes', async () => {
    const { statusCode, body } = parseResult(await handler(getEvent('/api/unknown')));
    expect(statusCode).toBe(404);
    expect(body).toMatchObject({ code: 'NOT_FOUND', requestId: 'test-request' });
  });
});
