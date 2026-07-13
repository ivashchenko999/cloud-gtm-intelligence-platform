import { createHash } from 'node:crypto';
import { Logger } from '@aws-lambda-powertools/logger';
import type { EventBridgeEvent, S3Event } from 'aws-lambda';
import { GetObjectCommand, S3Client } from '@aws-sdk/client-s3';
import type { Account, AccountScoreRecord, ImportJob, ImportRowError } from '@cloud-gtm/database';
import { extractAccountFeatures, scoreAccount } from '@cloud-gtm/scoring';
import { parseAccountsCsv, type CsvAccountRow } from '@cloud-gtm/csv-import';
import { readConfig, type ApiConfig } from './config';
import { getRepositories } from './repositories';

const logger = new Logger({ serviceName: 'cloud-gtm-import-processor' });
const s3 = new S3Client({});

type S3ObjectCreatedEvent = EventBridgeEvent<
  'Object Created',
  {
    bucket: { name: string };
    object: { key: string };
    reason?: string;
  }
>;

interface ImportObjectRef {
  workspaceId: string;
  importId: string;
}

function parseImportObjectKey(key: string): ImportObjectRef | undefined {
  const match = /^imports\/([^/]+)\/([^/]+)\.csv$/.exec(
    decodeURIComponent(key.replace(/\+/g, ' ')),
  );
  if (!match) return undefined;
  return { workspaceId: match[1]!, importId: match[2]! };
}

function accountIdFor(row: CsvAccountRow): string {
  const stableInput = `${row.domain ?? ''}|${row.name}|${row.rowNumber}`.toLowerCase();
  return `acc_${createHash('sha256').update(stableInput).digest('hex').slice(0, 16)}`;
}

function toAccount(
  row: CsvAccountRow,
  workspaceId: string,
  importId: string,
  now: string,
): Account {
  const scored = scoreAccount(extractAccountFeatures(row));
  return {
    id: accountIdFor(row),
    workspaceId,
    name: row.name,
    primaryCloud: row.primaryCloud,
    existingProducts: row.existingProducts,
    purchaseIntentScore: scored.score,
    scoreLevel: scored.level,
    scoreVersion: scored.version,
    scoreFactors: scored.factors,
    importId,
    createdAt: now,
    updatedAt: now,
    ...(row.domain !== undefined && { domain: row.domain }),
    ...(row.industry !== undefined && { industry: row.industry }),
    ...(row.employeeCount !== undefined && { employeeCount: row.employeeCount }),
    ...(row.annualRevenue !== undefined && { annualRevenue: row.annualRevenue }),
    ...(row.estimatedCloudSpend !== undefined && { estimatedCloudSpend: row.estimatedCloudSpend }),
    ...(row.marketplaceActivity !== undefined && { marketplaceActivity: row.marketplaceActivity }),
    ...(row.marketplaceTransactions !== undefined && {
      marketplaceTransactions: row.marketplaceTransactions,
    }),
  };
}

function toScoreRecord(account: Account): AccountScoreRecord {
  return {
    accountId: account.id,
    workspaceId: account.workspaceId,
    score: account.purchaseIntentScore,
    level: account.scoreLevel,
    version: account.scoreVersion,
    factors: account.scoreFactors,
    scoredAt: account.updatedAt,
  };
}

async function readObjectText(bucket: string, key: string): Promise<string> {
  const result = await s3.send(new GetObjectCommand({ Bucket: bucket, Key: key }));
  return result.Body?.transformToString() ?? '';
}

export async function processImportObject(params: {
  config: ApiConfig;
  bucket: string;
  key: string;
}): Promise<void> {
  const objectRef = parseImportObjectKey(params.key);
  if (!objectRef) {
    logger.warn('Ignoring object outside import prefix', { key: params.key });
    return;
  }

  const repositories = getRepositories(params.config.tableName);
  const existing = await repositories.imports.get(objectRef.workspaceId, objectRef.importId);
  if (!existing) {
    logger.error('Import job not found for uploaded object', { ...objectRef });
    return;
  }

  const processingJob: ImportJob = { ...existing, status: 'PROCESSING' };
  await repositories.imports.save(processingJob);

  try {
    const csv = await readObjectText(params.bucket, params.key);
    const parsed = parseAccountsCsv(csv);
    const now = new Date().toISOString();
    const accounts = parsed.accounts.map((row) =>
      toAccount(row, objectRef.workspaceId, objectRef.importId, now),
    );
    const errors: ImportRowError[] = parsed.errors.map((error) => ({
      importId: objectRef.importId,
      rowNumber: error.rowNumber,
      message: error.message,
    }));

    await repositories.accounts.saveMany(accounts);
    for (const account of accounts) {
      await repositories.accounts.saveScore(toScoreRecord(account));
    }
    await repositories.imports.addErrors(objectRef.workspaceId, errors);

    const status =
      accounts.length === 0 ? 'FAILED' : errors.length > 0 ? 'PARTIALLY_COMPLETED' : 'COMPLETED';

    await repositories.imports.save({
      ...processingJob,
      status,
      totalRows: parsed.totalRows,
      successfulRows: accounts.length,
      failedRows: errors.length,
    });

    logger.info('Import processed', {
      ...objectRef,
      totalRows: parsed.totalRows,
      successfulRows: accounts.length,
      failedRows: errors.length,
      status,
    });
  } catch (error) {
    await repositories.imports.save({ ...processingJob, status: 'FAILED' });
    logger.error('Import processing failed', { ...objectRef, error });
    throw error;
  }
}

const config = readConfig();

function isS3Event(event: S3Event | S3ObjectCreatedEvent): event is S3Event {
  return 'Records' in event;
}

export async function handler(event: S3Event | S3ObjectCreatedEvent): Promise<void> {
  if (isS3Event(event)) {
    await Promise.all(
      event.Records.map((record) =>
        processImportObject({
          config,
          bucket: record.s3.bucket.name,
          key: record.s3.object.key,
        }),
      ),
    );
    return;
  }

  await processImportObject({
    config,
    bucket: event.detail.bucket.name,
    key: event.detail.object.key,
  });
}
