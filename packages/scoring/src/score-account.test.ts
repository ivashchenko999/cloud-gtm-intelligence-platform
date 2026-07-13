import { describe, expect, it } from 'vitest';
import {
  extractAccountFeatures,
  ruleBasedScoringProvider,
  scoreAccount,
  SCORE_VERSION,
  type AccountFeatures,
} from './index';

function codes(features: AccountFeatures): string[] {
  return scoreAccount(features).factors.map((factor) => factor.code);
}

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
    expect(result.score).toBe(100);
  });

  it('returns LOW with no qualifying factors', () => {
    const result = scoreAccount({ primaryCloud: 'UNKNOWN' });
    expect(result.score).toBe(0);
    expect(result.level).toBe('LOW');
    expect(result.factors).toHaveLength(0);
  });

  it('tags SCORE_VERSION as rules-v1', () => {
    expect(SCORE_VERSION).toBe('rules-v1');
    expect(ruleBasedScoringProvider.version).toBe('rules-v1');
  });
});

describe('rules-v1 factors', () => {
  it.each([
    ['HIGH_MARKETPLACE_ACTIVITY', { marketplaceActivity: 'HIGH' } as const, 30],
    ['HIGH_CLOUD_SPEND', { estimatedCloudSpend: 250_001 } as const, 25],
    ['ENTERPRISE_SIZE', { employeeCount: 1001 } as const, 15],
    ['CLOUD_NATIVE_PRODUCTS', { usesCloudNativeProducts: true } as const, 10],
    ['PRIOR_MARKETPLACE_TX', { marketplaceTransactions: 1 } as const, 10],
  ])('awards %s in isolation', (code, extra, points) => {
    // primaryCloud UNKNOWN so the KNOWN_CLOUD factor never fires here.
    const result = scoreAccount({ primaryCloud: 'UNKNOWN', ...extra });
    expect(result.factors.map((f) => f.code)).toEqual([code]);
    expect(result.score).toBe(points);
  });

  it('awards KNOWN_CLOUD only for a known provider', () => {
    expect(codes({ primaryCloud: 'AZURE' })).toEqual(['KNOWN_CLOUD']);
    expect(codes({ primaryCloud: 'UNKNOWN' })).toEqual([]);
  });

  it('does not fire threshold rules exactly at the boundary', () => {
    expect(codes({ primaryCloud: 'UNKNOWN', estimatedCloudSpend: 250_000 })).toEqual([]);
    expect(codes({ primaryCloud: 'UNKNOWN', employeeCount: 1000 })).toEqual([]);
    expect(codes({ primaryCloud: 'UNKNOWN', marketplaceTransactions: 0 })).toEqual([]);
  });

  it('treats missing optional fields as absent signals', () => {
    const result = scoreAccount({ primaryCloud: 'GCP' });
    expect(result.score).toBe(10);
    expect(result.level).toBe('LOW');
  });
});

describe('level bands', () => {
  it('applies band thresholds at 40 and 70', () => {
    // 25 → LOW
    expect(scoreAccount({ primaryCloud: 'AWS', employeeCount: 1001 }).level).toBe('LOW');
    // 45 → MEDIUM (10 known cloud + 25 spend + 10 tx)
    expect(
      scoreAccount({
        primaryCloud: 'AWS',
        estimatedCloudSpend: 250_001,
        marketplaceTransactions: 1,
      }).level,
    ).toBe('MEDIUM');
    // 65 → MEDIUM (10 + 30 + 25); 75 → HIGH once cloud-native is added
    expect(
      scoreAccount({
        primaryCloud: 'AWS',
        marketplaceActivity: 'HIGH',
        estimatedCloudSpend: 250_001,
      }).level,
    ).toBe('MEDIUM');
    expect(
      scoreAccount({
        primaryCloud: 'AWS',
        marketplaceActivity: 'HIGH',
        estimatedCloudSpend: 250_001,
        usesCloudNativeProducts: true,
      }).level,
    ).toBe('HIGH');
  });
});

describe('extractAccountFeatures', () => {
  it('derives cloud-native usage from existing products', () => {
    expect(extractAccountFeatures({ primaryCloud: 'AWS', existingProducts: ['s3'] })).toMatchObject(
      {
        primaryCloud: 'AWS',
        usesCloudNativeProducts: true,
      },
    );
    expect(extractAccountFeatures({ primaryCloud: 'AWS', existingProducts: [] })).toMatchObject({
      usesCloudNativeProducts: false,
    });
  });

  it('omits undefined optional fields rather than setting them to undefined', () => {
    const features = extractAccountFeatures({ primaryCloud: 'AWS' });
    expect('employeeCount' in features).toBe(false);
    expect('estimatedCloudSpend' in features).toBe(false);
  });

  it('feeds the scoring engine end to end', () => {
    const features = extractAccountFeatures({
      primaryCloud: 'AWS',
      employeeCount: 3000,
      estimatedCloudSpend: 500_000,
      marketplaceActivity: 'HIGH',
      existingProducts: ['lambda', 'dynamodb'],
      marketplaceTransactions: 5,
    });
    expect(scoreAccount(features).score).toBe(100);
  });
});
