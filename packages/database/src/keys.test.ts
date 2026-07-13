import { describe, expect, it } from 'vitest';
import { accountGsiKeys, gsiPartitions, keys, paddedScore } from './index';

describe('single-table keys', () => {
  it('builds workspace, dashboard, and account keys', () => {
    expect(keys.workspace('ws_demo')).toEqual({ PK: 'WORKSPACE#ws_demo', SK: 'METADATA' });
    expect(keys.dashboard('ws_demo')).toEqual({ PK: 'WORKSPACE#ws_demo', SK: 'DASHBOARD' });
    expect(keys.account('ws_demo', 'acc_1')).toEqual({
      PK: 'WORKSPACE#ws_demo',
      SK: 'ACCOUNT#acc_1',
    });
  });

  it('builds a workspace-scoped, versioned score key', () => {
    expect(keys.accountScore('ws_demo', 'acc_1', 'rules-v1')).toEqual({
      PK: 'WORKSPACE#ws_demo',
      SK: 'ACCOUNTSCORE#acc_1#rules-v1',
    });
  });

  it('keeps import and import-error prefixes from colliding under begins_with', () => {
    const importSk = keys.import('ws_demo', 'imp_1').SK;
    const errorSk = keys.importError('ws_demo', 'imp_1', 7).SK;
    expect(importSk).toBe('IMPORT#imp_1');
    expect(errorSk).toBe('IMPORTERROR#imp_1#000007');
    expect(errorSk.startsWith(keys.importPrefix)).toBe(false);
    expect(errorSk.startsWith(keys.importErrorPrefix('imp_1'))).toBe(true);
  });

  it('keeps account and account-score prefixes from colliding under begins_with', () => {
    const scoreSk = keys.accountScore('ws_demo', 'acc_1', 'rules-v1').SK;
    expect(scoreSk.startsWith(keys.accountPrefix)).toBe(false);
  });

  it('builds an account/type/locale-scoped insight key', () => {
    expect(keys.insight('ws_demo', 'acc_1', 'EXPLANATION', 'en-CA')).toEqual({
      PK: 'WORKSPACE#ws_demo',
      SK: 'INSIGHT#acc_1#EXPLANATION#en-CA',
    });
  });
});

describe('paddedScore', () => {
  it('zero-pads and clamps to keep GSI sort keys ordered', () => {
    expect(paddedScore(7)).toBe('007');
    expect(paddedScore(88)).toBe('088');
    expect(paddedScore(100)).toBe('100');
    expect(paddedScore(150)).toBe('100');
    expect(paddedScore(-5)).toBe('000');
  });
});

describe('accountGsiKeys', () => {
  const base = {
    workspaceId: 'ws_demo',
    accountId: 'acc_1',
    scoreLevel: 'HIGH' as const,
    primaryCloud: 'AWS' as const,
    score: 88,
  };

  it('stamps score-level and cloud partitions sorted by padded score', () => {
    const gsi = accountGsiKeys({ ...base, importId: 'imp_1' });
    expect(gsi.GSI2PK).toBe(gsiPartitions.accountsByScoreLevel('ws_demo', 'HIGH'));
    expect(gsi.GSI3PK).toBe(gsiPartitions.accountsByCloud('ws_demo', 'AWS'));
    expect(gsi.GSI2SK).toBe('088#acc_1');
    expect(gsi.GSI1PK).toBe(gsiPartitions.accountsByImport('imp_1'));
  });

  it('omits the by-import GSI when the account has no import', () => {
    const gsi = accountGsiKeys(base);
    expect('GSI1PK' in gsi).toBe(false);
    expect(gsi.GSI2PK).toBeDefined();
  });
});
