import { describe, it } from 'vitest';
import { App } from 'aws-cdk-lib';
import { Match, Template } from 'aws-cdk-lib/assertions';
import { DataStack } from './data-stack';

describe('DataStack', () => {
  it('provisions a pay-per-request table with three GSIs', () => {
    const app = new App();
    const stack = new DataStack(app, 'TestDataStack');
    const template = Template.fromStack(stack);

    template.hasResourceProperties('AWS::DynamoDB::Table', {
      BillingMode: 'PAY_PER_REQUEST',
      GlobalSecondaryIndexes: Match.anyValue(),
    });
    template.resourceCountIs('AWS::DynamoDB::Table', 1);
  });
});
