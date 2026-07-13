import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import { Stack, type StackProps, Duration, RemovalPolicy, CfnOutput } from 'aws-cdk-lib';
import type { ITable } from 'aws-cdk-lib/aws-dynamodb';
import { Architecture, Runtime } from 'aws-cdk-lib/aws-lambda';
import { NodejsFunction, OutputFormat } from 'aws-cdk-lib/aws-lambda-nodejs';
import { LogGroup, RetentionDays } from 'aws-cdk-lib/aws-logs';
import type { IBucket } from 'aws-cdk-lib/aws-s3';
import type { ISecret } from 'aws-cdk-lib/aws-secretsmanager';
import { CorsHttpMethod, HttpApi, HttpMethod } from 'aws-cdk-lib/aws-apigatewayv2';
import { HttpLambdaIntegration } from 'aws-cdk-lib/aws-apigatewayv2-integrations';
import { Rule } from 'aws-cdk-lib/aws-events';
import { LambdaFunction } from 'aws-cdk-lib/aws-events-targets';
import type { Construct } from 'constructs';

const currentDir = dirname(fileURLToPath(import.meta.url));
const repoRoot = join(currentDir, '..', '..');
const apiEntry = join(repoRoot, 'apps', 'api', 'src', 'lambda.ts');
const importProcessorEntry = join(repoRoot, 'apps', 'api', 'src', 'import-processor.ts');
const lockfile = join(repoRoot, 'pnpm-lock.yaml');

export interface ApiStackProps extends StackProps {
  /** DynamoDB single table the handlers read and write. */
  readonly table: ITable;
  /** Private bucket the API mints presigned CRM upload URLs against. */
  readonly importBucket: IBucket;
  /** Secret holding the Gemini API key granted to the Lambda at runtime. */
  readonly geminiApiKey: ISecret;
}

/**
 * Serverless HTTP API: a bundled Node.js Lambda behind an API Gateway HTTP API.
 * The Lambda routes every `/api/*` request internally (see `apps/api`), reads
 * and writes the shared DynamoDB table, and is granted read access to the
 * Gemini secret for AI interpretation.
 */
export class ApiStack extends Stack {
  public readonly httpApi: HttpApi;
  public readonly handler: NodejsFunction;
  public readonly importProcessor: NodejsFunction;

  constructor(scope: Construct, id: string, props: ApiStackProps) {
    super(scope, id, props);

    const logGroup = new LogGroup(this, 'ApiHandlerLogs', {
      retention: RetentionDays.ONE_MONTH,
      removalPolicy: RemovalPolicy.DESTROY,
    });

    this.handler = new NodejsFunction(this, 'ApiHandler', {
      functionName: 'cloud-gtm-api',
      entry: apiEntry,
      handler: 'handler',
      runtime: Runtime.NODEJS_22_X,
      architecture: Architecture.ARM_64,
      memorySize: 256,
      timeout: Duration.seconds(10),
      logGroup,
      environment: {
        TABLE_NAME: props.table.tableName,
        IMPORT_BUCKET_NAME: props.importBucket.bucketName,
        GEMINI_SECRET_ARN: props.geminiApiKey.secretArn,
        NODE_OPTIONS: '--enable-source-maps',
      },
      bundling: {
        format: OutputFormat.ESM,
        minify: true,
        sourceMap: true,
        target: 'node22',
      },
      depsLockFilePath: lockfile,
      projectRoot: repoRoot,
    });

    props.table.grantReadWriteData(this.handler);
    // The handler only signs uploads; it never reads or deletes objects.
    props.importBucket.grantPut(this.handler);
    props.geminiApiKey.grantRead(this.handler);

    const importProcessorLogGroup = new LogGroup(this, 'ImportProcessorLogs', {
      retention: RetentionDays.ONE_MONTH,
      removalPolicy: RemovalPolicy.DESTROY,
    });

    this.importProcessor = new NodejsFunction(this, 'ImportProcessor', {
      functionName: 'cloud-gtm-import-processor',
      entry: importProcessorEntry,
      handler: 'handler',
      runtime: Runtime.NODEJS_22_X,
      architecture: Architecture.ARM_64,
      memorySize: 512,
      timeout: Duration.minutes(1),
      logGroup: importProcessorLogGroup,
      environment: {
        TABLE_NAME: props.table.tableName,
        IMPORT_BUCKET_NAME: props.importBucket.bucketName,
        GEMINI_SECRET_ARN: props.geminiApiKey.secretArn,
        NODE_OPTIONS: '--enable-source-maps',
      },
      bundling: {
        format: OutputFormat.ESM,
        minify: true,
        sourceMap: true,
        target: 'node22',
      },
      depsLockFilePath: lockfile,
      projectRoot: repoRoot,
    });

    props.table.grantReadWriteData(this.importProcessor);
    props.importBucket.grantRead(this.importProcessor);

    new Rule(this, 'ImportUploadedRule', {
      description: 'Process CRM CSV uploads when the import bucket receives a new object.',
      eventPattern: {
        source: ['aws.s3'],
        detailType: ['Object Created'],
        detail: {
          bucket: { name: [props.importBucket.bucketName] },
          object: { key: [{ prefix: 'imports/' }] },
          reason: ['PutObject'],
        },
      },
      targets: [new LambdaFunction(this.importProcessor)],
    });

    const integration = new HttpLambdaIntegration('ApiIntegration', this.handler);

    this.httpApi = new HttpApi(this, 'HttpApi', {
      apiName: 'cloud-gtm-api',
      description: 'Cloud GTM Intelligence Platform HTTP API.',
      corsPreflight: {
        allowOrigins: ['*'],
        allowMethods: [CorsHttpMethod.GET, CorsHttpMethod.POST, CorsHttpMethod.OPTIONS],
        allowHeaders: ['content-type', 'authorization'],
        maxAge: Duration.hours(1),
      },
    });

    this.httpApi.addRoutes({
      path: '/api/{proxy+}',
      methods: [HttpMethod.ANY],
      integration,
    });

    new CfnOutput(this, 'ApiEndpoint', {
      value: this.httpApi.apiEndpoint,
      description: 'Base URL of the HTTP API.',
    });
  }
}
