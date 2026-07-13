import { useTranslation } from 'react-i18next';
import Box from '@mui/material/Box';
import Chip from '@mui/material/Chip';
import Typography from '@mui/material/Typography';
import type { ImportResponse, ImportStatus, SupportedLocale } from '@cloud-gtm/contracts';
import { formatDate, formatDuration, formatNumber } from '../../i18n/formatters';
import { ChartCard } from './ChartCard';

const statusColor: Record<ImportStatus, 'success' | 'warning' | 'error' | 'info' | 'default'> = {
  PENDING: 'default',
  UPLOADING: 'info',
  PROCESSING: 'info',
  COMPLETED: 'success',
  PARTIALLY_COMPLETED: 'warning',
  FAILED: 'error',
};

interface LatestImportCardProps {
  latestImport: ImportResponse | null;
  locale: SupportedLocale;
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <Box>
      <Typography variant="overline" color="text.secondary" component="p">
        {label}
      </Typography>
      <Typography variant="body2" component="div">
        {children}
      </Typography>
    </Box>
  );
}

/** Summary of the most recent CRM import feeding the dashboard. */
export function LatestImportCard({ latestImport, locale }: LatestImportCardProps) {
  const { t } = useTranslation(['dashboard', 'imports']);
  const title = t('dashboard:latestImport.title');

  if (!latestImport) {
    return (
      <ChartCard title={title}>
        <Typography variant="body2" color="text.secondary">
          {t('dashboard:latestImport.empty')}
        </Typography>
      </ChartCard>
    );
  }

  return (
    <ChartCard title={title}>
      <Box
        sx={{
          display: 'grid',
          gridTemplateColumns: { xs: '1fr 1fr', sm: 'repeat(3, 1fr)' },
          gap: 2,
        }}
      >
        <Field label={t('dashboard:latestImport.filename')}>{latestImport.filename}</Field>
        <Field label={t('dashboard:latestImport.date')}>
          {formatDate(latestImport.uploadedAt, locale)}
        </Field>
        <Field label={t('dashboard:latestImport.status')}>
          <Chip
            size="small"
            color={statusColor[latestImport.status]}
            label={t(`imports:status.${latestImport.status}`)}
          />
        </Field>
        <Field label={t('dashboard:latestImport.rows')}>
          {t('dashboard:latestImport.rowsValue', {
            success: formatNumber(latestImport.successfulRows, locale),
            total: formatNumber(latestImport.totalRows, locale),
          })}
        </Field>
        <Field label={t('dashboard:latestImport.duration')}>
          {latestImport.durationMs != null ? formatDuration(latestImport.durationMs, locale) : '—'}
        </Field>
      </Box>
    </ChartCard>
  );
}
