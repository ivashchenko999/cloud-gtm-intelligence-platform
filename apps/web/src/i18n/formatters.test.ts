import { describe, expect, it } from 'vitest';
import { formatCurrency, formatDate, formatPercentage } from './formatters';

describe('locale formatters', () => {
  it('formats dates per locale', () => {
    const date = '2026-07-12T18:00:00.000Z';
    expect(formatDate(date, 'en-CA')).toMatch(/Jul/);
    expect(formatDate(date, 'fr-CA')).toMatch(/juill/);
  });

  it('formats compact CAD currency', () => {
    expect(formatCurrency(3_200_000, 'en-CA')).toContain('3.2M');
  });

  it('formats a ratio as a whole-number percentage', () => {
    expect(formatPercentage(0.42, 'en-CA')).toBe('42%');
  });
});
