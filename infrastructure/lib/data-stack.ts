import { Stack, type StackProps, RemovalPolicy } from 'aws-cdk-lib';
import { AttributeType, BillingMode, Table } from 'aws-cdk-lib/aws-dynamodb';
import type { Construct } from 'constructs';

/**
 * Single-table-design store for the platform. Global secondary indexes back the
 * imports, score-level and cloud-provider access patterns (see YUR-24).
 */
export class DataStack extends Stack {
  public readonly table: Table;

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
  }
}
