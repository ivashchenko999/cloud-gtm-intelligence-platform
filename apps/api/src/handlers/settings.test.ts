import { describe, expect, it } from 'vitest';
import type { ResetWorkspaceResponse } from '@cloud-gtm/contracts';
import type { AIInsightRecord } from '@cloud-gtm/database';
import { createHandler } from '../lambda';
import { DEFAULT_WORKSPACE_ID } from '../config';
import { buildAccount, buildTestDeps, parseResult, postEvent } from '../test-support';

function harness() {
  const { deps, repositories } = buildTestDeps();
  return { handler: createHandler(deps), repositories };
}

describe('POST /settings/reset-workspace', () => {
  it('deletes imported workspace data and returns deletion counts', async () => {
    const { handler, repositories } = harness();
    const account = buildAccount({
      id: 'acc-reset',
      importId: 'imp-reset',
      scoreFactors: [{ code: 'cloud_spend', label: 'Cloud spend', points: 20 }],
    });
    const now = '2026-07-13T12:00:00.000Z';

    await repositories.imports.save({
      id: 'imp-reset',
      workspaceId: DEFAULT_WORKSPACE_ID,
      filename: 'reset.csv',
      status: 'PARTIALLY_COMPLETED',
      uploadedBy: 'demo-user',
      uploadedAt: now,
      totalRows: 2,
      successfulRows: 1,
      failedRows: 1,
    });
    await repositories.imports.addErrors(DEFAULT_WORKSPACE_ID, [
      { importId: 'imp-reset', rowNumber: 2, message: 'Missing domain.' },
    ]);
    await repositories.accounts.save({ ...account, workspaceId: DEFAULT_WORKSPACE_ID });
    await repositories.accounts.saveScore({
      accountId: account.id,
      workspaceId: DEFAULT_WORKSPACE_ID,
      score: account.purchaseIntentScore,
      level: account.scoreLevel,
      version: account.scoreVersion,
      factors: account.scoreFactors,
      scoredAt: now,
    });
    const insight: AIInsightRecord = {
      id: 'ins-reset',
      workspaceId: DEFAULT_WORKSPACE_ID,
      accountId: account.id,
      type: 'EXPLANATION',
      locale: 'en-CA',
      content: {
        type: 'EXPLANATION',
        summary: 'High intent.',
        reasons: ['Cloud spend is meaningful.'],
        confidenceNote: 'Demo confidence.',
      },
      cached: false,
      createdAt: now,
    };
    await repositories.insights.save(insight);
    await repositories.dashboard.save({
      workspaceId: DEFAULT_WORKSPACE_ID,
      totalAccounts: 1,
      highIntentAccounts: 0,
      averageIntentScore: account.purchaseIntentScore,
      estimatedPipelineValue: 10_000,
      cloudOpportunities: { aws: 1, azure: 0, gcp: 0 },
      intentDistribution: [{ key: account.scoreLevel, count: 1 }],
      cloudDistribution: [{ key: account.primaryCloud, count: 1 }],
      industryDistribution: [{ key: account.industry ?? 'Unknown', count: 1 }],
      topAccounts: [account],
      latestImport: {
        id: 'imp-reset',
        filename: 'reset.csv',
        status: 'PARTIALLY_COMPLETED',
        uploadedBy: 'demo-user',
        uploadedAt: now,
        totalRows: 2,
        successfulRows: 1,
        failedRows: 1,
      },
    });

    const { statusCode, body } = parseResult(
      await handler(postEvent('/api/settings/reset-workspace', { confirmation: 'RESET' })),
    );

    expect(statusCode).toBe(200);
    expect(body as ResetWorkspaceResponse).toEqual({
      deletedImports: 1,
      deletedImportErrors: 1,
      deletedAccounts: 1,
      deletedAccountScores: 1,
      deletedInsights: 1,
      deletedDashboardSummaries: 1,
    });
    expect(await repositories.imports.list(DEFAULT_WORKSPACE_ID)).toHaveLength(0);
    expect(await repositories.imports.listErrors(DEFAULT_WORKSPACE_ID, 'imp-reset')).toHaveLength(
      0,
    );
    expect(await repositories.accounts.list(DEFAULT_WORKSPACE_ID)).toHaveLength(0);
    expect(
      await repositories.accounts.getScore(DEFAULT_WORKSPACE_ID, account.id, account.scoreVersion),
    ).toBeUndefined();
    expect(
      await repositories.insights.listByAccount(DEFAULT_WORKSPACE_ID, account.id),
    ).toHaveLength(0);
    expect(await repositories.dashboard.get(DEFAULT_WORKSPACE_ID)).toBeUndefined();
  });

  it('rejects reset requests without the exact confirmation token', async () => {
    const { handler, repositories } = harness();
    await repositories.imports.save({
      id: 'imp-keep',
      workspaceId: DEFAULT_WORKSPACE_ID,
      filename: 'keep.csv',
      status: 'COMPLETED',
      uploadedBy: 'demo-user',
      uploadedAt: '2026-07-13T12:00:00.000Z',
      totalRows: 1,
      successfulRows: 1,
      failedRows: 0,
    });

    const { statusCode, body } = parseResult(
      await handler(postEvent('/api/settings/reset-workspace', { confirmation: 'reset' })),
    );

    expect(statusCode).toBe(400);
    expect(body).toMatchObject({ code: 'VALIDATION_ERROR' });
    expect(await repositories.imports.list(DEFAULT_WORKSPACE_ID)).toHaveLength(1);
  });
});
