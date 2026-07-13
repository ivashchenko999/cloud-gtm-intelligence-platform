import { z } from './zod';
import { paginated } from './common';
import { ImportStatusSchema } from './enums';

/** A single rejected CSV row, surfaced in the import detail view. */
export const ImportErrorSchema = z
  .object({
    rowNumber: z.number().int().positive(),
    field: z.string().optional(),
    message: z.string(),
    rawValue: z.string().optional(),
  })
  .openapi('ImportError');
export type ImportError = z.infer<typeof ImportErrorSchema>;

/** Import job summary returned by `GET /imports` and `GET /imports/{id}`. */
export const ImportResponseSchema = z
  .object({
    id: z.string(),
    filename: z.string(),
    status: ImportStatusSchema,
    uploadedBy: z.string(),
    uploadedAt: z.string().datetime(),
    startedAt: z.string().datetime().optional(),
    completedAt: z.string().datetime().optional(),
    totalRows: z.number().int().nonnegative(),
    successfulRows: z.number().int().nonnegative(),
    failedRows: z.number().int().nonnegative(),
    durationMs: z.number().int().nonnegative().optional(),
  })
  .openapi('Import');
export type ImportResponse = z.infer<typeof ImportResponseSchema>;

export const ListImportsResponseSchema =
  paginated(ImportResponseSchema).openapi('ListImportsResponse');
export type ListImportsResponse = z.infer<typeof ListImportsResponseSchema>;

/** `GET /imports/{id}` — the summary plus its rejected rows. */
export const ImportDetailResponseSchema = ImportResponseSchema.extend({
  errors: z.array(ImportErrorSchema),
}).openapi('ImportDetail');
export type ImportDetailResponse = z.infer<typeof ImportDetailResponseSchema>;

const CSV_CONTENT_TYPES = ['text/csv', 'application/vnd.ms-excel'] as const;
export const MAX_IMPORT_BYTES = 10 * 1024 * 1024;

/** `POST /imports` — start an import and request a presigned upload URL. */
export const CreateImportRequestSchema = z
  .object({
    filename: z.string().trim().min(1).max(255),
    contentType: z.enum(CSV_CONTENT_TYPES),
    sizeBytes: z.number().int().positive().max(MAX_IMPORT_BYTES),
  })
  .openapi('CreateImportRequest');
export type CreateImportRequest = z.infer<typeof CreateImportRequestSchema>;

export const CreateImportResponseSchema = z
  .object({
    importId: z.string(),
    uploadUrl: z.string().url(),
    s3Key: z.string(),
    expiresInSeconds: z.number().int().positive(),
  })
  .openapi('CreateImportResponse');
export type CreateImportResponse = z.infer<typeof CreateImportResponseSchema>;
