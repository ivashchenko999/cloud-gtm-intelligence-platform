import { useParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { PagePlaceholder } from '../components/PagePlaceholder';

export function AccountDetailPage() {
  const { t } = useTranslation('accounts');
  const { accountId } = useParams();
  return (
    <PagePlaceholder title={t('detail.title')} subtitle={t('detail.subtitle', { id: accountId })} />
  );
}
