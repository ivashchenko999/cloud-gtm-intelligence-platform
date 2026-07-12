import { useTranslation } from 'react-i18next';
import { PagePlaceholder } from '../components/PagePlaceholder';

export function DashboardPage() {
  const { t } = useTranslation('dashboard');
  return <PagePlaceholder title={t('title')} subtitle={t('subtitle')} />;
}
