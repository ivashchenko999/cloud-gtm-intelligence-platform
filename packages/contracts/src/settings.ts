import { z } from './zod';

export const RESET_WORKSPACE_CONFIRMATION = 'RESET';

/** `POST /settings/reset-workspace` — destructive workspace data reset. */
export const ResetWorkspaceRequestSchema = z
  .object({
    confirmation: z.literal(RESET_WORKSPACE_CONFIRMATION),
  })
  .openapi('ResetWorkspaceRequest');
export type ResetWorkspaceRequest = z.infer<typeof ResetWorkspaceRequestSchema>;

export const ResetWorkspaceResponseSchema = z
  .object({
    deletedImports: z.number().int().nonnegative(),
    deletedImportErrors: z.number().int().nonnegative(),
    deletedAccounts: z.number().int().nonnegative(),
    deletedAccountScores: z.number().int().nonnegative(),
    deletedInsights: z.number().int().nonnegative(),
    deletedDashboardSummaries: z.number().int().nonnegative(),
  })
  .openapi('ResetWorkspaceResponse');
export type ResetWorkspaceResponse = z.infer<typeof ResetWorkspaceResponseSchema>;
