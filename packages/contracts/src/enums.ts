import { z } from 'zod';

export const CloudProviderSchema = z.enum(['AWS', 'AZURE', 'GCP', 'MULTI_CLOUD', 'UNKNOWN']);
export type CloudProvider = z.infer<typeof CloudProviderSchema>;

export const ScoreLevelSchema = z.enum(['LOW', 'MEDIUM', 'HIGH']);
export type ScoreLevel = z.infer<typeof ScoreLevelSchema>;

export const MarketplaceActivitySchema = z.enum(['LOW', 'MEDIUM', 'HIGH']);
export type MarketplaceActivity = z.infer<typeof MarketplaceActivitySchema>;

export const ImportStatusSchema = z.enum([
  'PENDING',
  'UPLOADING',
  'PROCESSING',
  'COMPLETED',
  'PARTIALLY_COMPLETED',
  'FAILED',
]);
export type ImportStatus = z.infer<typeof ImportStatusSchema>;

export const SupportedLocaleSchema = z.enum(['en-CA', 'fr-CA']);
export type SupportedLocale = z.infer<typeof SupportedLocaleSchema>;

export const ScoreVersionSchema = z.enum(['rules-v1']);
export type ScoreVersion = z.infer<typeof ScoreVersionSchema>;
