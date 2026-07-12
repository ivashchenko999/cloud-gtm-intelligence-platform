import { MarketplaceActivitySchema, type MarketplaceActivity } from '@cloud-gtm/contracts';

/**
 * Normalizes a raw marketplace-activity string from a CRM export into the
 * canonical enum. Full CSV parsing/validation lands in the M5 import pipeline.
 */
export function normalizeMarketplaceActivity(
  raw: string | undefined,
): MarketplaceActivity | undefined {
  if (!raw) return undefined;
  const candidate = raw.trim().toUpperCase();
  const result = MarketplaceActivitySchema.safeParse(candidate);
  return result.success ? result.data : undefined;
}

/** Removes leading characters that spreadsheet apps interpret as formulas. */
export function stripFormulaPrefix(value: string): string {
  return value.replace(/^[=+\-@\t\r]+/, '').trim();
}
