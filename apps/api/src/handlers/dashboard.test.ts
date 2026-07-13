import { describe, expect, it } from 'vitest';
import type { DashboardResponse } from '@cloud-gtm/contracts';
import { buildAccount, createTestHandler, getEvent, parseResult } from '../test-support';

const accounts = [
  buildAccount({
    id: 'a',
    primaryCloud: 'AWS',
    purchaseIntentScore: 90,
    scoreLevel: 'HIGH',
    estimatedCloudSpend: 400_000,
    industry: 'Fintech',
  }),
  buildAccount({
    id: 'b',
    primaryCloud: 'GCP',
    purchaseIntentScore: 80,
    scoreLevel: 'HIGH',
    estimatedCloudSpend: 200_000,
    industry: 'Fintech',
  }),
  buildAccount({
    id: 'c',
    primaryCloud: 'AZURE',
    purchaseIntentScore: 50,
    scoreLevel: 'MEDIUM',
    estimatedCloudSpend: 50_000,
    industry: 'Retail',
  }),
  buildAccount({
    id: 'd',
    primaryCloud: 'AWS',
    purchaseIntentScore: 10,
    scoreLevel: 'LOW',
    estimatedCloudSpend: 5_000,
    industry: 'Retail',
  }),
];

async function getDashboard(): Promise<DashboardResponse> {
  const handler = createTestHandler({ accounts });
  const { statusCode, body } = parseResult(await handler(getEvent('/api/dashboard')));
  expect(statusCode).toBe(200);
  return body as DashboardResponse;
}

describe('GET /dashboard', () => {
  it('computes KPI totals from the workspace accounts', async () => {
    const dashboard = await getDashboard();
    expect(dashboard).toMatchObject({
      totalAccounts: 4,
      highIntentAccounts: 2,
      averageIntentScore: 57.5,
      estimatedPipelineValue: 600_000,
      cloudOpportunities: { aws: 1, azure: 0, gcp: 1 },
      latestImport: null,
    });
  });

  it('builds intent, cloud, and industry distributions', async () => {
    const dashboard = await getDashboard();
    expect(dashboard.intentDistribution).toEqual([
      { key: 'HIGH', count: 2 },
      { key: 'MEDIUM', count: 1 },
      { key: 'LOW', count: 1 },
    ]);
    expect(dashboard.cloudDistribution).toEqual([
      { key: 'AWS', count: 2 },
      { key: 'AZURE', count: 1 },
      { key: 'GCP', count: 1 },
    ]);
    expect(dashboard.industryDistribution).toEqual([
      { key: 'Fintech', count: 2 },
      { key: 'Retail', count: 2 },
    ]);
  });

  it('ranks the top accounts by intent score', async () => {
    const dashboard = await getDashboard();
    expect(dashboard.topAccounts.map((account) => account.id)).toEqual(['a', 'b', 'c', 'd']);
  });

  it('returns a zeroed dashboard when there are no accounts', async () => {
    const handler = createTestHandler();
    const { body } = parseResult(await handler(getEvent('/api/dashboard')));
    expect(body).toMatchObject({
      totalAccounts: 0,
      highIntentAccounts: 0,
      averageIntentScore: 0,
      estimatedPipelineValue: 0,
      intentDistribution: [],
      topAccounts: [],
      latestImport: null,
    });
  });
});
