import type {
  CloudProvider,
  MarketplaceActivity,
  ScoreFactor,
  ScoreLevel,
  ScoreVersion,
} from '@cloud-gtm/contracts';

export const SCORE_VERSION: ScoreVersion = 'rules-v1';

const CLOUD_SPEND_THRESHOLD = 250_000;
const ENTERPRISE_EMPLOYEE_THRESHOLD = 1_000;
const HIGH_LEVEL_THRESHOLD = 70;
const MEDIUM_LEVEL_THRESHOLD = 40;
const MAX_SCORE = 100;

/**
 * Normalized signals the engine scores on. Deliberately independent of the CSV
 * shape, the DynamoDB item, and the API DTO so scoring stays a pure function.
 */
export interface AccountFeatures {
  primaryCloud: CloudProvider;
  employeeCount?: number;
  estimatedCloudSpend?: number;
  marketplaceActivity?: MarketplaceActivity;
  usesCloudNativeProducts?: boolean;
  marketplaceTransactions?: number;
}

/** The reproducible output of scoring an account. */
export interface AccountScore {
  score: number;
  level: ScoreLevel;
  version: ScoreVersion;
  factors: ScoreFactor[];
}

/**
 * A scoring rule: if `applies`, its `factor` is added to the account's score.
 * Keeping rules as data makes the model auditable and easy to version.
 */
interface ScoringRule {
  factor: ScoreFactor;
  applies: (features: AccountFeatures) => boolean;
}

/**
 * rules-v1 — the deterministic weighting for purchase-intent. Order is the
 * order factors appear in the breakdown; it does not affect the total.
 */
const RULES_V1: readonly ScoringRule[] = [
  {
    factor: { code: 'HIGH_MARKETPLACE_ACTIVITY', label: 'High marketplace activity', points: 30 },
    applies: (f) => f.marketplaceActivity === 'HIGH',
  },
  {
    factor: {
      code: 'HIGH_CLOUD_SPEND',
      label: 'Estimated cloud spend above threshold',
      points: 25,
    },
    applies: (f) => (f.estimatedCloudSpend ?? 0) > CLOUD_SPEND_THRESHOLD,
  },
  {
    factor: { code: 'ENTERPRISE_SIZE', label: 'Enterprise account size', points: 15 },
    applies: (f) => (f.employeeCount ?? 0) > ENTERPRISE_EMPLOYEE_THRESHOLD,
  },
  {
    factor: { code: 'KNOWN_CLOUD', label: 'Primary cloud is known', points: 10 },
    applies: (f) => f.primaryCloud !== 'UNKNOWN',
  },
  {
    factor: { code: 'CLOUD_NATIVE_PRODUCTS', label: 'Uses cloud-native products', points: 10 },
    applies: (f) => f.usesCloudNativeProducts === true,
  },
  {
    factor: {
      code: 'PRIOR_MARKETPLACE_TX',
      label: 'Previous marketplace transactions',
      points: 10,
    },
    applies: (f) => (f.marketplaceTransactions ?? 0) > 0,
  },
];

function toLevel(score: number): ScoreLevel {
  if (score >= HIGH_LEVEL_THRESHOLD) return 'HIGH';
  if (score >= MEDIUM_LEVEL_THRESHOLD) return 'MEDIUM';
  return 'LOW';
}

/**
 * Scores an account against a versioned rule set. Swapping the interface later
 * (e.g. for an ML model) keeps callers and the API contract unchanged, while AI
 * never participates in computing the number.
 */
export interface ScoringProvider {
  readonly version: ScoreVersion;
  score(features: AccountFeatures): AccountScore;
}

class RuleBasedScoringProvider implements ScoringProvider {
  constructor(
    readonly version: ScoreVersion,
    private readonly rules: readonly ScoringRule[],
  ) {}

  score(features: AccountFeatures): AccountScore {
    const factors = this.rules.filter((rule) => rule.applies(features)).map((rule) => rule.factor);
    const rawScore = factors.reduce((sum, factor) => sum + factor.points, 0);
    const score = Math.min(MAX_SCORE, rawScore);

    return { score, level: toLevel(score), version: this.version, factors };
  }
}

/** The default deterministic provider used across the platform. */
export const ruleBasedScoringProvider: ScoringProvider = new RuleBasedScoringProvider(
  SCORE_VERSION,
  RULES_V1,
);

/**
 * Convenience wrapper over {@link ruleBasedScoringProvider}. Deterministic,
 * versioned, and free of AWS and AI dependencies so it stays predictable.
 */
export function scoreAccount(features: AccountFeatures): AccountScore {
  return ruleBasedScoringProvider.score(features);
}

/** Fields, from a normalized account, that scoring derives its features from. */
export interface ScorableAccount {
  primaryCloud: CloudProvider;
  employeeCount?: number;
  estimatedCloudSpend?: number;
  marketplaceActivity?: MarketplaceActivity;
  existingProducts?: string[];
  marketplaceTransactions?: number;
}

/**
 * Extracts {@link AccountFeatures} from a normalized account. Presence of any
 * existing product is treated as a cloud-native-product signal. Undefined
 * inputs are omitted so optional feature fields stay truly absent.
 */
export function extractAccountFeatures(account: ScorableAccount): AccountFeatures {
  return {
    primaryCloud: account.primaryCloud,
    usesCloudNativeProducts: (account.existingProducts?.length ?? 0) > 0,
    ...(account.employeeCount !== undefined && { employeeCount: account.employeeCount }),
    ...(account.estimatedCloudSpend !== undefined && {
      estimatedCloudSpend: account.estimatedCloudSpend,
    }),
    ...(account.marketplaceActivity !== undefined && {
      marketplaceActivity: account.marketplaceActivity,
    }),
    ...(account.marketplaceTransactions !== undefined && {
      marketplaceTransactions: account.marketplaceTransactions,
    }),
  };
}
