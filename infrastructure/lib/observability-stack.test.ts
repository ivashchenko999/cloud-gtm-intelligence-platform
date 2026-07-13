import { describe, it } from 'vitest';
import { App, Stack } from 'aws-cdk-lib';
import { Template } from 'aws-cdk-lib/assertions';
import { HttpApi } from 'aws-cdk-lib/aws-apigatewayv2';
import { Code, Function as LambdaFunction, Runtime } from 'aws-cdk-lib/aws-lambda';
import { ObservabilityStack } from './observability-stack';

function synth() {
  const app = new App();
  const host = new Stack(app, 'Host');
  const httpApi = new HttpApi(host, 'Api');
  const handler = new LambdaFunction(host, 'Fn', {
    runtime: Runtime.NODEJS_22_X,
    handler: 'index.handler',
    code: Code.fromInline('exports.handler = () => {};'),
  });
  const stack = new ObservabilityStack(app, 'Observability', { handler, httpApi });
  return Template.fromStack(stack);
}

describe('ObservabilityStack', () => {
  it('creates a dashboard', () => {
    const template = synth();
    template.resourceCountIs('AWS::CloudWatch::Dashboard', 1);
  });

  it('alarms on Lambda errors, throttles and API 5xx', () => {
    const template = synth();
    template.resourceCountIs('AWS::CloudWatch::Alarm', 3);
    template.hasResourceProperties('AWS::CloudWatch::Alarm', {
      AlarmName: 'cloud-gtm-api-5xx',
      ComparisonOperator: 'GreaterThanOrEqualToThreshold',
      TreatMissingData: 'notBreaching',
    });
    template.hasResourceProperties('AWS::CloudWatch::Alarm', {
      AlarmName: 'cloud-gtm-api-lambda-errors',
      Namespace: 'AWS/Lambda',
      MetricName: 'Errors',
    });
  });
});
