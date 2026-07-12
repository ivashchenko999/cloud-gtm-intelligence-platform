import i18n from 'i18next';
import LanguageDetector from 'i18next-browser-languagedetector';
import { initReactI18next } from 'react-i18next';
import type { SupportedLocale } from '@cloud-gtm/contracts';

import commonEn from './locales/en/common.json';
import dashboardEn from './locales/en/dashboard.json';
import accountsEn from './locales/en/accounts.json';
import importsEn from './locales/en/imports.json';

import commonFr from './locales/fr/common.json';
import dashboardFr from './locales/fr/dashboard.json';
import accountsFr from './locales/fr/accounts.json';
import importsFr from './locales/fr/imports.json';

export const LANGUAGE_STORAGE_KEY = 'cloudGtmLanguage';

export const resources = {
  en: {
    common: commonEn,
    dashboard: dashboardEn,
    accounts: accountsEn,
    imports: importsEn,
  },
  fr: {
    common: commonFr,
    dashboard: dashboardFr,
    accounts: accountsFr,
    imports: importsFr,
  },
} as const;

/** Maps an i18next language code to the application's canonical locale. */
export function toSupportedLocale(language: string): SupportedLocale {
  return language.startsWith('fr') ? 'fr-CA' : 'en-CA';
}

void i18n
  .use(LanguageDetector)
  .use(initReactI18next)
  .init({
    resources,
    supportedLngs: ['en', 'fr'],
    fallbackLng: 'en',
    defaultNS: 'common',
    detection: {
      order: ['localStorage', 'navigator'],
      caches: ['localStorage'],
      lookupLocalStorage: LANGUAGE_STORAGE_KEY,
    },
    interpolation: {
      escapeValue: false,
    },
  });

export default i18n;
