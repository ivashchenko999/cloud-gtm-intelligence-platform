import { createTheme } from '@mui/material/styles';
import { enUS, frFR, type Localization } from '@mui/material/locale';
import { enUS as dataGridEnUS, frFR as dataGridFrFR } from '@mui/x-data-grid/locales';
import type { SupportedLocale } from '@cloud-gtm/contracts';

const muiLocaleMap: Record<SupportedLocale, Localization> = {
  'en-CA': enUS,
  'fr-CA': frFR,
};

const dataGridLocaleMap = {
  'en-CA': dataGridEnUS,
  'fr-CA': dataGridFrFR,
} as const;

export function createAppTheme(locale: SupportedLocale) {
  return createTheme(
    {
      palette: {
        mode: 'light',
        primary: { main: '#2f6feb' },
        secondary: { main: '#f2994a' },
        background: { default: '#f6f8fb' },
      },
      shape: { borderRadius: 10 },
      typography: {
        fontFamily: '"Inter", "Roboto", "Helvetica", "Arial", sans-serif',
      },
    },
    muiLocaleMap[locale],
    dataGridLocaleMap[locale],
  );
}
