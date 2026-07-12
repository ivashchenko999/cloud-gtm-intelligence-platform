import { describe, expect, it } from 'vitest';
import type { APIGatewayProxyEventV2 } from 'aws-lambda';
import { handler, readConfig } from './lambda';

function event(method: string, path: string): APIGatewayProxyEventV2 {
  return {
    version: '2.0',
    routeKey: `${method} ${path}`,
    rawPath: path,
    rawQueryString: '',
    headers: {},
    requestContext: {
      http: { method, path, protocol: 'HTTP/1.1', sourceIp: '127.0.0.1', userAgent: 'test' },
    },
    isBase64Encoded: false,
  } as unknown as APIGatewayProxyEventV2;
}

describe('lambda handler', () => {
  it('returns health payload for GET /api/health', async () => {
    const result = await handler(event('GET', '/api/health'));
    expect(result).toMatchObject({ statusCode: 200 });
    const body = JSON.parse((result as { body: string }).body);
    expect(body).toMatchObject({ status: 'ok', service: 'cloud-gtm-api' });
  });

  it('tolerates a trailing slash on the health route', async () => {
    const result = await handler(event('GET', '/api/health/'));
    expect(result).toMatchObject({ statusCode: 200 });
  });

  it('returns 404 for unknown routes', async () => {
    const result = await handler(event('GET', '/api/unknown'));
    expect(result).toMatchObject({ statusCode: 404 });
    const body = JSON.parse((result as { body: string }).body);
    expect(body.error).toBe('not_found');
  });
});

describe('readConfig', () => {
  it('reads table name and secret ARN from the environment', () => {
    const config = readConfig({ TABLE_NAME: 'T', GEMINI_SECRET_ARN: 'arn:secret' });
    expect(config).toEqual({ tableName: 'T', geminiSecretArn: 'arn:secret' });
  });

  it('falls back to empty strings when unset', () => {
    expect(readConfig({})).toEqual({ tableName: '', geminiSecretArn: '' });
  });
});
