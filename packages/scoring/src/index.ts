import type {
  CloudProvider,
  MarketplaceActivity,
  ScoreFactor,
  ScoreLevel,
  ScoreVersion,
} from '@cloud-gtm/contracts';

export const SCORE_VERSION: ScoreVersion = 'rules-v1';

export interface AccountFeatures {
  primaryCloud: CloudProvider;
  employeeCount?: number;
  estimatedCloudSpend?: number;
  marketplaceActivity?: MarketplaceActivity;
  usesCloudNativeProducts?: boolean;
  marketplaceTransactions?: number;
}

export interface AccountScore {
  score: number;
  level: ScoreLevel;
  version: ScoreVersion;
  factors: ScoreFactor[];
}

const CLOUD_SPEND_THRESHOLD = 250_000;
const ENTERPRISE_EMPLOYEE_THRESHOLD = 1_000;

function toLevel(score: number): ScoreLevel {
  if (score >= 70) return 'HIGH';
  if (score >= 40) return 'MEDIUM';
  return 'LOW';
}

/**
 * Deterministic, versioned rule-based scoring. Intentionally kept free of AWS
 * and AI dependencies so it stays predictable and testable.
 */
export function scoreAccount(features: AccountFeatures): AccountScore {
  const factors: ScoreFactor[] = [];

  if (features.marketplaceActivity === 'HIGH') {
    factors.push({
      code: 'HIGH_MARKETPLACE_ACTIVITY',
      label: 'High marketplace activity',
      points: 30,
    });
  }
  if ((features.estimatedCloudSpend ?? 0) > CLOUD_SPEND_THRESHOLD) {
    factors.push({
      code: 'HIGH_CLOUD_SPEND',
      label: 'Estimated cloud spend above threshold',
      points: 25,
    });
  }
  if ((features.employeeCount ?? 0) > ENTERPRISE_EMPLOYEE_THRESHOLD) {
    factors.push({ code: 'ENTERPRISE_SIZE', label: 'Enterprise account size', points: 15 });
  }
  if (features.primaryCloud !== 'UNKNOWN') {
    factors.push({ code: 'KNOWN_CLOUD', label: 'Primary cloud is known', points: 10 });
  }
  if (features.usesCloudNativeProducts) {
    factors.push({
      code: 'CLOUD_NATIVE_PRODUCTS',
      label: 'Uses cloud-native products',
      points: 10,
    });
  }
  if ((features.marketplaceTransactions ?? 0) > 0) {
    factors.push({
      code: 'PRIOR_MARKETPLACE_TX',
      label: 'Previous marketplace transactions',
      points: 10,
    });
  }

  const rawScore = factors.reduce((sum, factor) => sum + factor.points, 0);
  const score = Math.min(100, rawScore);

  return { score, level: toLevel(score), version: SCORE_VERSION, factors };
}
