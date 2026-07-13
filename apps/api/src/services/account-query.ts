import type {
  AccountResponse,
  AccountSortField,
  AccountSummary,
  ListAccountsQuery,
  PaginationMeta,
  SortOrder,
} from '@cloud-gtm/contracts';

/**
 * Server-side account querying. The repository returns every account in the
 * workspace; filtering, sorting, and pagination happen here at demo scale so
 * the same code path is trivially testable and independent of DynamoDB.
 */

function matchesFilters(account: AccountResponse, query: ListAccountsQuery): boolean {
  if (query.scoreLevel && account.scoreLevel !== query.scoreLevel) return false;
  if (query.cloudProvider && account.primaryCloud !== query.cloudProvider) return false;
  if (query.marketplaceActivity && account.marketplaceActivity !== query.marketplaceActivity) {
    return false;
  }
  if (query.importId && account.importId !== query.importId) return false;
  if (query.minScore !== undefined && account.purchaseIntentScore < query.minScore) return false;

  if (query.industry) {
    const industry = account.industry?.toLowerCase() ?? '';
    if (industry !== query.industry.toLowerCase()) return false;
  }

  if (query.search) {
    const needle = query.search.toLowerCase();
    const haystack = `${account.name} ${account.domain ?? ''}`.toLowerCase();
    if (!haystack.includes(needle)) return false;
  }

  return true;
}

/** Sort key for a field, coercing absent optionals to a value that sorts last. */
function sortValue(account: AccountResponse, field: AccountSortField): string | number {
  switch (field) {
    case 'name':
      return account.name.toLowerCase();
    case 'industry':
      return account.industry?.toLowerCase() ?? '';
    case 'employeeCount':
      return account.employeeCount ?? -1;
    case 'estimatedCloudSpend':
      return account.estimatedCloudSpend ?? -1;
    case 'purchaseIntentScore':
      return account.purchaseIntentScore;
    case 'updatedAt':
      return account.updatedAt;
  }
}

function compareAccounts(
  a: AccountResponse,
  b: AccountResponse,
  field: AccountSortField,
  order: SortOrder,
): number {
  const left = sortValue(a, field);
  const right = sortValue(b, field);
  let result: number;
  if (typeof left === 'number' && typeof right === 'number') {
    result = left - right;
  } else {
    result = String(left).localeCompare(String(right));
  }
  // Stable tiebreaker so equal keys keep a deterministic order across pages.
  if (result === 0) result = a.id.localeCompare(b.id);
  return order === 'asc' ? result : -result;
}

/** Projects a full account onto the slim {@link AccountSummary} grid row. */
export function toAccountSummary(account: AccountResponse): AccountSummary {
  return {
    id: account.id,
    name: account.name,
    ...(account.domain !== undefined && { domain: account.domain }),
    ...(account.industry !== undefined && { industry: account.industry }),
    ...(account.employeeCount !== undefined && { employeeCount: account.employeeCount }),
    primaryCloud: account.primaryCloud,
    ...(account.estimatedCloudSpend !== undefined && {
      estimatedCloudSpend: account.estimatedCloudSpend,
    }),
    ...(account.marketplaceActivity !== undefined && {
      marketplaceActivity: account.marketplaceActivity,
    }),
    purchaseIntentScore: account.purchaseIntentScore,
    scoreLevel: account.scoreLevel,
    updatedAt: account.updatedAt,
  };
}

export interface AccountPage {
  items: AccountSummary[];
  pagination: PaginationMeta;
}

/** Applies filters, sorting, and pagination, returning the list-endpoint page. */
export function queryAccounts(
  accounts: readonly AccountResponse[],
  query: ListAccountsQuery,
): AccountPage {
  const filtered = accounts.filter((account) => matchesFilters(account, query));
  const sorted = [...filtered].sort((a, b) => compareAccounts(a, b, query.sortBy, query.sortOrder));

  const totalItems = sorted.length;
  const totalPages = Math.ceil(totalItems / query.pageSize);
  const start = (query.page - 1) * query.pageSize;
  const items = sorted.slice(start, start + query.pageSize).map(toAccountSummary);

  return {
    items,
    pagination: { page: query.page, pageSize: query.pageSize, totalItems, totalPages },
  };
}
