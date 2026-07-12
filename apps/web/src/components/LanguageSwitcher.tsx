import { useTranslation } from 'react-i18next';
import ToggleButton from '@mui/material/ToggleButton';
import ToggleButtonGroup from '@mui/material/ToggleButtonGroup';
import { LANGUAGE_STORAGE_KEY, toSupportedLocale } from '../i18n';

type UiLanguage = 'en' | 'fr';

export function LanguageSwitcher() {
  const { t, i18n } = useTranslation('common');
  const current: UiLanguage = i18n.language.startsWith('fr') ? 'fr' : 'en';

  const handleChange = async (_event: React.MouseEvent<HTMLElement>, next: UiLanguage | null) => {
    if (!next || next === current) return;
    await i18n.changeLanguage(next);
    localStorage.setItem(LANGUAGE_STORAGE_KEY, next);
    document.documentElement.lang = toSupportedLocale(next);
  };

  return (
    <ToggleButtonGroup
      size="small"
      exclusive
      value={current}
      onChange={handleChange}
      aria-label={t('language.selectLanguage')}
      color="primary"
    >
      <ToggleButton value="en" aria-label={t('language.en')}>
        {t('language.en')}
      </ToggleButton>
      <ToggleButton value="fr" aria-label={t('language.fr')}>
        {t('language.fr')}
      </ToggleButton>
    </ToggleButtonGroup>
  );
}
