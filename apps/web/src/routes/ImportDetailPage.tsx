import { useParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { PagePlaceholder } from '../components/PagePlaceholder';

export function ImportDetailPage() {
  const { t } = useTranslation('imports');
  const { importId } = useParams();
  return (
    <PagePlaceholder title={t('detail.title')} subtitle={t('detail.subtitle', { id: importId })} />
  );
}
