import { z } from './zod';
import { InsightTypeSchema, SupportedLocaleSchema } from './enums';

/** Request body shared by the three insight endpoints — just the target locale. */
export const InsightRequestSchema = z
  .object({
    locale: SupportedLocaleSchema,
  })
  .openapi('InsightRequest');
export type InsightRequest = z.infer<typeof InsightRequestSchema>;

/** `POST /accounts/{id}/insights/explanation` — why the account scored as it did. */
export const ExplanationInsightSchema = z
  .object({
    type: z.literal('EXPLANATION'),
    summary: z.string(),
    reasons: z.array(z.string()),
    confidenceNote: z.string(),
  })
  .openapi('ExplanationInsight');
export type ExplanationInsight = z.infer<typeof ExplanationInsightSchema>;

/** `POST /accounts/{id}/insights/next-action` — the recommended next play. */
export const NextActionInsightSchema = z
  .object({
    type: z.literal('NEXT_ACTION'),
    action: z.string(),
    channel: z.string(),
    persona: z.string(),
    talkingPoints: z.array(z.string()),
  })
  .openapi('NextActionInsight');
export type NextActionInsight = z.infer<typeof NextActionInsightSchema>;

/** `POST /accounts/{id}/insights/outreach` — a drafted outreach message. */
export const OutreachInsightSchema = z
  .object({
    type: z.literal('OUTREACH'),
    subject: z.string(),
    body: z.string(),
  })
  .openapi('OutreachInsight');
export type OutreachInsight = z.infer<typeof OutreachInsightSchema>;

/** Discriminated union of the three insight payload shapes. */
export const InsightContentSchema = z
  .discriminatedUnion('type', [
    ExplanationInsightSchema,
    NextActionInsightSchema,
    OutreachInsightSchema,
  ])
  .openapi('InsightContent');
export type InsightContent = z.infer<typeof InsightContentSchema>;

/** The persisted/returned insight envelope wrapping any insight content. */
export const AIInsightSchema = z
  .object({
    id: z.string(),
    accountId: z.string(),
    type: InsightTypeSchema,
    locale: SupportedLocaleSchema,
    content: InsightContentSchema,
    model: z.string().optional(),
    cached: z.boolean().default(false),
    createdAt: z.string().datetime(),
  })
  .openapi('AIInsight');
export type AIInsight = z.infer<typeof AIInsightSchema>;
