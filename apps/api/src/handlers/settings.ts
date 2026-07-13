import { ResetWorkspaceRequestSchema, type ResetWorkspaceResponse } from '@cloud-gtm/contracts';
import { jsonResponse } from '../http/responses';
import { parseJsonBody, parseOrThrow, type RouteHandler } from '../http/router';

/** `POST /settings/reset-workspace` — clears imported demo data for repeatable QA. */
export const resetWorkspace: RouteHandler = async ({ event, ctx, deps }) => {
  parseOrThrow(ResetWorkspaceRequestSchema, parseJsonBody(event));

  const imports = await deps.repositories.imports.list(ctx.workspaceId);
  const accounts = await deps.repositories.accounts.list(ctx.workspaceId);

  let deletedImportErrors = 0;
  for (const job of imports) {
    deletedImportErrors += await deps.repositories.imports.deleteErrors(ctx.workspaceId, job.id);
    await deps.repositories.imports.delete(ctx.workspaceId, job.id);
  }

  let deletedAccountScores = 0;
  let deletedInsights = 0;
  for (const account of accounts) {
    await deps.repositories.accounts.deleteScore(ctx.workspaceId, account.id, account.scoreVersion);
    deletedAccountScores += 1;
    deletedInsights += await deps.repositories.insights.deleteByAccount(
      ctx.workspaceId,
      account.id,
    );
    await deps.repositories.accounts.delete(ctx.workspaceId, account.id);
  }

  const existingDashboard = await deps.repositories.dashboard.get(ctx.workspaceId);
  await deps.repositories.dashboard.delete(ctx.workspaceId);

  const body: ResetWorkspaceResponse = {
    deletedImports: imports.length,
    deletedImportErrors,
    deletedAccounts: accounts.length,
    deletedAccountScores,
    deletedInsights,
    deletedDashboardSummaries: existingDashboard ? 1 : 0,
  };

  ctx.logger.warn('Workspace data reset', body);
  return jsonResponse(200, body);
};
