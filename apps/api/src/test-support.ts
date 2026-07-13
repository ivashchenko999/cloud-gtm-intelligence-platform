import type { APIGatewayProxyEventV2, APIGatewayProxyResultV2 } from 'aws-lambda';
import type { AccountResponse } from '@cloud-gtm/contracts';
import { createRepositories, InMemoryTableGateway, type Repositories } from '@cloud-gtm/database';
import { DEFAULT_WORKSPACE_ID } from './config';
import { createHandler } from './lambda';
import type { HandlerDeps } from './http/router';
import type { UploadSigner, UploadTarget, UploadUrlRequest } from './storage/uploads';

const TEST_IMPORT_BUCKET = 'test-import-bucket';

/** Records every presign request and returns a deterministic URL for assertions. */
export class FakeUploadSigner implements UploadSigner {
  readonly requests: UploadUrlRequest[] = [];

  createUploadUrl(request: UploadUrlRequest): Promise<UploadTarget> {
    this.requests.push(request);
    const url = `https://s3.test.local/${request.bucket}/${request.key}?signature=fake`;
    return Promise.resolve({ url, expiresInSeconds: request.expiresInSeconds });
  }
}

interface TestSeed {
  accounts?: AccountResponse[];
}

/**
 * Builds handler dependencies over an in-memory table and a fake upload signer,
 * returning the collaborators so tests can assert on persisted state and presign
 * calls. {@link createTestHandler} wraps this for the read-only handler tests.
 */
export function buildTestDeps(seed: TestSeed = {}): {
  deps: HandlerDeps;
  repositories: Repositories;
  uploads: FakeUploadSigner;
} {
  const repositories = createRepositories(new InMemoryTableGateway());
  for (const account of seed.accounts ?? []) {
    void repositories.accounts.save({ ...account, workspaceId: DEFAULT_WORKSPACE_ID });
  }
  const uploads = new FakeUploadSigner();
  const deps: HandlerDeps = {
    repositories,
    uploads,
    config: {
      tableName: 'test-table',
      geminiSecretArn: 'arn:test',
      importBucket: TEST_IMPORT_BUCKET,
      workspaceId: DEFAULT_WORKSPACE_ID,
    },
  };
  return { deps, repositories, uploads };
}

/**
 * Test harness: wires the real route table to an in-memory table so handlers
 * exercise their repositories end to end without a live DynamoDB. Shared by the
 * handler integration tests.
 */
export function createTestHandler(
  seed: TestSeed = {},
): (event: APIGatewayProxyEventV2) => Promise<APIGatewayProxyResultV2> {
  return createHandler(buildTestDeps(seed).deps);
}

/** Builds an API Gateway v2 GET event with optional query parameters. */
export function getEvent(
  path: string,
  queryStringParameters?: Record<string, string>,
): APIGatewayProxyEventV2 {
  return {
    version: '2.0',
    routeKey: `GET ${path}`,
    rawPath: path,
    rawQueryString: '',
    ...(queryStringParameters && { queryStringParameters }),
    headers: {},
    requestContext: {
      requestId: 'test-request',
      http: { method: 'GET', path, protocol: 'HTTP/1.1', sourceIp: '127.0.0.1', userAgent: 'test' },
    },
    isBase64Encoded: false,
  } as unknown as APIGatewayProxyEventV2;
}

/** Builds an API Gateway v2 POST event carrying a JSON body (or a raw string). */
export function postEvent(path: string, body?: unknown): APIGatewayProxyEventV2 {
  const rawBody =
    typeof body === 'string' ? body : body === undefined ? undefined : JSON.stringify(body);
  return {
    version: '2.0',
    routeKey: `POST ${path}`,
    rawPath: path,
    rawQueryString: '',
    headers: { 'content-type': 'application/json' },
    ...(rawBody !== undefined && { body: rawBody }),
    requestContext: {
      requestId: 'test-request',
      http: {
        method: 'POST',
        path,
        protocol: 'HTTP/1.1',
        sourceIp: '127.0.0.1',
        userAgent: 'test',
      },
    },
    isBase64Encoded: false,
  } as unknown as APIGatewayProxyEventV2;
}

/** Parses a handler result into its status code and decoded JSON body. */
export function parseResult(result: APIGatewayProxyResultV2): {
  statusCode: number;
  body: unknown;
} {
  const typed = result as { statusCode: number; body: string };
  return { statusCode: typed.statusCode, body: JSON.parse(typed.body) };
}

let sequence = 0;

/** A fully-populated account DTO with overridable fields for test scenarios. */
export function buildAccount(overrides: Partial<AccountResponse> = {}): AccountResponse {
  sequence += 1;
  const id = overrides.id ?? `acc-${sequence.toString().padStart(3, '0')}`;
  return {
    id,
    name: `Account ${id}`,
    domain: `${id}.example.com`,
    industry: 'Software',
    employeeCount: 500,
    annualRevenue: 10_000_000,
    primaryCloud: 'AWS',
    estimatedCloudSpend: 100_000,
    existingProducts: [],
    marketplaceActivity: 'MEDIUM',
    marketplaceTransactions: 0,
    purchaseIntentScore: 50,
    scoreLevel: 'MEDIUM',
    scoreVersion: 'rules-v1',
    scoreFactors: [],
    createdAt: '2026-01-01T00:00:00.000Z',
    updatedAt: '2026-01-01T00:00:00.000Z',
    ...overrides,
  };
}
