import { describe, expect, it } from 'vitest';
import { App } from 'aws-cdk-lib';
import { Template } from 'aws-cdk-lib/assertions';
import { SecretsStack } from './secrets-stack';

describe('SecretsStack', () => {
  it('creates the Gemini API key secret', () => {
    const app = new App();
    const stack = new SecretsStack(app, 'TestSecretsStack');
    const template = Template.fromStack(stack);

    template.resourceCountIs('AWS::SecretsManager::Secret', 1);
    template.hasResourceProperties('AWS::SecretsManager::Secret', {
      Name: 'cloud-gtm/gemini-api-key',
    });
  });

  it('exposes the secret so other stacks can grant access', () => {
    const app = new App();
    const stack = new SecretsStack(app, 'TestSecretsStack');
    expect(stack.geminiApiKey.secretArn).toBeDefined();
  });
});
