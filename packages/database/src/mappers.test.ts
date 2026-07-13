import { describe, expect, it } from 'vitest';
import { STORAGE_ATTRIBUTES, type Account, type ImportJob, type ImportRowError } from './entities';
import {
  toAccountDto,
  toAccountItem,
  toDomain,
  toImportDetailDto,
  toImportErrorItem,
  toImportItem,
} from './mappers';

const account: Account = {
  id: 'acc_1',
  workspaceId: 'ws_demo',
  name: 'Acme Corp',
  primaryCloud: 'AWS',
  existingProducts: ['s3'],
  purchaseIntentScore: 88,
  scoreLevel: 'HIGH',
  scoreVersion: 'rules-v1',
  scoreFactors: [{ code: 'KNOWN_CLOUD', label: 'Primary cloud is known', points: 10 }],
  importId: 'imp_1',
  createdAt: '2026-07-12T00:00:00.000Z',
  updatedAt: '2026-07-12T00:00:00.000Z',
};

function hasNoStorageAttributes(value: object): void {
  for (const attribute of STORAGE_ATTRIBUTES) {
    expect(attribute in value).toBe(false);
  }
}

describe('account mapping', () => {
  it('stamps keys and GSI attributes on the item', () => {
    const item = toAccountItem(account);
    expect(item.PK).toBe('WORKSPACE#ws_demo');
    expect(item.SK).toBe('ACCOUNT#acc_1');
    expect(item.GSI1PK).toBe('IMPORT#imp_1');
    expect(item.GSI2PK).toBe('WORKSPACE#ws_demo#LEVEL#HIGH');
    expect(item.entityType).toBe('Account');
  });

  it('round-trips item → domain without leaking storage attributes', () => {
    const restored = toDomain<Account>(toAccountItem(account));
    expect(restored).toEqual(account);
    hasNoStorageAttributes(restored);
  });

  it('drops workspaceId when producing the API DTO', () => {
    const dto = toAccountDto(account);
    expect('workspaceId' in dto).toBe(false);
    expect(dto.id).toBe('acc_1');
    hasNoStorageAttributes(dto);
  });
});

describe('import mapping', () => {
  const job: ImportJob = {
    id: 'imp_1',
    workspaceId: 'ws_demo',
    filename: 'crm.csv',
    status: 'COMPLETED',
    uploadedBy: 'user@example.com',
    uploadedAt: '2026-07-12T00:00:00.000Z',
    totalRows: 3,
    successfulRows: 2,
    failedRows: 1,
  };

  const rowError: ImportRowError = {
    importId: 'imp_1',
    rowNumber: 2,
    message: 'Invalid cloud provider',
    rawValue: 'Aws!',
  };

  it('round-trips an import job without leaking keys', () => {
    const restored = toDomain<ImportJob>(toImportItem(job));
    expect(restored).toEqual(job);
    hasNoStorageAttributes(restored);
  });

  it('assembles the import detail DTO and strips internal ids', () => {
    const dto = toImportDetailDto(job, [rowError]);
    expect('workspaceId' in dto).toBe(false);
    expect(dto.errors).toHaveLength(1);
    expect('importId' in dto.errors[0]!).toBe(false);
    expect(dto.errors[0]?.rowNumber).toBe(2);
  });

  it('stamps the padded error row key', () => {
    expect(toImportErrorItem('ws_demo', rowError).SK).toBe('IMPORTERROR#imp_1#000002');
  });
});
