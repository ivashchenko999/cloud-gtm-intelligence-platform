import { useTranslation } from 'react-i18next';
import { PagePlaceholder } from '../components/PagePlaceholder';

export function SettingsPage() {
  const { t } = useTranslation('common');
  return <PagePlaceholder title={t('navigation.settings')} />;
}
