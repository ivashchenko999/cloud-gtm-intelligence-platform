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
