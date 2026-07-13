import { z } from './zod';
import { AccountSummarySchema } from './account';
import { ImportResponseSchema } from './import';

/** A labelled count in a distribution chart (intent, cloud, or industry). */
export const DistributionBucketSchema = z
  .object({
    key: z.string(),
    count: z.number().int().nonnegative(),
  })
  .openapi('DistributionBucket');
export type DistributionBucket = z.infer<typeof DistributionBucketSchema>;

/** Marketplace opportunity counts split by cloud provider for the KPI row. */
export const CloudOpportunitiesSchema = z
  .object({
    aws: z.number().int().nonnegative(),
    azure: z.number().int().nonnegative(),
    gcp: z.number().int().nonnegative(),
  })
  .openapi('CloudOpportunities');
export type CloudOpportunities = z.infer<typeof CloudOpportunitiesSchema>;

/** `GET /dashboard` — everything the dashboard page renders in one payload. */
export const DashboardResponseSchema = z
  .object({
    totalAccounts: z.number().int().nonnegative(),
    highIntentAccounts: z.number().int().nonnegative(),
    averageIntentScore: z.number().min(0).max(100),
    estimatedPipelineValue: z.number().nonnegative(),
    cloudOpportunities: CloudOpportunitiesSchema,
    intentDistribution: z.array(DistributionBucketSchema),
    cloudDistribution: z.array(DistributionBucketSchema),
    industryDistribution: z.array(DistributionBucketSchema),
    topAccounts: z.array(AccountSummarySchema),
    latestImport: ImportResponseSchema.nullable(),
  })
  .openapi('DashboardResponse');
export type DashboardResponse = z.infer<typeof DashboardResponseSchema>;
