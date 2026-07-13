import { describe, expect, it } from 'vitest';
import { DEFAULT_WORKSPACE_ID, readConfig } from './config';

describe('readConfig', () => {
  it('reads table name, secret ARN, and workspace from the environment', () => {
    const config = readConfig({
      TABLE_NAME: 'T',
      GEMINI_SECRET_ARN: 'arn:secret',
      DEFAULT_WORKSPACE_ID: 'w',
    });
    expect(config).toEqual({ tableName: 'T', geminiSecretArn: 'arn:secret', workspaceId: 'w' });
  });

  it('falls back to empty strings and the default workspace when unset', () => {
    expect(readConfig({})).toEqual({
      tableName: '',
      geminiSecretArn: '',
      workspaceId: DEFAULT_WORKSPACE_ID,
    });
  });
});
