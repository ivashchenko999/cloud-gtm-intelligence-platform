import { describe, expect, it } from 'vitest';
import { App } from 'aws-cdk-lib';
import { Match, Template } from 'aws-cdk-lib/assertions';
import { DataStack } from './data-stack';
import { SecretsStack } from './secrets-stack';
import { ApiStack } from './api-stack';

function synth() {
  const app = new App();
  const data = new DataStack(app, 'Data');
  const secrets = new SecretsStack(app, 'Secrets');
  const api = new ApiStack(app, 'Api', {
    table: data.table,
    importBucket: data.importBucket,
    geminiApiKey: secrets.geminiApiKey,
  });
  return Template.fromStack(api);
}

describe('ApiStack', () => {
  it('provisions a single Node.js 22 ARM Lambda with the table + secret wired in', () => {
    const template = synth();

    template.resourceCountIs('AWS::Lambda::Function', 1);
    template.hasResourceProperties('AWS::Lambda::Function', {
      Runtime: 'nodejs22.x',
      Architectures: ['arm64'],
      Environment: {
        Variables: Match.objectLike({
          TABLE_NAME: Match.anyValue(),
          IMPORT_BUCKET_NAME: Match.anyValue(),
          GEMINI_SECRET_ARN: Match.anyValue(),
        }),
      },
    });
  });

  it('exposes an HTTP API with a catch-all /api route', () => {
    const template = synth();

    template.resourceCountIs('AWS::ApiGatewayV2::Api', 1);
    template.hasResourceProperties('AWS::ApiGatewayV2::Route', {
      RouteKey: 'ANY /api/{proxy+}',
    });
  });

  it('grants the Lambda permission to put objects in the import bucket', () => {
    const template = synth();

    template.hasResourceProperties('AWS::IAM::Policy', {
      PolicyDocument: {
        Statement: Match.arrayWith([
          Match.objectLike({
            Action: Match.arrayWith(['s3:PutObject']),
          }),
        ]),
      },
    });
  });

  it('grants the Lambda read access to the Gemini secret', () => {
    const template = synth();

    template.hasResourceProperties('AWS::IAM::Policy', {
      PolicyDocument: {
        Statement: Match.arrayWith([
          Match.objectLike({
            Action: Match.arrayWith(['secretsmanager:GetSecretValue']),
          }),
        ]),
      },
    });
  });

  it('exposes the HTTP API construct to dependent stacks', () => {
    const app = new App();
    const data = new DataStack(app, 'Data');
    const secrets = new SecretsStack(app, 'Secrets');
    const api = new ApiStack(app, 'Api', {
      table: data.table,
      importBucket: data.importBucket,
      geminiApiKey: secrets.geminiApiKey,
    });
    expect(api.httpApi.apiEndpoint).toBeDefined();
    expect(api.handler.functionArn).toBeDefined();
  });
});
