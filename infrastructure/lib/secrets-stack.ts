import { Stack, type StackProps, RemovalPolicy, CfnOutput } from 'aws-cdk-lib';
import { Secret } from 'aws-cdk-lib/aws-secretsmanager';
import type { Construct } from 'constructs';

/**
 * Holds application secrets that must not live in source control or CDK context.
 *
 * The Gemini API key is created as an empty placeholder — CDK provisions the
 * secret container, but the real value is written out of band (see the
 * deployment guide) so the key never touches the repo or CloudFormation state.
 */
export class SecretsStack extends Stack {
  public readonly geminiApiKey: Secret;

  constructor(scope: Construct, id: string, props?: StackProps) {
    super(scope, id, props);

    this.geminiApiKey = new Secret(this, 'GeminiApiKey', {
      secretName: 'cloud-gtm/gemini-api-key',
      description: 'Gemini API key used by the Cloud GTM API for AI interpretation.',
      removalPolicy: RemovalPolicy.DESTROY,
    });

    new CfnOutput(this, 'GeminiSecretArn', {
      value: this.geminiApiKey.secretArn,
      description: 'ARN of the Gemini API key secret.',
    });
  }
}
