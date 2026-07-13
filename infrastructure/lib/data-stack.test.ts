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

  it('provisions a private import bucket with public access fully blocked', () => {
    const app = new App();
    const stack = new DataStack(app, 'TestDataStack');
    const template = Template.fromStack(stack);

    template.resourceCountIs('AWS::S3::Bucket', 1);
    template.hasResourceProperties('AWS::S3::Bucket', {
      PublicAccessBlockConfiguration: {
        BlockPublicAcls: true,
        BlockPublicPolicy: true,
        IgnorePublicAcls: true,
        RestrictPublicBuckets: true,
      },
      CorsConfiguration: {
        CorsRules: Match.arrayWith([Match.objectLike({ AllowedMethods: ['PUT'] })]),
      },
    });
    template.hasResourceProperties('Custom::S3BucketNotifications', {
      NotificationConfiguration: {
        EventBridgeConfiguration: {},
      },
    });
  });

  it('expires raw uploads and enforces TLS on the import bucket', () => {
    const app = new App();
    const stack = new DataStack(app, 'TestDataStack');
    const template = Template.fromStack(stack);

    template.hasResourceProperties('AWS::S3::Bucket', {
      LifecycleConfiguration: {
        Rules: Match.arrayWith([Match.objectLike({ Status: 'Enabled', ExpirationInDays: 7 })]),
      },
    });
    template.hasResourceProperties('AWS::S3::BucketPolicy', {
      PolicyDocument: {
        Statement: Match.arrayWith([
          Match.objectLike({
            Condition: { Bool: { 'aws:SecureTransport': 'false' } },
            Effect: 'Deny',
          }),
        ]),
      },
    });
  });
});
