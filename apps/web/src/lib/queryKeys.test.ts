import { describe, expect, it } from 'vitest';
import { queryKeys } from './queryKeys';

describe('queryKeys factory', () => {
  it('builds stable keys for top-level resources', () => {
    expect(queryKeys.dashboard()).toEqual(['dashboard']);
    expect(queryKeys.accounts.all()).toEqual(['accounts']);
    expect(queryKeys.imports.list()).toEqual(['imports', 'list']);
  });

  it('scopes detail keys under their resource', () => {
    expect(queryKeys.accounts.detail('acc-1')).toEqual(['accounts', 'detail', 'acc-1']);
    expect(queryKeys.imports.detail('imp-1')).toEqual(['imports', 'detail', 'imp-1']);
    expect(queryKeys.insights.detail('acc-1', 'explanation')).toEqual([
      'insights',
      'acc-1',
      'explanation',
    ]);
  });

  it('includes list params so distinct queries do not collide', () => {
    expect(queryKeys.accounts.list({ scoreLevel: 'HIGH', page: 2 })).toEqual([
      'accounts',
      'list',
      { scoreLevel: 'HIGH', page: 2 },
    ]);
    expect(queryKeys.accounts.list()).toEqual(['accounts', 'list', {}]);
  });
});
