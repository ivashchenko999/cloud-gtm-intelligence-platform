import { useTranslation } from 'react-i18next';
import { PagePlaceholder } from '../components/PagePlaceholder';

export function ImportsPage() {
  const { t } = useTranslation('imports');
  return <PagePlaceholder title={t('title')} subtitle={t('subtitle')} />;
}
