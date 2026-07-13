import { toAccountDto, toImportDto, type ImportJob } from '@cloud-gtm/database';
import { jsonResponse } from '../http/responses';
import type { RouteHandler } from '../http/router';
import { computeDashboard } from '../services/dashboard';

/** Most recently uploaded import, or undefined when none have run yet. */
function latestImport(imports: readonly ImportJob[]): ImportJob | undefined {
  return [...imports].sort((a, b) => b.uploadedAt.localeCompare(a.uploadedAt))[0];
}

/** `GET /dashboard` — KPI totals, distributions, top accounts, latest import. */
export const getDashboard: RouteHandler = async ({ ctx, deps }) => {
  const [accounts, imports] = await Promise.all([
    deps.repositories.accounts.list(ctx.workspaceId),
    deps.repositories.imports.list(ctx.workspaceId),
  ]);

  const newest = latestImport(imports);
  const dashboard = computeDashboard(
    accounts.map(toAccountDto),
    newest ? toImportDto(newest) : null,
  );
  return jsonResponse(200, dashboard);
};
