import type {
  AccountResponse,
  AccountScore,
  AIInsight,
  DashboardResponse,
  ImportError,
  ImportResponse,
} from '@cloud-gtm/contracts';

/**
 * Domain models (layer 2). Each reuses its API DTO shape and adds only the
 * internal fields the storage layer needs (e.g. `workspaceId`). Storage keys
 * live on the item type, never here — see ADR 0006.
 */

export interface Workspace {
  id: string;
  name: string;
  createdAt: string;
}

export type Account = AccountResponse & { workspaceId: string };
export type ImportJob = ImportResponse & { workspaceId: string };
export type ImportRowError = ImportError & { importId: string };
export type AccountScoreRecord = AccountScore & { accountId: string; workspaceId: string };
export type AIInsightRecord = AIInsight & { workspaceId: string };
export type DashboardSummary = DashboardResponse & { workspaceId: string };

export const EntityType = {
  Workspace: 'Workspace',
  Import: 'Import',
  ImportError: 'ImportError',
  Account: 'Account',
  AccountScore: 'AccountScore',
  AIInsight: 'AIInsight',
  DashboardSummary: 'DashboardSummary',
} as const;
export type EntityType = (typeof EntityType)[keyof typeof EntityType];

/** Primary + GSI keys stamped onto every stored item. */
export interface TableKeys {
  PK: string;
  SK: string;
  GSI1PK?: string;
  GSI1SK?: string;
  GSI2PK?: string;
  GSI2SK?: string;
  GSI3PK?: string;
  GSI3SK?: string;
}

/**
 * A persisted item (layer 1): a domain model plus its keys and entity tag. The
 * `Record` intersection keeps it assignable to the gateway's loosely-typed
 * item shape while preserving the known field types.
 */
export type StoredItem<T> = T & TableKeys & { entityType: EntityType } & Record<string, unknown>;

/** Attributes that must never leak past the mapper into a domain model or DTO. */
export const STORAGE_ATTRIBUTES = [
  'PK',
  'SK',
  'GSI1PK',
  'GSI1SK',
  'GSI2PK',
  'GSI2SK',
  'GSI3PK',
  'GSI3SK',
  'entityType',
] as const;
