import { App } from 'aws-cdk-lib';
import { DataStack } from '../lib/data-stack';
import { SecretsStack } from '../lib/secrets-stack';
import { ApiStack } from '../lib/api-stack';
import { FrontendStack } from '../lib/frontend-stack';
import { ObservabilityStack } from '../lib/observability-stack';

const app = new App();

const env = {
  ...(process.env.CDK_DEFAULT_ACCOUNT ? { account: process.env.CDK_DEFAULT_ACCOUNT } : {}),
  region: process.env.CDK_DEFAULT_REGION ?? 'ca-central-1',
};

const data = new DataStack(app, 'CloudGtmDataStack', { env });
const secrets = new SecretsStack(app, 'CloudGtmSecretsStack', { env });

const api = new ApiStack(app, 'CloudGtmApiStack', {
  env,
  table: data.table,
  geminiApiKey: secrets.geminiApiKey,
});

new FrontendStack(app, 'CloudGtmFrontendStack', {
  env,
  httpApi: api.httpApi,
});

new ObservabilityStack(app, 'CloudGtmObservabilityStack', {
  env,
  handler: api.handler,
  httpApi: api.httpApi,
});

app.synth();
