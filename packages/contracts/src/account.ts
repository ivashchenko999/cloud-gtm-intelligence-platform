import { z } from './zod';
import { paginated, PaginationQuerySchema, SortOrderSchema } from './common';
import {
  CloudProviderSchema,
  MarketplaceActivitySchema,
  ScoreLevelSchema,
  ScoreVersionSchema,
} from './enums';

/** A single contribution to an account's purchase-intent score. */
export const ScoreFactorSchema = z
  .object({
    code: z.string(),
    label: z.string(),
    points: z.number(),
  })
  .openapi('ScoreFactor');
export type ScoreFactor = z.infer<typeof ScoreFactorSchema>;

/** The deterministic score attached to an account, as exposed over the API. */
export const AccountScoreSchema = z
  .object({
    score: z.number().min(0).max(100),
    level: ScoreLevelSchema,
    version: ScoreVersionSchema,
    factors: z.array(ScoreFactorSchema),
    scoredAt: z.string().datetime(),
  })
  .openapi('AccountScore');
export type AccountScore = z.infer<typeof AccountScoreSchema>;

/** Full account representation returned by `GET /accounts/{id}`. */
export const AccountResponseSchema = z
  .object({
    id: z.string(),
    name: z.string(),
    domain: z.string().optional(),
    industry: z.string().optional(),
    employeeCount: z.number().int().nonnegative().optional(),
    annualRevenue: z.number().nonnegative().optional(),
    primaryCloud: CloudProviderSchema,
    estimatedCloudSpend: z.number().nonnegative().optional(),
    existingProducts: z.array(z.string()).default([]),
    marketplaceActivity: MarketplaceActivitySchema.optional(),
    marketplaceTransactions: z.number().int().nonnegative().optional(),
    purchaseIntentScore: z.number().min(0).max(100),
    scoreLevel: ScoreLevelSchema,
    scoreVersion: ScoreVersionSchema,
    scoreFactors: z.array(ScoreFactorSchema),
    importId: z.string().optional(),
    createdAt: z.string().datetime(),
    updatedAt: z.string().datetime(),
  })
  .openapi('Account');
export type AccountResponse = z.infer<typeof AccountResponseSchema>;

/** Slim projection used for the accounts Data Grid rows and dashboard top lists. */
export const AccountSummarySchema = AccountResponseSchema.pick({
  id: true,
  name: true,
  domain: true,
  industry: true,
  employeeCount: true,
  primaryCloud: true,
  estimatedCloudSpend: true,
  marketplaceActivity: true,
  purchaseIntentScore: true,
  scoreLevel: true,
  updatedAt: true,
}).openapi('AccountSummary');
export type AccountSummary = z.infer<typeof AccountSummarySchema>;

/** Sortable columns for `GET /accounts`. */
export const AccountSortFieldSchema = z.enum([
  'name',
  'industry',
  'employeeCount',
  'estimatedCloudSpend',
  'purchaseIntentScore',
  'updatedAt',
]);
export type AccountSortField = z.infer<typeof AccountSortFieldSchema>;

/** Query params for `GET /accounts` — pagination + sorting + server-side filters. */
export const ListAccountsQuerySchema = PaginationQuerySchema.extend({
  sortBy: AccountSortFieldSchema.default('purchaseIntentScore'),
  sortOrder: SortOrderSchema.default('desc'),
  search: z.string().trim().min(1).optional(),
  scoreLevel: ScoreLevelSchema.optional(),
  cloudProvider: CloudProviderSchema.optional(),
  industry: z.string().trim().min(1).optional(),
  minScore: z.coerce.number().min(0).max(100).optional(),
  marketplaceActivity: MarketplaceActivitySchema.optional(),
  importId: z.string().optional(),
});
export type ListAccountsQuery = z.infer<typeof ListAccountsQuerySchema>;

export const ListAccountsResponseSchema =
  paginated(AccountSummarySchema).openapi('ListAccountsResponse');
export type ListAccountsResponse = z.infer<typeof ListAccountsResponseSchema>;
