import { ListAccountsQuerySchema } from '@cloud-gtm/contracts';
import { toAccountDto } from '@cloud-gtm/database';
import { HttpError } from '../http/errors';
import { jsonResponse } from '../http/responses';
import { parseOrThrow, type RouteHandler } from '../http/router';
import { queryAccounts } from '../services/account-query';

/** `GET /accounts` — filtered, sorted, paginated account summaries. */
export const listAccounts: RouteHandler = async ({ event, ctx, deps }) => {
  const query = parseOrThrow(ListAccountsQuerySchema, event.queryStringParameters ?? {});
  const accounts = await deps.repositories.accounts.list(ctx.workspaceId);
  const page = queryAccounts(accounts.map(toAccountDto), query);
  return jsonResponse(200, page);
};

/** `GET /accounts/{accountId}` — full account profile, score, and factors. */
export const getAccount: RouteHandler = async ({ params, ctx, deps }) => {
  const accountId = params.accountId ?? '';
  const account = await deps.repositories.accounts.get(ctx.workspaceId, accountId);
  if (!account) throw HttpError.notFound(`Account ${accountId} not found`);
  return jsonResponse(200, toAccountDto(account));
};
