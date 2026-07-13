import type { CloudProvider, ScoreLevel } from '@cloud-gtm/contracts';
import type {
  Account,
  AccountScoreRecord,
  AIInsightRecord,
  DashboardSummary,
  ImportJob,
  ImportRowError,
  Workspace,
} from './entities';
import type { TableGateway } from './gateway';
import { gsiPartitions, keys } from './keys';
import {
  toAccountItem,
  toAccountScoreItem,
  toDashboardItem,
  toDomain,
  toImportErrorItem,
  toImportItem,
  toInsightItem,
  toWorkspaceItem,
} from './mappers';

export class WorkspaceRepository {
  constructor(private readonly gateway: TableGateway) {}

  async get(workspaceId: string): Promise<Workspace | undefined> {
    const key = keys.workspace(workspaceId);
    const item = await this.gateway.get(key.PK, key.SK);
    return item ? toDomain<Workspace>(item) : undefined;
  }

  async save(workspace: Workspace): Promise<void> {
    await this.gateway.put(toWorkspaceItem(workspace));
  }
}

export class ImportRepository {
  constructor(private readonly gateway: TableGateway) {}

  async get(workspaceId: string, importId: string): Promise<ImportJob | undefined> {
    const key = keys.import(workspaceId, importId);
    const item = await this.gateway.get(key.PK, key.SK);
    return item ? toDomain<ImportJob>(item) : undefined;
  }

  async list(workspaceId: string): Promise<ImportJob[]> {
    const items = await this.gateway.query({
      partition: keys.workspace(workspaceId).PK,
      beginsWith: keys.importPrefix,
    });
    return items.map((item) => toDomain<ImportJob>(item));
  }

  async save(job: ImportJob): Promise<void> {
    await this.gateway.put(toImportItem(job));
  }

  async delete(workspaceId: string, importId: string): Promise<void> {
    const key = keys.import(workspaceId, importId);
    await this.gateway.delete(key.PK, key.SK);
  }

  async addErrors(workspaceId: string, errors: ImportRowError[]): Promise<void> {
    if (errors.length === 0) return;
    await this.gateway.putMany(errors.map((error) => toImportErrorItem(workspaceId, error)));
  }

  async listErrors(workspaceId: string, importId: string): Promise<ImportRowError[]> {
    const items = await this.gateway.query({
      partition: keys.workspace(workspaceId).PK,
      beginsWith: keys.importErrorPrefix(importId),
    });
    return items.map((item) => toDomain<ImportRowError>(item));
  }

  async deleteErrors(workspaceId: string, importId: string): Promise<number> {
    const errors = await this.listErrors(workspaceId, importId);
    for (const error of errors) {
      const key = keys.importError(workspaceId, importId, error.rowNumber);
      await this.gateway.delete(key.PK, key.SK);
    }
    return errors.length;
  }
}

export class AccountRepository {
  constructor(private readonly gateway: TableGateway) {}

  async get(workspaceId: string, accountId: string): Promise<Account | undefined> {
    const key = keys.account(workspaceId, accountId);
    const item = await this.gateway.get(key.PK, key.SK);
    return item ? toDomain<Account>(item) : undefined;
  }

  async list(workspaceId: string): Promise<Account[]> {
    const items = await this.gateway.query({
      partition: keys.workspace(workspaceId).PK,
      beginsWith: keys.accountPrefix,
    });
    return items.map((item) => toDomain<Account>(item));
  }

  async save(account: Account): Promise<void> {
    await this.gateway.put(toAccountItem(account));
  }

  async delete(workspaceId: string, accountId: string): Promise<void> {
    const key = keys.account(workspaceId, accountId);
    await this.gateway.delete(key.PK, key.SK);
  }

  async saveMany(accounts: Account[]): Promise<void> {
    if (accounts.length === 0) return;
    await this.gateway.putMany(accounts.map(toAccountItem));
  }

  /** High-intent accounts (GSI2), highest score first. */
  listHighIntent(workspaceId: string, limit?: number): Promise<Account[]> {
    return this.listByLevel(workspaceId, 'HIGH', limit);
  }

  /** Accounts at a given score level (GSI2), highest score first. */
  async listByLevel(workspaceId: string, level: ScoreLevel, limit?: number): Promise<Account[]> {
    const items = await this.gateway.query({
      index: 'GSI2',
      partition: gsiPartitions.accountsByScoreLevel(workspaceId, level),
      ascending: false,
      ...(limit !== undefined && { limit }),
    });
    return items.map((item) => toDomain<Account>(item));
  }

  /** Accounts produced by a given import (GSI1). */
  async listByImport(importId: string): Promise<Account[]> {
    const items = await this.gateway.query({
      index: 'GSI1',
      partition: gsiPartitions.accountsByImport(importId),
    });
    return items.map((item) => toDomain<Account>(item));
  }

  /** Accounts on a given cloud provider (GSI3), highest score first. */
  async listByCloud(workspaceId: string, cloud: CloudProvider, limit?: number): Promise<Account[]> {
    const items = await this.gateway.query({
      index: 'GSI3',
      partition: gsiPartitions.accountsByCloud(workspaceId, cloud),
      ascending: false,
      ...(limit !== undefined && { limit }),
    });
    return items.map((item) => toDomain<Account>(item));
  }

  async getScore(
    workspaceId: string,
    accountId: string,
    version: string,
  ): Promise<AccountScoreRecord | undefined> {
    const key = keys.accountScore(workspaceId, accountId, version);
    const item = await this.gateway.get(key.PK, key.SK);
    return item ? toDomain<AccountScoreRecord>(item) : undefined;
  }

  async saveScore(record: AccountScoreRecord): Promise<void> {
    await this.gateway.put(toAccountScoreItem(record));
  }

  async deleteScore(workspaceId: string, accountId: string, version: string): Promise<void> {
    const key = keys.accountScore(workspaceId, accountId, version);
    await this.gateway.delete(key.PK, key.SK);
  }
}

export class InsightRepository {
  constructor(private readonly gateway: TableGateway) {}

  async listByAccount(workspaceId: string, accountId: string): Promise<AIInsightRecord[]> {
    const items = await this.gateway.query({
      partition: keys.workspace(workspaceId).PK,
      beginsWith: keys.insightPrefix(accountId),
    });
    return items.map((item) => toDomain<AIInsightRecord>(item));
  }

  async save(record: AIInsightRecord): Promise<void> {
    await this.gateway.put(toInsightItem(record));
  }

  async deleteByAccount(workspaceId: string, accountId: string): Promise<number> {
    const insights = await this.listByAccount(workspaceId, accountId);
    for (const insight of insights) {
      const key = keys.insight(workspaceId, accountId, insight.type, insight.locale);
      await this.gateway.delete(key.PK, key.SK);
    }
    return insights.length;
  }
}

export class DashboardRepository {
  constructor(private readonly gateway: TableGateway) {}

  async get(workspaceId: string): Promise<DashboardSummary | undefined> {
    const key = keys.dashboard(workspaceId);
    const item = await this.gateway.get(key.PK, key.SK);
    return item ? toDomain<DashboardSummary>(item) : undefined;
  }

  async save(summary: DashboardSummary): Promise<void> {
    await this.gateway.put(toDashboardItem(summary));
  }

  async delete(workspaceId: string): Promise<void> {
    const key = keys.dashboard(workspaceId);
    await this.gateway.delete(key.PK, key.SK);
  }
}

/** Convenience bundle wiring every repository to one gateway. */
export function createRepositories(gateway: TableGateway) {
  return {
    workspaces: new WorkspaceRepository(gateway),
    imports: new ImportRepository(gateway),
    accounts: new AccountRepository(gateway),
    insights: new InsightRepository(gateway),
    dashboard: new DashboardRepository(gateway),
  };
}

export type Repositories = ReturnType<typeof createRepositories>;
