import { describe, expect, it } from 'vitest';
import type { CreateImportRequest, CreateImportResponse } from '@cloud-gtm/contracts';
import { MAX_IMPORT_BYTES } from '@cloud-gtm/contracts';
import { createHandler } from '../lambda';
import { DEFAULT_WORKSPACE_ID } from '../config';
import { buildTestDeps, parseResult, postEvent } from '../test-support';

const validRequest: CreateImportRequest = {
  filename: 'crm-export.csv',
  contentType: 'text/csv',
  sizeBytes: 2048,
};

function harness() {
  const { deps, repositories, uploads } = buildTestDeps();
  return { handler: createHandler(deps), repositories, uploads };
}

describe('POST /imports', () => {
  it('records a PENDING import and returns a presigned upload target', async () => {
    const { handler, repositories, uploads } = harness();

    const { statusCode, body } = parseResult(
      await handler(postEvent('/api/imports', validRequest)),
    );

    expect(statusCode).toBe(201);
    const response = body as CreateImportResponse;
    expect(response.importId).toMatch(/^imp_/);
    expect(response.s3Key).toBe(`imports/${DEFAULT_WORKSPACE_ID}/${response.importId}.csv`);
    expect(response.expiresInSeconds).toBeGreaterThan(0);
    expect(response.uploadUrl).toContain(response.s3Key);

    const stored = await repositories.imports.get(DEFAULT_WORKSPACE_ID, response.importId);
    expect(stored).toMatchObject({
      id: response.importId,
      filename: 'crm-export.csv',
      status: 'PENDING',
      totalRows: 0,
      successfulRows: 0,
      failedRows: 0,
    });

    expect(uploads.requests).toHaveLength(1);
    expect(uploads.requests[0]).toMatchObject({
      bucket: 'test-import-bucket',
      key: response.s3Key,
      contentType: 'text/csv',
    });
  });

  it('rejects a missing filename before creating anything', async () => {
    const { handler, repositories, uploads } = harness();
    const { filename: _filename, ...withoutFilename } = validRequest;

    const { statusCode, body } = parseResult(
      await handler(postEvent('/api/imports', withoutFilename)),
    );

    expect(statusCode).toBe(400);
    expect(body).toMatchObject({ code: 'VALIDATION_ERROR' });
    expect((body as { details: unknown[] }).details.length).toBeGreaterThan(0);
    expect(uploads.requests).toHaveLength(0);
    expect(await repositories.imports.list(DEFAULT_WORKSPACE_ID)).toHaveLength(0);
  });

  it('rejects a non-CSV content type', async () => {
    const { handler } = harness();
    const { statusCode, body } = parseResult(
      await handler(postEvent('/api/imports', { ...validRequest, contentType: 'application/pdf' })),
    );
    expect(statusCode).toBe(400);
    expect(body).toMatchObject({ code: 'VALIDATION_ERROR' });
  });

  it('rejects a file larger than the import size limit', async () => {
    const { handler, uploads } = harness();
    const { statusCode } = parseResult(
      await handler(
        postEvent('/api/imports', { ...validRequest, sizeBytes: MAX_IMPORT_BYTES + 1 }),
      ),
    );
    expect(statusCode).toBe(400);
    expect(uploads.requests).toHaveLength(0);
  });

  it('rejects a malformed JSON body', async () => {
    const { handler } = harness();
    const { statusCode, body } = parseResult(
      await handler(postEvent('/api/imports', '{ not json')),
    );
    expect(statusCode).toBe(400);
    expect(body).toMatchObject({ code: 'VALIDATION_ERROR' });
  });
});
