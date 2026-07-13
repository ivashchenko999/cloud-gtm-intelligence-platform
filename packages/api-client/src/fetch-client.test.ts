import { afterEach, describe, expect, it, vi } from 'vitest';
import { ApiError, configureApiClient, customFetch } from './fetch-client';

const fetchMock = vi.fn();
vi.stubGlobal('fetch', fetchMock);

function jsonResponse(status: number, body: unknown): Response {
  return new Response(body === undefined ? null : JSON.stringify(body), {
    status,
    headers: { 'content-type': 'application/json' },
  });
}

afterEach(() => {
  fetchMock.mockReset();
  configureApiClient({ baseUrl: '' });
});

describe('customFetch', () => {
  it('prefixes the configured base URL and parses JSON', async () => {
    configureApiClient({ baseUrl: 'https://api.example.com/' });
    fetchMock.mockResolvedValueOnce(jsonResponse(200, { ok: true }));

    const result = await customFetch<{ ok: boolean }>('/dashboard', { method: 'GET' });

    expect(result).toEqual({ ok: true });
    expect(fetchMock).toHaveBeenCalledWith(
      'https://api.example.com/dashboard',
      expect.objectContaining({ method: 'GET' }),
    );
  });

  it('throws ApiError with status and body on a non-2xx response', async () => {
    fetchMock.mockResolvedValueOnce(jsonResponse(404, { code: 'NOT_FOUND', message: 'nope' }));

    const error = await customFetch('/accounts/x').catch((e: unknown) => e);

    expect(error).toBeInstanceOf(ApiError);
    expect((error as ApiError).status).toBe(404);
    expect((error as ApiError).body).toEqual({ code: 'NOT_FOUND', message: 'nope' });
  });

  it('tolerates an empty response body', async () => {
    fetchMock.mockResolvedValueOnce(jsonResponse(204, undefined));

    await expect(customFetch('/imports/x')).resolves.toBeUndefined();
  });
});
