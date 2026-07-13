import { useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { Link as RouterLink, useParams } from 'react-router-dom';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import BusinessIcon from '@mui/icons-material/BusinessOutlined';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import Chip from '@mui/material/Chip';
import Divider from '@mui/material/Divider';
import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';
import { DataGrid, type GridColDef } from '@mui/x-data-grid';
import { useGetImportsImportId } from '@cloud-gtm/api-client';
import type { ImportError, ImportStatus } from '@cloud-gtm/contracts';
import { TERMINAL_IMPORT_STATUSES } from '@cloud-gtm/contracts';
import { ErrorState } from '../components/ErrorState';
import { LoadingState } from '../components/LoadingState';
import { toSupportedLocale } from '../i18n';
import { formatDate, formatDuration, formatNumber } from '../i18n/formatters';

function statusColor(status: ImportStatus): 'default' | 'info' | 'success' | 'warning' | 'error' {
  if (status === 'COMPLETED') return 'success';
  if (status === 'PARTIALLY_COMPLETED') return 'warning';
  if (status === 'FAILED') return 'error';
  if (status === 'PROCESSING' || status === 'UPLOADING') return 'info';
  return 'default';
}

function Metric({ label, value }: { label: string; value: string }) {
  return (
    <Box>
      <Typography variant="caption" color="text.secondary" textTransform="uppercase">
        {label}
      </Typography>
      <Typography variant="h6" fontWeight={700}>
        {value}
      </Typography>
    </Box>
  );
}

export function ImportDetailPage() {
  const { t, i18n } = useTranslation(['imports', 'common']);
  const locale = toSupportedLocale(i18n.language);
  const { importId = '' } = useParams();
  const { data, isLoading, isError, refetch } = useGetImportsImportId(importId, {
    query: {
      refetchInterval: (query) => {
        const status = query.state.data?.status;
        return status && !TERMINAL_IMPORT_STATUSES.includes(status) ? 3000 : false;
      },
    },
  });

  const columns = useMemo<GridColDef<ImportError & { id: number }>[]>(
    () => [
      {
        field: 'rowNumber',
        headerName: t('detail.errors.columns.row'),
        type: 'number',
        width: 110,
      },
      {
        field: 'field',
        headerName: t('detail.errors.columns.field'),
        minWidth: 150,
        valueFormatter: (value?: string) => value ?? '—',
      },
      {
        field: 'rawValue',
        headerName: t('detail.errors.columns.rawValue'),
        minWidth: 180,
        flex: 0.7,
        valueFormatter: (value?: string) => value ?? '—',
      },
      {
        field: 'message',
        headerName: t('detail.errors.columns.message'),
        minWidth: 260,
        flex: 1,
      },
    ],
    [t],
  );

  if (isLoading) return <LoadingState />;

  if (isError || !data) {
    return (
      <Box>
        <Button component={RouterLink} to="/imports" startIcon={<ArrowBackIcon />} sx={{ mb: 2 }}>
          {t('detail.back')}
        </Button>
        <ErrorState onRetry={() => void refetch()} />
      </Box>
    );
  }

  const rows = data.errors.map((error) => ({ ...error, id: error.rowNumber }));

  return (
    <Box>
      <Button component={RouterLink} to="/imports" startIcon={<ArrowBackIcon />} sx={{ mb: 2 }}>
        {t('detail.back')}
      </Button>

      <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2} alignItems={{ sm: 'center' }}>
        <Box sx={{ flex: 1, minWidth: 0 }}>
          <Typography variant="h4" component="h1" fontWeight={700} gutterBottom>
            {data.filename}
          </Typography>
          <Typography variant="body2" color="text.secondary">
            {data.id}
          </Typography>
        </Box>
        <Chip color={statusColor(data.status)} label={t(`status.${data.status}`)} />
      </Stack>

      <Box
        sx={{
          display: 'grid',
          gridTemplateColumns: { xs: 'repeat(2, 1fr)', md: 'repeat(4, 1fr)' },
          gap: 2,
          my: 3,
        }}
      >
        <Metric
          label={t('detail.metrics.totalRows')}
          value={formatNumber(data.totalRows, locale)}
        />
        <Metric
          label={t('detail.metrics.successfulRows')}
          value={formatNumber(data.successfulRows, locale)}
        />
        <Metric
          label={t('detail.metrics.failedRows')}
          value={formatNumber(data.failedRows, locale)}
        />
        <Metric
          label={t('detail.metrics.duration')}
          value={data.durationMs === undefined ? '—' : formatDuration(data.durationMs, locale)}
        />
      </Box>

      <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1.5} sx={{ mb: 3 }}>
        <Button
          component={RouterLink}
          to={`/accounts?importId=${encodeURIComponent(data.id)}`}
          variant="outlined"
          startIcon={<BusinessIcon />}
        >
          {t('detail.viewAccounts')}
        </Button>
        <Typography variant="body2" color="text.secondary" sx={{ alignSelf: 'center' }}>
          {t('detail.uploadedMeta', {
            date: formatDate(data.uploadedAt, locale),
            user: data.uploadedBy,
          })}
        </Typography>
      </Stack>

      <Divider sx={{ mb: 3 }} />

      <Typography variant="h5" component="h2" fontWeight={700} gutterBottom>
        {t('detail.errors.title')}
      </Typography>
      <DataGrid
        rows={rows}
        columns={columns}
        pageSizeOptions={[10, 25, 50]}
        initialState={{ pagination: { paginationModel: { pageSize: 10 } } }}
        disableRowSelectionOnClick
        autoHeight
        localeText={{ noRowsLabel: t('detail.errors.empty') }}
        aria-label={t('detail.errors.ariaLabel')}
        sx={{
          bgcolor: 'background.paper',
          '& .MuiDataGrid-columnHeaders': { bgcolor: 'action.hover' },
          '& .MuiDataGrid-cell:focus, & .MuiDataGrid-columnHeader:focus': { outline: 'none' },
        }}
      />
    </Box>
  );
}
