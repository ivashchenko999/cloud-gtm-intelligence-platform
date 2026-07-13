import type {
  AccountResponse,
  AccountScore,
  AIInsight,
  DashboardResponse,
  ImportDetailResponse,
  ImportError,
  ImportResponse,
} from '@cloud-gtm/contracts';
import {
  EntityType,
  STORAGE_ATTRIBUTES,
  type Account,
  type AccountScoreRecord,
  type AIInsightRecord,
  type DashboardSummary,
  type ImportJob,
  type ImportRowError,
  type StoredItem,
  type Workspace,
} from './entities';
import { accountGsiKeys, keys } from './keys';

/**
 * Item → domain (layer 1 → 2). Strips every storage attribute so no
 * `PK`/`SK`/`GSI*`/`entityType` can leak upward.
 */
export function toDomain<T>(item: Record<string, unknown>): T {
  const clone: Record<string, unknown> = { ...item };
  for (const attribute of STORAGE_ATTRIBUTES) {
    delete clone[attribute];
  }
  return clone as T;
}

// --- domain → item (layer 2 → 1) -------------------------------------------

export function toWorkspaceItem(workspace: Workspace): StoredItem<Workspace> {
  return { ...workspace, ...keys.workspace(workspace.id), entityType: EntityType.Workspace };
}

export function toImportItem(job: ImportJob): StoredItem<ImportJob> {
  return {
    ...job,
    ...keys.import(job.workspaceId, job.id),
    entityType: EntityType.Import,
  };
}

export function toImportErrorItem(
  workspaceId: string,
  error: ImportRowError,
): StoredItem<ImportRowError> {
  return {
    ...error,
    ...keys.importError(workspaceId, error.importId, error.rowNumber),
    entityType: EntityType.ImportError,
  };
}

export function toAccountItem(account: Account): StoredItem<Account> {
  return {
    ...account,
    ...keys.account(account.workspaceId, account.id),
    ...accountGsiKeys({
      workspaceId: account.workspaceId,
      accountId: account.id,
      scoreLevel: account.scoreLevel,
      primaryCloud: account.primaryCloud,
      score: account.purchaseIntentScore,
      ...(account.importId !== undefined && { importId: account.importId }),
    }),
    entityType: EntityType.Account,
  };
}

export function toAccountScoreItem(record: AccountScoreRecord): StoredItem<AccountScoreRecord> {
  return {
    ...record,
    ...keys.accountScore(record.workspaceId, record.accountId, record.version),
    entityType: EntityType.AccountScore,
  };
}

export function toInsightItem(record: AIInsightRecord): StoredItem<AIInsightRecord> {
  return {
    ...record,
    ...keys.insight(record.workspaceId, record.accountId, record.type, record.locale),
    entityType: EntityType.AIInsight,
  };
}

export function toDashboardItem(summary: DashboardSummary): StoredItem<DashboardSummary> {
  return {
    ...summary,
    ...keys.dashboard(summary.workspaceId),
    entityType: EntityType.DashboardSummary,
  };
}

// --- domain → DTO (layer 2 → 3) --------------------------------------------

export function toAccountDto(account: Account): AccountResponse {
  const { workspaceId: _workspaceId, ...dto } = account;
  return dto;
}

export function toImportDto(job: ImportJob): ImportResponse {
  const { workspaceId: _workspaceId, ...dto } = job;
  return dto;
}

export function toImportErrorDto(error: ImportRowError): ImportError {
  const { importId: _importId, ...dto } = error;
  return dto;
}

export function toImportDetailDto(job: ImportJob, errors: ImportRowError[]): ImportDetailResponse {
  return { ...toImportDto(job), errors: errors.map(toImportErrorDto) };
}

export function toAccountScoreDto(record: AccountScoreRecord): AccountScore {
  const { accountId: _accountId, workspaceId: _workspaceId, ...dto } = record;
  return dto;
}

export function toInsightDto(record: AIInsightRecord): AIInsight {
  const { workspaceId: _workspaceId, ...dto } = record;
  return dto;
}

export function toDashboardDto(summary: DashboardSummary): DashboardResponse {
  const { workspaceId: _workspaceId, ...dto } = summary;
  return dto;
}
