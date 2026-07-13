import { z } from './zod';

export const CloudProviderSchema = z
  .enum(['AWS', 'AZURE', 'GCP', 'MULTI_CLOUD', 'UNKNOWN'])
  .openapi('CloudProvider');
export type CloudProvider = z.infer<typeof CloudProviderSchema>;

export const ScoreLevelSchema = z.enum(['LOW', 'MEDIUM', 'HIGH']).openapi('ScoreLevel');
export type ScoreLevel = z.infer<typeof ScoreLevelSchema>;

export const MarketplaceActivitySchema = z
  .enum(['LOW', 'MEDIUM', 'HIGH'])
  .openapi('MarketplaceActivity');
export type MarketplaceActivity = z.infer<typeof MarketplaceActivitySchema>;

export const ImportStatusSchema = z
  .enum(['PENDING', 'UPLOADING', 'PROCESSING', 'COMPLETED', 'PARTIALLY_COMPLETED', 'FAILED'])
  .openapi('ImportStatus');
export type ImportStatus = z.infer<typeof ImportStatusSchema>;

/** Import statuses that will never change again; frontend polling can stop here. */
export const TERMINAL_IMPORT_STATUSES: readonly ImportStatus[] = [
  'COMPLETED',
  'PARTIALLY_COMPLETED',
  'FAILED',
];

export const SupportedLocaleSchema = z.enum(['en-CA', 'fr-CA']).openapi('SupportedLocale');
export type SupportedLocale = z.infer<typeof SupportedLocaleSchema>;

export const ScoreVersionSchema = z.enum(['rules-v1']).openapi('ScoreVersion');
export type ScoreVersion = z.infer<typeof ScoreVersionSchema>;

/** The three localized AI insight kinds delivered from the account drawer. */
export const InsightTypeSchema = z
  .enum(['EXPLANATION', 'NEXT_ACTION', 'OUTREACH'])
  .openapi('InsightType');
export type InsightType = z.infer<typeof InsightTypeSchema>;
