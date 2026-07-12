import { describe, expect, it } from 'vitest';
import { getHealth } from './health';

describe('getHealth', () => {
  it('reports an ok status with an ISO timestamp', () => {
    const response = getHealth(new Date('2026-07-12T18:00:00.000Z'));
    expect(response.status).toBe('ok');
    expect(response.service).toBe('cloud-gtm-api');
    expect(response.timestamp).toBe('2026-07-12T18:00:00.000Z');
  });
});
