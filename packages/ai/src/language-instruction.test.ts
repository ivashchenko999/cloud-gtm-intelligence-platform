import { describe, expect, it } from 'vitest';
import { languageInstruction } from './index';

describe('languageInstruction', () => {
  it('adds a French instruction for fr-CA', () => {
    const instruction = languageInstruction('fr-CA');
    expect(instruction).toContain('Canadian French');
    expect(instruction).toContain('Do not translate company names');
  });

  it('adds an English instruction for en-CA', () => {
    expect(languageInstruction('en-CA')).toContain('Canadian English');
  });
});
