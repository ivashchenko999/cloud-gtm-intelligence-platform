import { describe, expect, it } from 'vitest';
import { keys } from './index';

describe('single-table keys', () => {
  it('builds workspace and account keys', () => {
    expect(keys.workspace('ws_demo')).toEqual({ PK: 'WORKSPACE#ws_demo', SK: 'METADATA' });
    expect(keys.account('ws_demo', 'acc_1')).toEqual({
      PK: 'WORKSPACE#ws_demo',
      SK: 'ACCOUNT#acc_1',
    });
  });

  it('builds a versioned score key', () => {
    expect(keys.accountScore('acc_1', 'rules-v1')).toEqual({
      PK: 'ACCOUNT#acc_1',
      SK: 'SCORE#rules-v1',
    });
  });
});
