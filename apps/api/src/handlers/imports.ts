import { randomUUID } from 'node:crypto';
import {
  CreateImportRequestSchema,
  PaginationQuerySchema,
  type CreateImportResponse,
  type ListImportsResponse,
} from '@cloud-gtm/contracts';
import { toImportDetailDto, toImportDto } from '@cloud-gtm/database';
import type { ImportJob } from '@cloud-gtm/database';
import { HttpError } from '../http/errors';
import { jsonResponse } from '../http/responses';
import { parseJsonBody, parseOrThrow, type RouteHandler } from '../http/router';

/** Presigned upload URLs are short-lived: enough to start the upload, no more. */
const UPLOAD_URL_TTL_SECONDS = 15 * 60;

/** Until auth lands, every import is attributed to a single demo operator. */
const DEFAULT_UPLOADED_BY = 'demo-user';

/**
 * Builds the S3 object key for an import's raw CSV. The workspace and import id
 * are encoded in the path so the M5 processing Lambda (YUR-28) can resolve the
 * import straight from the S3 event without a lookup table.
 */
export function importObjectKey(workspaceId: string, importId: string): string {
  return `imports/${workspaceId}/${importId}.csv`;
}

function sortLatestFirst(imports: ImportJob[]): ImportJob[] {
  return [...imports].sort((a, b) => b.uploadedAt.localeCompare(a.uploadedAt));
}

/** `GET /imports` — paginated history of CRM import jobs, newest first. */
export const listImports: RouteHandler = async ({ event, ctx, deps }) => {
  const query = parseOrThrow(PaginationQuerySchema, event.queryStringParameters ?? {});
  const imports = sortLatestFirst(await deps.repositories.imports.list(ctx.workspaceId));
  const start = (query.page - 1) * query.pageSize;
  const items = imports.slice(start, start + query.pageSize).map(toImportDto);
  const body: ListImportsResponse = {
    items,
    pagination: {
      page: query.page,
      pageSize: query.pageSize,
      totalItems: imports.length,
      totalPages: imports.length === 0 ? 0 : Math.ceil(imports.length / query.pageSize),
    },
  };
  return jsonResponse(200, body);
};

/** `GET /imports/{importId}` — import summary plus row-level errors. */
export const getImport: RouteHandler = async ({ params, ctx, deps }) => {
  const importId = params.importId ?? '';
  const job = await deps.repositories.imports.get(ctx.workspaceId, importId);
  if (!job) throw HttpError.notFound(`Import ${importId} not found`);
  const errors = await deps.repositories.imports.listErrors(ctx.workspaceId, importId);
  return jsonResponse(200, toImportDetailDto(job, errors));
};

/**
 * `POST /imports` — records a PENDING import and returns a presigned URL the
 * browser uses to upload the CSV straight to S3, bypassing API Gateway. The row
 * count fields start at zero; the processing Lambda fills them in later.
 */
export const createImport: RouteHandler = async ({ event, ctx, deps }) => {
  const request = parseOrThrow(CreateImportRequestSchema, parseJsonBody(event));

  const importId = `imp_${randomUUID()}`;
  const s3Key = importObjectKey(ctx.workspaceId, importId);
  const job: ImportJob = {
    id: importId,
    workspaceId: ctx.workspaceId,
    filename: request.filename,
    status: 'PENDING',
    uploadedBy: DEFAULT_UPLOADED_BY,
    uploadedAt: new Date().toISOString(),
    totalRows: 0,
    successfulRows: 0,
    failedRows: 0,
  };
  await deps.repositories.imports.save(job);

  const target = await deps.uploads.createUploadUrl({
    bucket: deps.config.importBucket,
    key: s3Key,
    contentType: request.contentType,
    expiresInSeconds: UPLOAD_URL_TTL_SECONDS,
  });

  const body: CreateImportResponse = {
    importId,
    uploadUrl: target.url,
    s3Key,
    expiresInSeconds: target.expiresInSeconds,
  };
  ctx.logger.info('Import created', { importId, filename: request.filename });
  return jsonResponse(201, body);
};
