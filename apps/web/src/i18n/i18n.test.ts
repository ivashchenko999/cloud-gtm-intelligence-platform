import { afterEach, describe, expect, it } from 'vitest';
import i18n, { LANGUAGE_STORAGE_KEY, toSupportedLocale } from './index';

afterEach(async () => {
  localStorage.clear();
  await i18n.changeLanguage('en');
});

describe('i18n configuration', () => {
  it('registers every namespace for both languages', () => {
    const namespaces = ['common', 'dashboard', 'accounts', 'imports', 'insights'] as const;
    for (const lng of ['en', 'fr'] as const) {
      for (const ns of namespaces) {
        expect(i18n.hasResourceBundle(lng, ns)).toBe(true);
      }
    }
  });

  it('detects language from localStorage before the navigator', () => {
    expect(i18n.options.detection?.order).toEqual(['localStorage', 'navigator']);
    expect(i18n.options.detection?.lookupLocalStorage).toBe(LANGUAGE_STORAGE_KEY);
  });

  it('falls back to English for unsupported languages', async () => {
    await i18n.changeLanguage('de');
    expect(i18n.t('navigation.dashboard', { ns: 'common' })).toBe('Dashboard');
  });

  it('caches the selected language to localStorage for persistence across reloads', async () => {
    await i18n.changeLanguage('fr');
    expect(localStorage.getItem(LANGUAGE_STORAGE_KEY)).toBe('fr');
  });

  it('maps i18next codes to the canonical locale', () => {
    expect(toSupportedLocale('fr')).toBe('fr-CA');
    expect(toSupportedLocale('en')).toBe('en-CA');
    expect(toSupportedLocale('de')).toBe('en-CA');
  });
});
