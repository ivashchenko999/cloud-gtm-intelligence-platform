import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import { DynamoDBDocumentClient } from '@aws-sdk/lib-dynamodb';
import { createRepositories, DynamoDbTableGateway, type Repositories } from '@cloud-gtm/database';

/**
 * Lazily builds the DynamoDB-backed repositories once per Lambda container and
 * caches them across warm invocations. Tests never reach this path — they build
 * repositories over an in-memory gateway and inject them directly.
 */
let cached: Repositories | undefined;

export function getRepositories(tableName: string): Repositories {
  if (!cached) {
    const client = DynamoDBDocumentClient.from(new DynamoDBClient({}), {
      marshallOptions: { removeUndefinedValues: true },
    });
    cached = createRepositories(new DynamoDbTableGateway(client, tableName));
  }
  return cached;
}
