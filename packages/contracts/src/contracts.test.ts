import { describe, expect, it } from 'vitest';
import {
  AccountResponseSchema,
  CloudProviderSchema,
  CreateImportRequestSchema,
  ErrorResponseSchema,
  InsightContentSchema,
  ListAccountsQuerySchema,
  MAX_IMPORT_BYTES,
  SupportedLocaleSchema,
} from './index';

const validAccount = {
  id: 'acc_1',
  name: 'Acme Corp',
  primaryCloud: 'AWS',
  existingProducts: ['s3'],
  purchaseIntentScore: 88,
  scoreLevel: 'HIGH',
  scoreVersion: 'rules-v1',
  scoreFactors: [
    { code: 'HIGH_MARKETPLACE_ACTIVITY', label: 'High marketplace activity', points: 30 },
  ],
  createdAt: '2026-07-12T00:00:00.000Z',
  updatedAt: '2026-07-12T00:00:00.000Z',
};

describe('enums', () => {
  it('exposes stable, untranslated enum values', () => {
    expect(CloudProviderSchema.options).toContain('AWS');
    expect(SupportedLocaleSchema.options).toEqual(['en-CA', 'fr-CA']);
  });
});

describe('AccountResponseSchema', () => {
  it('accepts a valid account and defaults existingProducts', () => {
    const { existingProducts, ...withoutProducts } = validAccount;
    void existingProducts;
    const parsed = AccountResponseSchema.parse(withoutProducts);
    expect(parsed.name).toBe('Acme Corp');
    expect(parsed.existingProducts).toEqual([]);
  });

  it('rejects a score above 100', () => {
    const result = AccountResponseSchema.safeParse({ ...validAccount, purchaseIntentScore: 120 });
    expect(result.success).toBe(false);
  });

  it('rejects a missing required score version', () => {
    const { scoreVersion, ...rest } = validAccount;
    void scoreVersion;
    expect(AccountResponseSchema.safeParse(rest).success).toBe(false);
  });
});

describe('ListAccountsQuerySchema', () => {
  it('coerces query strings and applies defaults', () => {
    const parsed = ListAccountsQuerySchema.parse({ page: '2', pageSize: '50', minScore: '40' });
    expect(parsed).toMatchObject({
      page: 2,
      pageSize: 50,
      minScore: 40,
      sortBy: 'purchaseIntentScore',
      sortOrder: 'desc',
    });
  });

  it('rejects a page size over the maximum', () => {
    expect(ListAccountsQuerySchema.safeParse({ pageSize: '1000' }).success).toBe(false);
  });
});

describe('CreateImportRequestSchema', () => {
  it('accepts a csv upload within the size limit', () => {
    const parsed = CreateImportRequestSchema.parse({
      filename: 'crm.csv',
      contentType: 'text/csv',
      sizeBytes: 1024,
    });
    expect(parsed.filename).toBe('crm.csv');
  });

  it('rejects a file over the size limit', () => {
    const result = CreateImportRequestSchema.safeParse({
      filename: 'crm.csv',
      contentType: 'text/csv',
      sizeBytes: MAX_IMPORT_BYTES + 1,
    });
    expect(result.success).toBe(false);
  });

  it('rejects a non-csv content type', () => {
    const result = CreateImportRequestSchema.safeParse({
      filename: 'notes.pdf',
      contentType: 'application/pdf',
      sizeBytes: 1024,
    });
    expect(result.success).toBe(false);
  });
});

describe('InsightContentSchema', () => {
  it('discriminates insight payloads by type', () => {
    const parsed = InsightContentSchema.parse({
      type: 'NEXT_ACTION',
      action: 'Book a call',
      channel: 'email',
      persona: 'Platform lead',
      talkingPoints: ['Marketplace fit'],
    });
    expect(parsed.type).toBe('NEXT_ACTION');
  });

  it('rejects a payload whose fields do not match its type', () => {
    const result = InsightContentSchema.safeParse({ type: 'OUTREACH', action: 'nope' });
    expect(result.success).toBe(false);
  });
});

describe('ErrorResponseSchema', () => {
  it('accepts the standard error envelope', () => {
    const parsed = ErrorResponseSchema.parse({
      code: 'VALIDATION_ERROR',
      message: 'Invalid request',
      details: [{ path: 'sizeBytes', message: 'too large' }],
    });
    expect(parsed.code).toBe('VALIDATION_ERROR');
  });

  it('rejects an unknown error code', () => {
    expect(ErrorResponseSchema.safeParse({ code: 'BOOM', message: 'x' }).success).toBe(false);
  });
});
