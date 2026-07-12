import { useTranslation } from 'react-i18next';
import { PagePlaceholder } from '../components/PagePlaceholder';

export function AccountsPage() {
  const { t } = useTranslation('accounts');
  return <PagePlaceholder title={t('title')} subtitle={t('subtitle')} />;
}
