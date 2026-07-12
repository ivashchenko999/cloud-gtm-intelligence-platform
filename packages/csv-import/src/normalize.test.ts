import { describe, expect, it } from 'vitest';
import { normalizeMarketplaceActivity, stripFormulaPrefix } from './index';

describe('csv-import normalization', () => {
  it('normalizes marketplace activity case-insensitively', () => {
    expect(normalizeMarketplaceActivity(' high ')).toBe('HIGH');
    expect(normalizeMarketplaceActivity('medium')).toBe('MEDIUM');
  });

  it('returns undefined for unknown values', () => {
    expect(normalizeMarketplaceActivity('sometimes')).toBeUndefined();
    expect(normalizeMarketplaceActivity(undefined)).toBeUndefined();
  });

  it('strips dangerous formula prefixes', () => {
    expect(stripFormulaPrefix('=1+2')).toBe('1+2');
    expect(stripFormulaPrefix('Acme Corp')).toBe('Acme Corp');
  });
});
