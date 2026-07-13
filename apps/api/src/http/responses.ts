import type { APIGatewayProxyResultV2 } from 'aws-lambda';
import type { ApiErrorCode, ErrorDetail, ErrorResponse } from '@cloud-gtm/contracts';

const JSON_HEADERS = { 'content-type': 'application/json' } as const;

/** Serializes `body` as a JSON HTTP response for the API Gateway v2 payload. */
export function jsonResponse(statusCode: number, body: unknown): APIGatewayProxyResultV2 {
  return {
    statusCode,
    headers: JSON_HEADERS,
    body: JSON.stringify(body),
  };
}

/** Builds the shared error envelope every endpoint returns on failure. */
export function errorResponse(
  statusCode: number,
  code: ApiErrorCode,
  message: string,
  options: { details?: ErrorDetail[]; requestId?: string } = {},
): APIGatewayProxyResultV2 {
  const body: ErrorResponse = {
    code,
    message,
    ...(options.details && options.details.length > 0 && { details: options.details }),
    ...(options.requestId !== undefined && { requestId: options.requestId }),
  };
  return jsonResponse(statusCode, body);
}
