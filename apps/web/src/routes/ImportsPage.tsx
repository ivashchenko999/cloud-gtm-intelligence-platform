import { useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { Link as RouterLink } from 'react-router-dom';
import Box from '@mui/material/Box';
import Chip from '@mui/material/Chip';
import Link from '@mui/material/Link';
import Typography from '@mui/material/Typography';
import { DataGrid, type GridColDef } from '@mui/x-data-grid';
import { useGetImports } from '@cloud-gtm/api-client';
import type { Import as ApiImport } from '@cloud-gtm/api-client';
import type { ImportStatus } from '@cloud-gtm/contracts';
import { TERMINAL_IMPORT_STATUSES } from '@cloud-gtm/contracts';
import { ErrorState } from '../components/ErrorState';
import { toSupportedLocale } from '../i18n';
import { formatDate, formatDuration, formatNumber } from '../i18n/formatters';

type ImportRow = NonNullable<ApiImport>;

function isImportRow(item: ApiImport): item is ImportRow {
  return item !== null;
}

function statusColor(status: ImportStatus): 'default' | 'info' | 'success' | 'warning' | 'error' {
  if (status === 'COMPLETED') return 'success';
  if (status === 'PARTIALLY_COMPLETED') return 'warning';
  if (status === 'FAILED') return 'error';
  if (status === 'PROCESSING' || status === 'UPLOADING') return 'info';
  return 'default';
}

export function ImportsPage() {
  const { t, i18n } = useTranslation(['imports', 'common']);
  const locale = toSupportedLocale(i18n.language);
  const { data, isError, isFetching, refetch } = useGetImports({
    query: {
      refetchInterval: (query) => {
        const imports = query.state.data?.items ?? [];
        return imports
          .filter(isImportRow)
          .some((item) => !TERMINAL_IMPORT_STATUSES.includes(item.status))
          ? 3000
          : false;
      },
    },
  });

  const rows = useMemo(() => (data?.items ?? []).filter(isImportRow), [data?.items]);
  const columns = useMemo<GridColDef<ImportRow>[]>(
    () => [
      {
        field: 'filename',
        headerName: t('columns.file'),
        minWidth: 220,
        flex: 1,
        renderCell: ({ row }) => (
          <Link component={RouterLink} to={`/imports/${row.id}`} underline="hover">
            {row.filename}
          </Link>
        ),
      },
      {
        field: 'status',
        headerName: t('columns.status'),
        minWidth: 170,
        renderCell: ({ row }) => (
          <Chip size="small" color={statusColor(row.status)} label={t(`status.${row.status}`)} />
        ),
      },
      {
        field: 'uploadedAt',
        headerName: t('columns.uploadedAt'),
        minWidth: 150,
        valueFormatter: (value: string) => formatDate(value, locale),
      },
      {
        field: 'totalRows',
        headerName: t('columns.rows'),
        minWidth: 130,
        valueGetter: (_value, row) =>
          t('rowsSummary', {
            success: formatNumber(row.successfulRows, locale),
            total: formatNumber(row.totalRows, locale),
          }),
      },
      {
        field: 'failedRows',
        headerName: t('columns.errors'),
        type: 'number',
        minWidth: 110,
        valueFormatter: (value?: number) => formatNumber(value ?? 0, locale),
      },
      {
        field: 'durationMs',
        headerName: t('columns.duration'),
        minWidth: 130,
        valueFormatter: (value?: number) =>
          value === undefined ? '—' : formatDuration(value, locale),
      },
      { field: 'uploadedBy', headerName: t('columns.uploadedBy'), minWidth: 140 },
    ],
    [locale, t],
  );

  if (isError) {
    return (
      <Box>
        <Typography variant="h4" component="h1" fontWeight={700} gutterBottom>
          {t('title')}
        </Typography>
        <ErrorState onRetry={() => void refetch()} />
      </Box>
    );
  }

  return (
    <Box>
      <Box sx={{ mb: 3 }}>
        <Typography variant="h4" component="h1" fontWeight={700} gutterBottom>
          {t('title')}
        </Typography>
        <Typography variant="body1" color="text.secondary">
          {t('subtitle')}
        </Typography>
      </Box>

      <DataGrid
        rows={rows}
        columns={columns}
        loading={isFetching}
        pageSizeOptions={[10, 25, 50]}
        initialState={{ pagination: { paginationModel: { pageSize: 10 } } }}
        disableRowSelectionOnClick
        autoHeight
        localeText={{ noRowsLabel: t('empty') }}
        aria-label={t('grid.ariaLabel')}
        sx={{
          bgcolor: 'background.paper',
          '& .MuiDataGrid-columnHeaders': { bgcolor: 'action.hover' },
          '& .MuiDataGrid-cell:focus, & .MuiDataGrid-columnHeader:focus': { outline: 'none' },
        }}
      />
    </Box>
  );
}
