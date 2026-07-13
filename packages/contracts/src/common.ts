import { z } from './zod';

/**
 * Stable, machine-readable error codes. Handlers return these; the frontend maps
 * them to localized copy. Codes are never localized strings themselves.
 */
export const ApiErrorCodeSchema = z
  .enum([
    'VALIDATION_ERROR',
    'NOT_FOUND',
    'CONFLICT',
    'UNAUTHORIZED',
    'FORBIDDEN',
    'RATE_LIMITED',
    'AI_UNAVAILABLE',
    'INTERNAL_ERROR',
  ])
  .openapi('ApiErrorCode');
export type ApiErrorCode = z.infer<typeof ApiErrorCodeSchema>;

/** One field-level validation problem, path-addressed for the frontend. */
export const ErrorDetailSchema = z
  .object({
    path: z.string(),
    message: z.string(),
  })
  .openapi('ErrorDetail');
export type ErrorDetail = z.infer<typeof ErrorDetailSchema>;

/** The single JSON error envelope every endpoint returns on failure. */
export const ErrorResponseSchema = z
  .object({
    code: ApiErrorCodeSchema,
    message: z.string(),
    details: z.array(ErrorDetailSchema).optional(),
    requestId: z.string().optional(),
  })
  .openapi('ErrorResponse');
export type ErrorResponse = z.infer<typeof ErrorResponseSchema>;

export const SortOrderSchema = z.enum(['asc', 'desc']).openapi('SortOrder');
export type SortOrder = z.infer<typeof SortOrderSchema>;

export const DEFAULT_PAGE_SIZE = 25;
export const MAX_PAGE_SIZE = 100;

/**
 * Query params shared by every list endpoint. Coerced from strings because they
 * arrive as query-string values from API Gateway.
 */
export const PaginationQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(MAX_PAGE_SIZE).default(DEFAULT_PAGE_SIZE),
});
export type PaginationQuery = z.infer<typeof PaginationQuerySchema>;

export const PaginationMetaSchema = z
  .object({
    page: z.number().int().min(1),
    pageSize: z.number().int().min(1),
    totalItems: z.number().int().min(0),
    totalPages: z.number().int().min(0),
  })
  .openapi('PaginationMeta');
export type PaginationMeta = z.infer<typeof PaginationMetaSchema>;

/** Builds the typed envelope schema for a paginated list of `item`. */
export function paginated<TItem extends z.ZodTypeAny>(item: TItem) {
  return z.object({
    items: z.array(item),
    pagination: PaginationMetaSchema,
  });
}
