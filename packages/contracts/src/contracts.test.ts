import { describe, expect, it } from 'vitest';
import { AccountResponseSchema, CloudProviderSchema, SupportedLocaleSchema } from './index';

describe('contracts', () => {
  it('accepts a valid account response', () => {
    const parsed = AccountResponseSchema.parse({
      id: 'acc_1',
      name: 'Acme Corp',
      primaryCloud: 'AWS',
      purchaseIntentScore: 88,
      scoreLevel: 'HIGH',
    });
    expect(parsed.name).toBe('Acme Corp');
  });

  it('rejects a score above 100', () => {
    const result = AccountResponseSchema.safeParse({
      id: 'acc_1',
      name: 'Acme Corp',
      primaryCloud: 'AWS',
      purchaseIntentScore: 120,
      scoreLevel: 'HIGH',
    });
    expect(result.success).toBe(false);
  });

  it('exposes stable enum values', () => {
    expect(CloudProviderSchema.options).toContain('AWS');
    expect(SupportedLocaleSchema.options).toEqual(['en-CA', 'fr-CA']);
  });
});
