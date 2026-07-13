import { Stack, type StackProps, Duration, RemovalPolicy } from 'aws-cdk-lib';
import { AttributeType, BillingMode, Table } from 'aws-cdk-lib/aws-dynamodb';
import {
  BlockPublicAccess,
  Bucket,
  BucketEncryption,
  HttpMethods,
  ObjectOwnership,
} from 'aws-cdk-lib/aws-s3';
import type { Construct } from 'constructs';

/** Raw CRM uploads are transient inputs; expire them a week after landing. */
const IMPORT_RETENTION_DAYS = 7;

/**
 * Single-table-design store for the platform plus the private bucket CRM CSVs
 * are uploaded to. Global secondary indexes back the imports, score-level and
 * cloud-provider access patterns (see YUR-24).
 */
export class DataStack extends Stack {
  public readonly table: Table;
  public readonly importBucket: Bucket;

  constructor(scope: Construct, id: string, props?: StackProps) {
    super(scope, id, props);

    this.table = new Table(this, 'CloudGtmTable', {
      tableName: 'CloudGtmTable',
      partitionKey: { name: 'PK', type: AttributeType.STRING },
      sortKey: { name: 'SK', type: AttributeType.STRING },
      billingMode: BillingMode.PAY_PER_REQUEST,
      removalPolicy: RemovalPolicy.DESTROY,
    });

    for (const index of ['GSI1', 'GSI2', 'GSI3'] as const) {
      this.table.addGlobalSecondaryIndex({
        indexName: index,
        partitionKey: { name: `${index}PK`, type: AttributeType.STRING },
        sortKey: { name: `${index}SK`, type: AttributeType.STRING },
      });
    }

    this.importBucket = new Bucket(this, 'ImportBucket', {
      // No public access: the browser reaches it only via short-lived presigned
      // URLs the API mints (see YUR-27).
      blockPublicAccess: BlockPublicAccess.BLOCK_ALL,
      objectOwnership: ObjectOwnership.BUCKET_OWNER_ENFORCED,
      encryption: BucketEncryption.S3_MANAGED,
      enforceSSL: true,
      // CORS lets the SPA PUT a CSV straight to S3 from the browser.
      cors: [
        {
          allowedMethods: [HttpMethods.PUT],
          allowedOrigins: ['*'],
          allowedHeaders: ['*'],
          maxAge: 3000,
        },
      ],
      lifecycleRules: [{ expiration: Duration.days(IMPORT_RETENTION_DAYS) }],
      removalPolicy: RemovalPolicy.DESTROY,
      autoDeleteObjects: true,
    });
  }
}
