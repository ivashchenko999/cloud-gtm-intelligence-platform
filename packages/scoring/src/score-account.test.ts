import { describe, expect, it } from 'vitest';
import { scoreAccount, SCORE_VERSION } from './index';

describe('scoreAccount', () => {
  it('scores a high-intent enterprise AWS account', () => {
    const result = scoreAccount({
      primaryCloud: 'AWS',
      employeeCount: 2500,
      estimatedCloudSpend: 450_000,
      marketplaceActivity: 'HIGH',
      usesCloudNativeProducts: true,
      marketplaceTransactions: 3,
    });
    expect(result.score).toBe(100);
    expect(result.level).toBe('HIGH');
    expect(result.version).toBe(SCORE_VERSION);
  });

  it('caps the score at 100', () => {
    const result = scoreAccount({
      primaryCloud: 'AWS',
      employeeCount: 100_000,
      estimatedCloudSpend: 10_000_000,
      marketplaceActivity: 'HIGH',
      usesCloudNativeProducts: true,
      marketplaceTransactions: 99,
    });
    expect(result.score).toBeLessThanOrEqual(100);
  });

  it('returns LOW with no qualifying factors', () => {
    const result = scoreAccount({ primaryCloud: 'UNKNOWN' });
    expect(result.score).toBe(0);
    expect(result.level).toBe('LOW');
    expect(result.factors).toHaveLength(0);
  });

  it('awards the known-cloud factor only for a known provider', () => {
    expect(scoreAccount({ primaryCloud: 'AZURE' }).score).toBe(10);
    expect(scoreAccount({ primaryCloud: 'UNKNOWN' }).score).toBe(0);
  });
});
