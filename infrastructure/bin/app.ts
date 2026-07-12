import { App } from 'aws-cdk-lib';
import { DataStack } from '../lib/data-stack';

const app = new App();

const env = {
  ...(process.env.CDK_DEFAULT_ACCOUNT ? { account: process.env.CDK_DEFAULT_ACCOUNT } : {}),
  region: process.env.CDK_DEFAULT_REGION ?? 'ca-central-1',
};

new DataStack(app, 'CloudGtmDataStack', { env });

app.synth();
