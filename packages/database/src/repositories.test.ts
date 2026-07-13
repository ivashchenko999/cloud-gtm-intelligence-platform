import { beforeEach, describe, expect, it } from 'vitest';
import type { CloudProvider, ScoreLevel } from '@cloud-gtm/contracts';
import type { Account } from './entities';
import { InMemoryTableGateway } from './gateway';
import { createRepositories, type Repositories } from './repositories';

const WS = 'ws_demo';

function makeAccount(overrides: Partial<Account> & { id: string }): Account {
  const score = overrides.purchaseIntentScore ?? 50;
  const level: ScoreLevel = score >= 70 ? 'HIGH' : score >= 40 ? 'MEDIUM' : 'LOW';
  const cloud: CloudProvider = overrides.primaryCloud ?? 'AWS';
  return {
    workspaceId: WS,
    name: overrides.id.toUpperCase(),
    primaryCloud: cloud,
    existingProducts: [],
    purchaseIntentScore: score,
    scoreLevel: level,
    scoreVersion: 'rules-v1',
    scoreFactors: [],
    createdAt: '2026-07-12T00:00:00.000Z',
    updatedAt: '2026-07-12T00:00:00.000Z',
    ...overrides,
  };
}

describe('repositories against an in-memory table', () => {
  let repos: Repositories;

  beforeEach(() => {
    repos = createRepositories(new InMemoryTableGateway());
  });

  it('gets a workspace it saved', async () => {
    await repos.workspaces.save({
      id: WS,
      name: 'Demo Vendor',
      createdAt: '2026-07-12T00:00:00.000Z',
    });
    const workspace = await repos.workspaces.get(WS);
    expect(workspace?.name).toBe('Demo Vendor');
    expect(await repos.workspaces.get('missing')).toBeUndefined();
  });

  it('lists imports without picking up import-error items', async () => {
    await repos.imports.save({
      id: 'imp_1',
      workspaceId: WS,
      filename: 'a.csv',
      status: 'PROCESSING',
      uploadedBy: 'u',
      uploadedAt: '2026-07-12T00:00:00.000Z',
      totalRows: 0,
      successfulRows: 0,
      failedRows: 0,
    });
    await repos.imports.addErrors(WS, [
      { importId: 'imp_1', rowNumber: 1, message: 'bad' },
      { importId: 'imp_1', rowNumber: 2, message: 'bad' },
    ]);

    const imports = await repos.imports.list(WS);
    expect(imports).toHaveLength(1);
    expect(imports[0]?.id).toBe('imp_1');

    const errors = await repos.imports.listErrors(WS, 'imp_1');
    expect(errors).toHaveLength(2);
    expect(errors.map((e) => e.rowNumber)).toEqual([1, 2]);
  });

  it('lists accounts without picking up score items', async () => {
    await repos.accounts.save(makeAccount({ id: 'acc_1' }));
    await repos.accounts.saveScore({
      accountId: 'acc_1',
      workspaceId: WS,
      score: 50,
      level: 'MEDIUM',
      version: 'rules-v1',
      factors: [],
      scoredAt: '2026-07-12T00:00:00.000Z',
    });

    const accounts = await repos.accounts.list(WS);
    expect(accounts).toHaveLength(1);
    expect(accounts[0]?.id).toBe('acc_1');

    const score = await repos.accounts.getScore(WS, 'acc_1', 'rules-v1');
    expect(score?.score).toBe(50);
  });

  it('returns high-intent accounts highest-score-first via GSI2', async () => {
    await repos.accounts.saveMany([
      makeAccount({ id: 'low', purchaseIntentScore: 20 }),
      makeAccount({ id: 'high_a', purchaseIntentScore: 75 }),
      makeAccount({ id: 'high_b', purchaseIntentScore: 95 }),
    ]);

    const highIntent = await repos.accounts.listHighIntent(WS);
    expect(highIntent.map((a) => a.id)).toEqual(['high_b', 'high_a']);

    const top = await repos.accounts.listHighIntent(WS, 1);
    expect(top.map((a) => a.id)).toEqual(['high_b']);
  });

  it('lists accounts by import via GSI1', async () => {
    await repos.accounts.saveMany([
      makeAccount({ id: 'acc_1', importId: 'imp_1' }),
      makeAccount({ id: 'acc_2', importId: 'imp_1' }),
      makeAccount({ id: 'acc_3', importId: 'imp_2' }),
    ]);

    const fromImport1 = await repos.accounts.listByImport('imp_1');
    expect(fromImport1.map((a) => a.id).sort()).toEqual(['acc_1', 'acc_2']);
  });

  it('lists accounts by cloud provider via GSI3, highest-score-first', async () => {
    await repos.accounts.saveMany([
      makeAccount({ id: 'aws_lo', primaryCloud: 'AWS', purchaseIntentScore: 30 }),
      makeAccount({ id: 'aws_hi', primaryCloud: 'AWS', purchaseIntentScore: 90 }),
      makeAccount({ id: 'gcp', primaryCloud: 'GCP', purchaseIntentScore: 80 }),
    ]);

    const aws = await repos.accounts.listByCloud(WS, 'AWS');
    expect(aws.map((a) => a.id)).toEqual(['aws_hi', 'aws_lo']);
  });

  it('lists AI insights by account', async () => {
    await repos.insights.save({
      id: 'ins_1',
      accountId: 'acc_1',
      workspaceId: WS,
      type: 'EXPLANATION',
      locale: 'en-CA',
      content: { type: 'EXPLANATION', summary: 's', reasons: [], confidenceNote: 'n' },
      cached: false,
      createdAt: '2026-07-12T00:00:00.000Z',
    });
    await repos.insights.save({
      id: 'ins_2',
      accountId: 'acc_2',
      workspaceId: WS,
      type: 'EXPLANATION',
      locale: 'en-CA',
      content: { type: 'EXPLANATION', summary: 's', reasons: [], confidenceNote: 'n' },
      cached: false,
      createdAt: '2026-07-12T00:00:00.000Z',
    });

    const insights = await repos.insights.listByAccount(WS, 'acc_1');
    expect(insights).toHaveLength(1);
    expect(insights[0]?.accountId).toBe('acc_1');
  });

  it('never leaks storage attributes out of a repository', async () => {
    await repos.accounts.save(makeAccount({ id: 'acc_1', importId: 'imp_1' }));
    const [account] = await repos.accounts.list(WS);
    expect(account && 'PK' in account).toBe(false);
    expect(account && 'GSI2PK' in account).toBe(false);
    expect(account && 'entityType' in account).toBe(false);
  });
});
