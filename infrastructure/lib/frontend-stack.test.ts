import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import { describe, it } from 'vitest';
import { App, Stack } from 'aws-cdk-lib';
import { Match, Template } from 'aws-cdk-lib/assertions';
import { HttpApi } from 'aws-cdk-lib/aws-apigatewayv2';
import { FrontendStack } from './frontend-stack';

const webDistPath = join(
  dirname(fileURLToPath(import.meta.url)),
  '..',
  'test',
  'fixtures',
  'web-dist',
);

function synth() {
  const app = new App();
  const apiHost = new Stack(app, 'ApiHost');
  const httpApi = new HttpApi(apiHost, 'Api');
  const stack = new FrontendStack(app, 'Frontend', { httpApi, webDistPath });
  return Template.fromStack(stack);
}

describe('FrontendStack', () => {
  it('creates a private, encrypted site bucket', () => {
    const template = synth();

    template.resourceCountIs('AWS::S3::Bucket', 1);
    template.hasResourceProperties('AWS::S3::Bucket', {
      PublicAccessBlockConfiguration: {
        BlockPublicAcls: true,
        BlockPublicPolicy: true,
        IgnorePublicAcls: true,
        RestrictPublicBuckets: true,
      },
    });
  });

  it('serves the SPA through CloudFront with API proxying and deep-link fallback', () => {
    const template = synth();

    template.resourceCountIs('AWS::CloudFront::Distribution', 1);
    template.hasResourceProperties('AWS::CloudFront::Distribution', {
      DistributionConfig: Match.objectLike({
        DefaultRootObject: 'index.html',
        CacheBehaviors: Match.arrayWith([Match.objectLike({ PathPattern: '/api/*' })]),
        CustomErrorResponses: Match.arrayWith([
          Match.objectLike({ ErrorCode: 403, ResponseCode: 200, ResponsePagePath: '/index.html' }),
          Match.objectLike({ ErrorCode: 404, ResponseCode: 200, ResponsePagePath: '/index.html' }),
        ]),
      }),
    });
  });

  it('deploys the built assets into the bucket', () => {
    const template = synth();
    template.resourceCountIs('Custom::CDKBucketDeployment', 1);
  });
});
