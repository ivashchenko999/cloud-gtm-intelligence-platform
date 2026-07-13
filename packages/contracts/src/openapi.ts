import { OpenAPIRegistry, OpenApiGeneratorV3 } from '@asteasolutions/zod-to-openapi';
import { z } from './zod';
import {
  AccountResponseSchema,
  AccountScoreSchema,
  AccountSummarySchema,
  ListAccountsQuerySchema,
  ListAccountsResponseSchema,
  ScoreFactorSchema,
} from './account';
import {
  ApiErrorCodeSchema,
  ErrorDetailSchema,
  ErrorResponseSchema,
  PaginationMetaSchema,
  SortOrderSchema,
} from './common';
import {
  CloudProviderSchema,
  ImportStatusSchema,
  InsightTypeSchema,
  MarketplaceActivitySchema,
  ScoreLevelSchema,
  ScoreVersionSchema,
  SupportedLocaleSchema,
} from './enums';
import {
  CloudOpportunitiesSchema,
  DashboardResponseSchema,
  DistributionBucketSchema,
} from './dashboard';
import {
  CreateImportRequestSchema,
  CreateImportResponseSchema,
  ImportDetailResponseSchema,
  ImportErrorSchema,
  ImportResponseSchema,
  ListImportsResponseSchema,
} from './import';
import {
  AIInsightSchema,
  ExplanationInsightSchema,
  InsightContentSchema,
  InsightRequestSchema,
  NextActionInsightSchema,
  OutreachInsightSchema,
} from './insight';
import { ResetWorkspaceRequestSchema, ResetWorkspaceResponseSchema } from './settings';

/** Shared enums registered once so every usage becomes a single `$ref`. */
const NAMED_ENUMS = {
  CloudProvider: CloudProviderSchema,
  ScoreLevel: ScoreLevelSchema,
  MarketplaceActivity: MarketplaceActivitySchema,
  ImportStatus: ImportStatusSchema,
  SupportedLocale: SupportedLocaleSchema,
  ScoreVersion: ScoreVersionSchema,
  InsightType: InsightTypeSchema,
  ApiErrorCode: ApiErrorCodeSchema,
  SortOrder: SortOrderSchema,
} as const;

/** Reusable named components — registered so Orval emits clean, deduped types. */
const NAMED_SCHEMAS = {
  ScoreFactor: ScoreFactorSchema,
  AccountScore: AccountScoreSchema,
  AccountSummary: AccountSummarySchema,
  Account: AccountResponseSchema,
  ListAccountsResponse: ListAccountsResponseSchema,
  PaginationMeta: PaginationMetaSchema,
  DistributionBucket: DistributionBucketSchema,
  CloudOpportunities: CloudOpportunitiesSchema,
  DashboardResponse: DashboardResponseSchema,
  ImportError: ImportErrorSchema,
  Import: ImportResponseSchema,
  ImportDetail: ImportDetailResponseSchema,
  ListImportsResponse: ListImportsResponseSchema,
  CreateImportRequest: CreateImportRequestSchema,
  CreateImportResponse: CreateImportResponseSchema,
  InsightRequest: InsightRequestSchema,
  ExplanationInsight: ExplanationInsightSchema,
  NextActionInsight: NextActionInsightSchema,
  OutreachInsight: OutreachInsightSchema,
  InsightContent: InsightContentSchema,
  AIInsight: AIInsightSchema,
  ResetWorkspaceRequest: ResetWorkspaceRequestSchema,
  ResetWorkspaceResponse: ResetWorkspaceResponseSchema,
  ErrorDetail: ErrorDetailSchema,
  ErrorResponse: ErrorResponseSchema,
} as const;

const HealthResponseSchema = z
  .object({
    status: z.literal('ok'),
    service: z.string(),
    timestamp: z.string().datetime(),
  })
  .openapi('HealthResponse');

/** A `$ref`-addressable `ErrorResponse` reused by every error status. */
function errorResponse(description: string) {
  return {
    description,
    content: { 'application/json': { schema: ErrorResponseSchema } },
  };
}

function jsonBody<T extends z.ZodTypeAny>(schema: T, description = 'Success') {
  return {
    description,
    content: { 'application/json': { schema } },
  };
}

/**
 * Registers every schema and path so the OpenAPI document is generated straight
 * from the Zod contracts — no hand-written spec to drift out of sync.
 */
function buildRegistry(): OpenAPIRegistry {
  const registry = new OpenAPIRegistry();

  for (const [name, schema] of Object.entries({ ...NAMED_ENUMS, ...NAMED_SCHEMAS })) {
    registry.register(name, schema);
  }

  const accountId = registry.registerParameter(
    'accountId',
    z.string().openapi({ param: { name: 'accountId', in: 'path' }, example: 'acc_123' }),
  );
  const importId = registry.registerParameter(
    'importId',
    z.string().openapi({ param: { name: 'importId', in: 'path' }, example: 'imp_123' }),
  );

  registry.registerPath({
    method: 'get',
    path: '/health',
    summary: 'Liveness probe',
    responses: { 200: jsonBody(HealthResponseSchema, 'Service is healthy') },
  });

  registry.registerPath({
    method: 'get',
    path: '/dashboard',
    summary: 'Aggregated GTM dashboard metrics',
    responses: { 200: jsonBody(DashboardResponseSchema, 'Dashboard summary') },
  });

  registry.registerPath({
    method: 'get',
    path: '/accounts',
    summary: 'List and filter accounts',
    request: { query: ListAccountsQuerySchema },
    responses: {
      200: jsonBody(ListAccountsResponseSchema, 'Paginated accounts'),
      400: errorResponse('Invalid query parameters'),
    },
  });

  registry.registerPath({
    method: 'get',
    path: '/accounts/{accountId}',
    summary: 'Get a single account with score factors',
    request: { params: z.object({ accountId }) },
    responses: {
      200: jsonBody(AccountResponseSchema, 'Account detail'),
      404: errorResponse('Account not found'),
    },
  });

  for (const [type, path] of [
    ['explanation', '/accounts/{accountId}/insights/explanation'],
    ['next-action', '/accounts/{accountId}/insights/next-action'],
    ['outreach', '/accounts/{accountId}/insights/outreach'],
  ] as const) {
    registry.registerPath({
      method: 'post',
      path,
      summary: `Generate the ${type} AI insight`,
      request: {
        params: z.object({ accountId }),
        body: { content: { 'application/json': { schema: InsightRequestSchema } } },
      },
      responses: {
        200: jsonBody(AIInsightSchema, 'Generated insight'),
        404: errorResponse('Account not found'),
        503: errorResponse('AI provider unavailable'),
      },
    });
  }

  registry.registerPath({
    method: 'get',
    path: '/imports',
    summary: 'List import jobs',
    responses: { 200: jsonBody(ListImportsResponseSchema, 'Paginated imports') },
  });

  registry.registerPath({
    method: 'post',
    path: '/imports',
    summary: 'Start an import and get a presigned upload URL',
    request: {
      body: { content: { 'application/json': { schema: CreateImportRequestSchema } } },
    },
    responses: {
      201: jsonBody(CreateImportResponseSchema, 'Import created'),
      400: errorResponse('Invalid request body'),
    },
  });

  registry.registerPath({
    method: 'get',
    path: '/imports/{importId}',
    summary: 'Get an import with its row-level errors',
    request: { params: z.object({ importId }) },
    responses: {
      200: jsonBody(ImportDetailResponseSchema, 'Import detail'),
      404: errorResponse('Import not found'),
    },
  });

  registry.registerPath({
    method: 'post',
    path: '/settings/reset-workspace',
    summary: 'Delete demo workspace data for test resets',
    request: {
      body: { content: { 'application/json': { schema: ResetWorkspaceRequestSchema } } },
    },
    responses: {
      200: jsonBody(ResetWorkspaceResponseSchema, 'Workspace data reset summary'),
      400: errorResponse('Invalid confirmation'),
    },
  });

  return registry;
}

/** Builds the OpenAPI 3.0 document served as the single source of truth. */
export function buildOpenApiDocument() {
  const generator = new OpenApiGeneratorV3(buildRegistry().definitions);
  return generator.generateDocument({
    openapi: '3.0.3',
    info: {
      title: 'Cloud GTM Intelligence Platform API',
      version: '0.1.0',
      description: 'Generated from the shared Zod contracts in @cloud-gtm/contracts.',
    },
    servers: [{ url: '/api' }],
  });
}
