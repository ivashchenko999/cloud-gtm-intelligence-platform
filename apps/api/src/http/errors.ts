import type { ApiErrorCode, ErrorDetail } from '@cloud-gtm/contracts';
import type { ZodError } from 'zod';

/**
 * An error carrying the HTTP status and machine-readable {@link ApiErrorCode}
 * the middleware renders into the shared `ErrorResponse` envelope. Handlers
 * throw these; they never format error responses themselves.
 */
export class HttpError extends Error {
  constructor(
    readonly status: number,
    readonly code: ApiErrorCode,
    message: string,
    readonly details?: ErrorDetail[],
  ) {
    super(message);
    this.name = 'HttpError';
  }

  static notFound(message = 'Resource not found'): HttpError {
    return new HttpError(404, 'NOT_FOUND', message);
  }

  static badRequest(message: string): HttpError {
    return new HttpError(400, 'VALIDATION_ERROR', message);
  }

  /** 400 built from a Zod failure, one {@link ErrorDetail} per issue. */
  static fromZodError(error: ZodError, message = 'Request validation failed'): HttpError {
    const details: ErrorDetail[] = error.issues.map((issue) => ({
      path: issue.path.join('.'),
      message: issue.message,
    }));
    return new HttpError(400, 'VALIDATION_ERROR', message, details);
  }
}
