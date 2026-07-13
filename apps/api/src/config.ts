/**
 * Runtime configuration resolved from the environment the CDK `ApiStack`
 * injects into the Lambda. Kept intentionally small — the AI integration grows
 * `geminiSecretArn` into a real client in M7.
 */
export interface ApiConfig {
  tableName: string;
  geminiSecretArn: string;
  /** Private S3 bucket CRM CSVs are uploaded to via presigned URLs. */
  importBucket: string;
  /** Workspace every request is scoped to until multi-tenant auth lands. */
  workspaceId: string;
}

/**
 * The platform is single-tenant for the demo: all data lives under one
 * workspace partition. The id is overridable via `DEFAULT_WORKSPACE_ID` (see
 * `.env.example`) so seeded and test environments can diverge without code
 * changes.
 */
export const DEFAULT_WORKSPACE_ID = 'ws_demo';

export function readConfig(env: NodeJS.ProcessEnv = process.env): ApiConfig {
  return {
    tableName: env.TABLE_NAME ?? '',
    geminiSecretArn: env.GEMINI_SECRET_ARN ?? '',
    importBucket: env.IMPORT_BUCKET_NAME ?? '',
    workspaceId: env.DEFAULT_WORKSPACE_ID ?? DEFAULT_WORKSPACE_ID,
  };
}
