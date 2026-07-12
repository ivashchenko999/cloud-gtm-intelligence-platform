import type { SupportedLocale } from '@cloud-gtm/contracts';

export const PROMPT_VERSION = 'explanation-v1';

/**
 * Builds the locale-specific language instruction appended to Gemini prompts.
 * The full Gemini client, structured output and caching land in M7.
 */
export function languageInstruction(locale: SupportedLocale): string {
  if (locale === 'fr-CA') {
    return [
      'Respond in professional Canadian French.',
      'Use concise language suitable for a B2B sales application.',
      'Do not translate company names, product names or cloud provider names.',
    ].join(' ');
  }
  return [
    'Respond in professional Canadian English.',
    'Use concise language suitable for a B2B sales application.',
  ].join(' ');
}
