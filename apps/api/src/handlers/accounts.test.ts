import { describe, expect, it } from 'vitest';
import type { AccountResponse, ListAccountsResponse } from '@cloud-gtm/contracts';
import { buildAccount, createTestHandler, getEvent, parseResult } from '../test-support';

const accounts: AccountResponse[] = [
  buildAccount({
    id: 'alpha',
    name: 'Alpha Corp',
    domain: 'alpha.io',
    industry: 'Fintech',
    primaryCloud: 'AWS',
    purchaseIntentScore: 90,
    scoreLevel: 'HIGH',
    marketplaceActivity: 'HIGH',
    estimatedCloudSpend: 400_000,
    scoreFactors: [
      { code: 'HIGH_MARKETPLACE_ACTIVITY', label: 'High marketplace activity', points: 30 },
    ],
  }),
  buildAccount({
    id: 'bravo',
    name: 'Bravo Ltd',
    domain: 'bravo.com',
    industry: 'Retail',
    primaryCloud: 'AZURE',
    purchaseIntentScore: 55,
    scoreLevel: 'MEDIUM',
  }),
  buildAccount({
    id: 'charlie',
    name: 'Charlie GmbH',
    domain: 'charlie.de',
    industry: 'Fintech',
    primaryCloud: 'GCP',
    purchaseIntentScore: 20,
    scoreLevel: 'LOW',
  }),
];

function listAccounts(
  query?: Record<string, string>,
): Promise<{ statusCode: number; body: unknown }> {
  const handler = createTestHandler({ accounts });
  return handler(getEvent('/api/accounts', query)).then(parseResult);
}

describe('GET /accounts', () => {
  it('returns paginated summaries sorted by intent score (default desc)', async () => {
    const { statusCode, body } = await listAccounts();
    expect(statusCode).toBe(200);
    const page = body as ListAccountsResponse;
    expect(page.items.map((item) => item.id)).toEqual(['alpha', 'bravo', 'charlie']);
    expect(page.pagination).toEqual({ page: 1, pageSize: 25, totalItems: 3, totalPages: 1 });
  });

  it('returns slim summaries without score factors', async () => {
    const { body } = await listAccounts();
    const [first] = (body as ListAccountsResponse).items;
    expect(first).not.toHaveProperty('scoreFactors');
    expect(first).not.toHaveProperty('workspaceId');
    expect(first).toMatchObject({ id: 'alpha', purchaseIntentScore: 90, scoreLevel: 'HIGH' });
  });

  it('filters by score level', async () => {
    const { body } = await listAccounts({ scoreLevel: 'HIGH' });
    expect((body as ListAccountsResponse).items.map((i) => i.id)).toEqual(['alpha']);
  });

  it('filters by cloud provider', async () => {
    const { body } = await listAccounts({ cloudProvider: 'AZURE' });
    expect((body as ListAccountsResponse).items.map((i) => i.id)).toEqual(['bravo']);
  });

  it('filters by minimum score', async () => {
    const { body } = await listAccounts({ minScore: '50' });
    expect((body as ListAccountsResponse).items.map((i) => i.id)).toEqual(['alpha', 'bravo']);
  });

  it('searches across name and domain', async () => {
    const { body } = await listAccounts({ search: 'charlie.de' });
    expect((body as ListAccountsResponse).items.map((i) => i.id)).toEqual(['charlie']);
  });

  it('sorts by name ascending when requested', async () => {
    const { body } = await listAccounts({ sortBy: 'name', sortOrder: 'asc' });
    expect((body as ListAccountsResponse).items.map((i) => i.id)).toEqual([
      'alpha',
      'bravo',
      'charlie',
    ]);
  });

  it('paginates with page and pageSize', async () => {
    const { body } = await listAccounts({ page: '2', pageSize: '1' });
    const page = body as ListAccountsResponse;
    expect(page.items.map((i) => i.id)).toEqual(['bravo']);
    expect(page.pagination).toEqual({ page: 2, pageSize: 1, totalItems: 3, totalPages: 3 });
  });

  it('rejects invalid query params with a VALIDATION_ERROR envelope', async () => {
    const { statusCode, body } = await listAccounts({ scoreLevel: 'PLATINUM' });
    expect(statusCode).toBe(400);
    expect(body).toMatchObject({ code: 'VALIDATION_ERROR' });
    expect((body as { details: unknown[] }).details.length).toBeGreaterThan(0);
  });
});

describe('GET /accounts/{accountId}', () => {
  it('returns the full account with score factors', async () => {
    const handler = createTestHandler({ accounts });
    const { statusCode, body } = parseResult(await handler(getEvent('/api/accounts/alpha')));
    expect(statusCode).toBe(200);
    expect(body).toMatchObject({
      id: 'alpha',
      scoreFactors: [{ code: 'HIGH_MARKETPLACE_ACTIVITY', points: 30 }],
    });
    expect(body).not.toHaveProperty('workspaceId');
  });

  it('returns NOT_FOUND for a missing account', async () => {
    const handler = createTestHandler({ accounts });
    const { statusCode, body } = parseResult(await handler(getEvent('/api/accounts/missing')));
    expect(statusCode).toBe(404);
    expect(body).toMatchObject({ code: 'NOT_FOUND' });
  });
});
