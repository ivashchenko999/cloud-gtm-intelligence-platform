import type { CloudProvider, ScoreLevel } from '@cloud-gtm/contracts';

/**
 * Single-table-design keys for `CloudGtmTable`. Every item lives under its
 * workspace partition; child collections use distinct SK prefixes so
 * `begins_with` queries never overlap (e.g. `ACCOUNT#` vs `ACCOUNTSCORE#`).
 */

export const GSI = {
  byImport: 'GSI1',
  byScoreLevel: 'GSI2',
  byCloud: 'GSI3',
} as const;

/** Scores are 0–100; zero-pad to keep GSI sort keys lexicographically ordered. */
export function paddedScore(score: number): string {
  return Math.max(0, Math.min(100, Math.round(score)))
    .toString()
    .padStart(3, '0');
}

const workspacePk = (workspaceId: string) => `WORKSPACE#${workspaceId}`;

export const keys = {
  workspace: (workspaceId: string) => ({
    PK: workspacePk(workspaceId),
    SK: 'METADATA',
  }),

  dashboard: (workspaceId: string) => ({
    PK: workspacePk(workspaceId),
    SK: 'DASHBOARD',
  }),

  import: (workspaceId: string, importId: string) => ({
    PK: workspacePk(workspaceId),
    SK: `IMPORT#${importId}`,
  }),

  /** Prefix for `list imports` (`begins_with(SK, 'IMPORT#')`). */
  importPrefix: 'IMPORT#',

  importError: (workspaceId: string, importId: string, rowNumber: number) => ({
    PK: workspacePk(workspaceId),
    SK: `IMPORTERROR#${importId}#${rowNumber.toString().padStart(6, '0')}`,
  }),

  /** Prefix for `errors by import`. */
  importErrorPrefix: (importId: string) => `IMPORTERROR#${importId}#`,

  account: (workspaceId: string, accountId: string) => ({
    PK: workspacePk(workspaceId),
    SK: `ACCOUNT#${accountId}`,
  }),

  /** Prefix for `list accounts` (`begins_with(SK, 'ACCOUNT#')`). */
  accountPrefix: 'ACCOUNT#',

  accountScore: (workspaceId: string, accountId: string, version: string) => ({
    PK: workspacePk(workspaceId),
    SK: `ACCOUNTSCORE#${accountId}#${version}`,
  }),

  insight: (workspaceId: string, accountId: string, type: string, locale: string) => ({
    PK: workspacePk(workspaceId),
    SK: `INSIGHT#${accountId}#${type}#${locale}`,
  }),

  /** Prefix for `insights by account`. */
  insightPrefix: (accountId: string) => `INSIGHT#${accountId}#`,
} as const;

/**
 * GSI attributes carried by an account item so it is discoverable by import
 * (GSI1, only when the account came from one), by score level / high-intent
 * (GSI2), and by cloud provider (GSI3) — GSI2/GSI3 sorted by score.
 */
export function accountGsiKeys(input: {
  workspaceId: string;
  accountId: string;
  importId?: string;
  scoreLevel: ScoreLevel;
  primaryCloud: CloudProvider;
  score: number;
}) {
  const sortKey = `${paddedScore(input.score)}#${input.accountId}`;
  return {
    ...(input.importId !== undefined && {
      GSI1PK: gsiPartitions.accountsByImport(input.importId),
      GSI1SK: `ACCOUNT#${input.accountId}`,
    }),
    GSI2PK: gsiPartitions.accountsByScoreLevel(input.workspaceId, input.scoreLevel),
    GSI2SK: sortKey,
    GSI3PK: gsiPartitions.accountsByCloud(input.workspaceId, input.primaryCloud),
    GSI3SK: sortKey,
  };
}

export const gsiPartitions = {
  accountsByImport: (importId: string) => `IMPORT#${importId}`,
  accountsByScoreLevel: (workspaceId: string, level: ScoreLevel) =>
    `WORKSPACE#${workspaceId}#LEVEL#${level}`,
  accountsByCloud: (workspaceId: string, cloud: CloudProvider) =>
    `WORKSPACE#${workspaceId}#CLOUD#${cloud}`,
} as const;
