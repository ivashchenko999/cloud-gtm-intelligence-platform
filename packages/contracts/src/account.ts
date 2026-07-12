import { z } from 'zod';
import { CloudProviderSchema, MarketplaceActivitySchema, ScoreLevelSchema } from './enums';

export const ScoreFactorSchema = z.object({
  code: z.string(),
  label: z.string(),
  points: z.number(),
});
export type ScoreFactor = z.infer<typeof ScoreFactorSchema>;

export const AccountResponseSchema = z.object({
  id: z.string(),
  name: z.string(),
  domain: z.string().optional(),
  industry: z.string().optional(),
  employeeCount: z.number().optional(),
  primaryCloud: CloudProviderSchema,
  estimatedCloudSpend: z.number().optional(),
  marketplaceActivity: MarketplaceActivitySchema.optional(),
  purchaseIntentScore: z.number().min(0).max(100),
  scoreLevel: ScoreLevelSchema,
});
export type AccountResponse = z.infer<typeof AccountResponseSchema>;
