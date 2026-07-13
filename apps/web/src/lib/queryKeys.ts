import type { CloudProvider, ScoreLevel } from '@cloud-gtm/contracts';

/** AI insight variants surfaced from the account drawer (delivered in M7). */
export type InsightKind = 'explanation' | 'next-action' | 'outreach';

/**
 * Filters accepted by the accounts list query. Kept intentionally loose here;
 * the concrete request contract is defined alongside the API in M4.
 */
export interface AccountsListParams {
  page?: number;
  pageSize?: number;
  search?: string;
  scoreLevel?: ScoreLevel;
  cloudProvider?: CloudProvider;
  industry?: string;
  sortBy?: string;
  sortDir?: 'asc' | 'desc';
}

/**
 * Centralized TanStack Query key factory — the single source of truth for query
 * keys so related caches invalidate consistently. Every key is returned `as
 * const` to keep it exactly typed at call sites.
 */
export const queryKeys = {
  dashboard: () => ['dashboard'] as const,
  accounts: {
    all: () => ['accounts'] as const,
    list: (params: AccountsListParams = {}) => ['accounts', 'list', params] as const,
    detail: (accountId: string) => ['accounts', 'detail', accountId] as const,
  },
  imports: {
    all: () => ['imports'] as const,
    list: () => ['imports', 'list'] as const,
    detail: (importId: string) => ['imports', 'detail', importId] as const,
  },
  insights: {
    all: (accountId: string) => ['insights', accountId] as const,
    detail: (accountId: string, kind: InsightKind) => ['insights', accountId, kind] as const,
  },
} as const;
