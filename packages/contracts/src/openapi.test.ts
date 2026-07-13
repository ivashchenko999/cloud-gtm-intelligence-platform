import { describe, expect, it } from 'vitest';
import { buildOpenApiDocument } from './openapi';

describe('buildOpenApiDocument', () => {
  const doc = buildOpenApiDocument();

  it('documents every REST path', () => {
    expect(Object.keys(doc.paths ?? {})).toEqual(
      expect.arrayContaining([
        '/health',
        '/dashboard',
        '/accounts',
        '/accounts/{accountId}',
        '/accounts/{accountId}/insights/explanation',
        '/imports',
        '/imports/{importId}',
      ]),
    );
  });

  it('registers shared enums and DTOs as reusable components', () => {
    const schemas = doc.components?.schemas ?? {};
    expect(schemas).toHaveProperty('ScoreLevel');
    expect(schemas).toHaveProperty('Account');
    expect(schemas).toHaveProperty('DashboardResponse');
    expect(schemas).toHaveProperty('ErrorResponse');
  });

  it('references shared enums by $ref rather than inlining them', () => {
    const account = doc.components?.schemas?.Account;
    const scoreLevel =
      account && 'properties' in account ? account.properties?.scoreLevel : undefined;
    expect(scoreLevel).toEqual({ $ref: '#/components/schemas/ScoreLevel' });
  });
});
