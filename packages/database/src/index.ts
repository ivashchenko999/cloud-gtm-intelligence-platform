/**
 * Single-table-design key builders for CloudGtmTable. Repositories and mappers
 * that use these land alongside the CDK data stack in M3.
 */
export const keys = {
  workspace: (workspaceId: string) => ({ PK: `WORKSPACE#${workspaceId}`, SK: 'METADATA' }),
  import: (workspaceId: string, importId: string) => ({
    PK: `WORKSPACE#${workspaceId}`,
    SK: `IMPORT#${importId}`,
  }),
  account: (workspaceId: string, accountId: string) => ({
    PK: `WORKSPACE#${workspaceId}`,
    SK: `ACCOUNT#${accountId}`,
  }),
  accountScore: (accountId: string, version: string) => ({
    PK: `ACCOUNT#${accountId}`,
    SK: `SCORE#${version}`,
  }),
} as const;
