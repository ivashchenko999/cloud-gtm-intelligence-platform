/**
 * Runtime fetch mutator used by the Orval-generated client. Keeping it here (not
 * generated) lets the app configure the API base URL and inject auth/tracing
 * headers without touching generated code.
 */
let baseUrl = '';

/** Sets the API origin/prefix the generated client targets (e.g. `/api`). */
export function configureApiClient(options: { baseUrl: string }): void {
  baseUrl = options.baseUrl.replace(/\/$/, '');
}

export class ApiError extends Error {
  constructor(
    readonly status: number,
    readonly body: unknown,
  ) {
    super(`API request failed with status ${status}`);
    this.name = 'ApiError';
  }
}

/**
 * Orval `fetch` mutator. Prefixes the configured base URL and parses JSON,
 * throwing {@link ApiError} on non-2xx so TanStack Query surfaces failures.
 */
export async function customFetch<T>(url: string, options: RequestInit = {}): Promise<T> {
  const response = await fetch(`${baseUrl}${url}`, {
    ...options,
    headers: {
      'content-type': 'application/json',
      ...options.headers,
    },
  });

  const text = await response.text();
  const body: unknown = text.length > 0 ? JSON.parse(text) : undefined;

  if (!response.ok) {
    throw new ApiError(response.status, body);
  }

  return body as T;
}
