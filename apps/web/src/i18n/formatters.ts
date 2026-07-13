import type { SupportedLocale } from '@cloud-gtm/contracts';

export function formatDate(value: string | Date, locale: SupportedLocale): string {
  return new Intl.DateTimeFormat(locale, {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  }).format(new Date(value));
}

export function formatCurrency(value: number, locale: SupportedLocale): string {
  return new Intl.NumberFormat(locale, {
    style: 'currency',
    currency: 'CAD',
    notation: 'compact',
    maximumFractionDigits: 1,
  }).format(value);
}

export function formatPercentage(value: number, locale: SupportedLocale): string {
  return new Intl.NumberFormat(locale, {
    style: 'percent',
    maximumFractionDigits: 0,
  }).format(value);
}

/** Locale-aware integer/decimal grouping for counts and scores. */
export function formatNumber(value: number, locale: SupportedLocale): string {
  return new Intl.NumberFormat(locale).format(value);
}

/**
 * Formats a millisecond duration as a localized, single-unit string — seconds
 * under a minute, otherwise minutes (e.g. `12.3 s` / `1.5 min`).
 */
export function formatDuration(ms: number, locale: SupportedLocale): string {
  const seconds = ms / 1000;
  const [value, unit] =
    seconds < 60 ? ([seconds, 'second'] as const) : ([seconds / 60, 'minute'] as const);
  return new Intl.NumberFormat(locale, {
    style: 'unit',
    unit,
    unitDisplay: 'short',
    maximumFractionDigits: 1,
  }).format(value);
}
