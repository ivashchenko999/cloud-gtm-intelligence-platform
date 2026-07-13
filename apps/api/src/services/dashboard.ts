import type {
  AccountResponse,
  CloudProvider,
  DashboardResponse,
  DistributionBucket,
  ImportResponse,
  ScoreLevel,
} from '@cloud-gtm/contracts';
import { toAccountSummary } from './account-query';

/**
 * Computes the dashboard payload directly from the workspace's accounts. This
 * keeps `GET /dashboard` correct before the M5 import pipeline precomputes and
 * stores a summary; the same aggregates can later be persisted unchanged.
 */

const TOP_ACCOUNTS_LIMIT = 10;
const INTENT_LEVELS: readonly ScoreLevel[] = ['HIGH', 'MEDIUM', 'LOW'];
const CLOUD_PROVIDERS: readonly CloudProvider[] = ['AWS', 'AZURE', 'GCP', 'MULTI_CLOUD', 'UNKNOWN'];

function roundTo(value: number, decimals: number): number {
  const factor = 10 ** decimals;
  return Math.round(value * factor) / factor;
}

function countBy<T extends string>(
  accounts: readonly AccountResponse[],
  order: readonly T[],
  key: (account: AccountResponse) => T,
): DistributionBucket[] {
  const counts = new Map<T, number>(order.map((value) => [value, 0]));
  for (const account of accounts) {
    const bucket = key(account);
    counts.set(bucket, (counts.get(bucket) ?? 0) + 1);
  }
  return order
    .map((value) => ({ key: value, count: counts.get(value) ?? 0 }))
    .filter((bucket) => bucket.count > 0);
}

/** Industry distribution: absent industries fold into `Unknown`, biggest first. */
function industryDistribution(accounts: readonly AccountResponse[]): DistributionBucket[] {
  const counts = new Map<string, number>();
  for (const account of accounts) {
    const industry = account.industry?.trim() || 'Unknown';
    counts.set(industry, (counts.get(industry) ?? 0) + 1);
  }
  return [...counts.entries()]
    .map(([key, count]) => ({ key, count }))
    .sort((a, b) => b.count - a.count || a.key.localeCompare(b.key));
}

export function computeDashboard(
  accounts: readonly AccountResponse[],
  latestImport: ImportResponse | null,
): DashboardResponse {
  const highIntent = accounts.filter((account) => account.scoreLevel === 'HIGH');
  const totalScore = accounts.reduce((sum, account) => sum + account.purchaseIntentScore, 0);

  // Pipeline value: cloud spend concentrated in high-intent accounts — the
  // marketplace opportunity worth acting on this quarter.
  const estimatedPipelineValue = highIntent.reduce(
    (sum, account) => sum + (account.estimatedCloudSpend ?? 0),
    0,
  );

  // Opportunities: high-intent accounts on each hyperscaler.
  const cloudOpportunities = {
    aws: highIntent.filter((account) => account.primaryCloud === 'AWS').length,
    azure: highIntent.filter((account) => account.primaryCloud === 'AZURE').length,
    gcp: highIntent.filter((account) => account.primaryCloud === 'GCP').length,
  };

  const topAccounts = [...accounts]
    .sort((a, b) => b.purchaseIntentScore - a.purchaseIntentScore || a.id.localeCompare(b.id))
    .slice(0, TOP_ACCOUNTS_LIMIT)
    .map(toAccountSummary);

  return {
    totalAccounts: accounts.length,
    highIntentAccounts: highIntent.length,
    averageIntentScore: accounts.length === 0 ? 0 : roundTo(totalScore / accounts.length, 1),
    estimatedPipelineValue,
    cloudOpportunities,
    intentDistribution: countBy(accounts, INTENT_LEVELS, (account) => account.scoreLevel),
    cloudDistribution: countBy(accounts, CLOUD_PROVIDERS, (account) => account.primaryCloud),
    industryDistribution: industryDistribution(accounts),
    topAccounts,
    latestImport,
  };
}
