import { useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { Link as RouterLink, useSearchParams } from 'react-router-dom';
import ClearIcon from '@mui/icons-material/Clear';
import SearchIcon from '@mui/icons-material/Search';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import Chip from '@mui/material/Chip';
import InputAdornment from '@mui/material/InputAdornment';
import Link from '@mui/material/Link';
import MenuItem from '@mui/material/MenuItem';
import TextField from '@mui/material/TextField';
import Typography from '@mui/material/Typography';
import {
  DataGrid,
  type GridColDef,
  type GridPaginationModel,
  type GridSortModel,
} from '@mui/x-data-grid';
import { useGetAccounts } from '@cloud-gtm/api-client';
import type {
  AccountSummary,
  CloudProvider,
  MarketplaceActivity,
  ScoreLevel,
  SortOrder,
} from '@cloud-gtm/contracts';
import type { GetAccountsParams, GetAccountsSortBy } from '@cloud-gtm/api-client';
import { toSupportedLocale } from '../i18n';
import { formatCurrency, formatDate, formatNumber } from '../i18n/formatters';
import { ErrorState } from '../components/ErrorState';

const DEFAULT_PAGE = 1;
const DEFAULT_PAGE_SIZE = 25;
type AccountsParamKey = Extract<keyof GetAccountsParams, string>;

const DEFAULT_SORT_BY: GetAccountsSortBy = 'purchaseIntentScore';
const DEFAULT_SORT_ORDER: SortOrder = 'desc';
const PAGE_SIZE_OPTIONS = [10, 25, 50, 100];
const SCORE_LEVELS: ScoreLevel[] = ['HIGH', 'MEDIUM', 'LOW'];
const CLOUD_PROVIDERS: CloudProvider[] = ['AWS', 'AZURE', 'GCP', 'MULTI_CLOUD', 'UNKNOWN'];
const MARKETPLACE_ACTIVITY: MarketplaceActivity[] = ['HIGH', 'MEDIUM', 'LOW'];

function numberParam(searchParams: URLSearchParams, key: string, fallback: number): number {
  const value = Number(searchParams.get(key));
  return Number.isFinite(value) && value > 0 ? value : fallback;
}

function optionalNumberParam(searchParams: URLSearchParams, key: string): number | undefined {
  const raw = searchParams.get(key);
  if (raw == null || raw === '') return undefined;
  const value = Number(raw);
  return Number.isFinite(value) ? Math.min(Math.max(value, 0), 100) : undefined;
}

function enumParam<T extends string>(
  searchParams: URLSearchParams,
  key: string,
  allowed: readonly T[],
): T | undefined {
  const value = searchParams.get(key);
  return allowed.includes(value as T) ? (value as T) : undefined;
}

function buildParams(searchParams: URLSearchParams): GetAccountsParams {
  const page = numberParam(searchParams, 'page', DEFAULT_PAGE);
  const pageSize = PAGE_SIZE_OPTIONS.includes(
    numberParam(searchParams, 'pageSize', DEFAULT_PAGE_SIZE),
  )
    ? numberParam(searchParams, 'pageSize', DEFAULT_PAGE_SIZE)
    : DEFAULT_PAGE_SIZE;
  const sortBy =
    enumParam<GetAccountsSortBy>(searchParams, 'sortBy', [
      'name',
      'industry',
      'employeeCount',
      'estimatedCloudSpend',
      'purchaseIntentScore',
      'updatedAt',
    ]) ?? DEFAULT_SORT_BY;
  const sortOrder =
    enumParam<SortOrder>(searchParams, 'sortOrder', ['asc', 'desc']) ?? DEFAULT_SORT_ORDER;
  const search = searchParams.get('search')?.trim() || undefined;
  const industry = searchParams.get('industry')?.trim() || undefined;
  const scoreLevel = enumParam<ScoreLevel>(searchParams, 'scoreLevel', SCORE_LEVELS);
  const cloudProvider = enumParam<CloudProvider>(searchParams, 'cloudProvider', CLOUD_PROVIDERS);
  const marketplaceActivity = enumParam<MarketplaceActivity>(
    searchParams,
    'marketplaceActivity',
    MARKETPLACE_ACTIVITY,
  );
  const minScore = optionalNumberParam(searchParams, 'minScore');
  const importId = searchParams.get('importId')?.trim() || undefined;

  const params: GetAccountsParams = {
    page,
    pageSize,
    sortBy,
    sortOrder,
  };
  if (search) params.search = search;
  if (industry) params.industry = industry;
  if (scoreLevel) params.scoreLevel = scoreLevel;
  if (cloudProvider) params.cloudProvider = cloudProvider;
  if (marketplaceActivity) params.marketplaceActivity = marketplaceActivity;
  if (minScore !== undefined) params.minScore = minScore;
  if (importId) params.importId = importId;

  return params;
}

function setOrDelete(params: URLSearchParams, key: string, value: string) {
  if (value) params.set(key, value);
  else params.delete(key);
}

function scoreColor(level: ScoreLevel): 'success' | 'warning' | 'default' {
  if (level === 'HIGH') return 'success';
  if (level === 'MEDIUM') return 'warning';
  return 'default';
}

export function AccountsPage() {
  const { t, i18n } = useTranslation(['accounts', 'common']);
  const locale = toSupportedLocale(i18n.language);
  const [searchParams, setSearchParams] = useSearchParams();
  const params = useMemo(() => buildParams(searchParams), [searchParams]);
  const { data, isError, isFetching, refetch } = useGetAccounts(params, {
    query: { placeholderData: (previous) => previous },
  });

  const updateParam = (key: AccountsParamKey, value: string) => {
    setSearchParams((current) => {
      const next = new URLSearchParams(current);
      setOrDelete(next, key, value);
      next.set('page', String(DEFAULT_PAGE));
      return next;
    });
  };

  const sortModel = useMemo<GridSortModel>(
    () => [
      { field: params.sortBy ?? DEFAULT_SORT_BY, sort: params.sortOrder ?? DEFAULT_SORT_ORDER },
    ],
    [params.sortBy, params.sortOrder],
  );

  const paginationModel = useMemo<GridPaginationModel>(
    () => ({
      page: (params.page ?? DEFAULT_PAGE) - 1,
      pageSize: params.pageSize ?? DEFAULT_PAGE_SIZE,
    }),
    [params.page, params.pageSize],
  );

  const columns = useMemo<GridColDef<AccountSummary>[]>(
    () => [
      {
        field: 'name',
        headerName: t('accounts:columns.account'),
        minWidth: 180,
        flex: 1,
        renderCell: ({ row }) => (
          <Link component={RouterLink} to={`/accounts/${row.id}`} underline="hover">
            {row.name}
          </Link>
        ),
      },
      { field: 'domain', headerName: t('accounts:columns.domain'), minWidth: 160, flex: 0.8 },
      { field: 'industry', headerName: t('accounts:columns.industry'), minWidth: 140, flex: 0.7 },
      {
        field: 'employeeCount',
        headerName: t('accounts:columns.employees'),
        type: 'number',
        minWidth: 130,
        valueFormatter: (value?: number) => (value == null ? '—' : formatNumber(value, locale)),
      },
      {
        field: 'primaryCloud',
        headerName: t('accounts:columns.cloud'),
        minWidth: 140,
        valueFormatter: (value: CloudProvider) => t(`common:cloudProvider.${value}`),
      },
      {
        field: 'estimatedCloudSpend',
        headerName: t('accounts:columns.cloudSpend'),
        type: 'number',
        minWidth: 150,
        valueFormatter: (value?: number) => (value == null ? '—' : formatCurrency(value, locale)),
      },
      {
        field: 'marketplaceActivity',
        headerName: t('accounts:columns.marketplaceActivity'),
        minWidth: 190,
        valueFormatter: (value?: MarketplaceActivity) =>
          value ? t(`common:marketplaceActivity.${value}`) : '—',
      },
      {
        field: 'purchaseIntentScore',
        headerName: t('accounts:columns.purchaseIntent'),
        type: 'number',
        minWidth: 160,
        renderCell: ({ row }) => (
          <Chip
            size="small"
            color={scoreColor(row.scoreLevel)}
            label={formatNumber(row.purchaseIntentScore, locale)}
          />
        ),
      },
      {
        field: 'scoreLevel',
        headerName: t('accounts:columns.priority'),
        minWidth: 130,
        valueFormatter: (value: ScoreLevel) => t(`common:scoreLevel.${value}`),
      },
      {
        field: 'updatedAt',
        headerName: t('accounts:columns.updated'),
        minWidth: 140,
        valueFormatter: (value: string) => formatDate(value, locale),
      },
    ],
    [locale, t],
  );

  const clearFilters = () => {
    setSearchParams((current) => {
      const next = new URLSearchParams(current);
      for (const key of [
        'search',
        'scoreLevel',
        'cloudProvider',
        'industry',
        'minScore',
        'marketplaceActivity',
      ]) {
        next.delete(key);
      }
      next.set('page', String(DEFAULT_PAGE));
      return next;
    });
  };

  if (isError) {
    return (
      <Box>
        <Typography variant="h4" component="h1" fontWeight={700} gutterBottom>
          {t('accounts:title')}
        </Typography>
        <ErrorState onRetry={() => void refetch()} />
      </Box>
    );
  }

  return (
    <Box>
      <Box sx={{ mb: 3 }}>
        <Typography variant="h4" component="h1" fontWeight={700} gutterBottom>
          {t('accounts:title')}
        </Typography>
        <Typography variant="body1" color="text.secondary">
          {t('accounts:subtitle')}
        </Typography>
      </Box>

      <Box
        sx={{
          display: 'grid',
          gridTemplateColumns: { xs: '1fr', sm: 'repeat(2, 1fr)', lg: '2fr repeat(5, 1fr) auto' },
          gap: 1.5,
          alignItems: 'center',
          mb: 2,
        }}
      >
        <TextField
          label={t('accounts:filters.search')}
          placeholder={t('accounts:filters.searchPlaceholder')}
          value={params.search ?? ''}
          onChange={(event) => updateParam('search', event.target.value)}
          size="small"
          InputProps={{
            startAdornment: (
              <InputAdornment position="start">
                <SearchIcon fontSize="small" />
              </InputAdornment>
            ),
          }}
        />
        <TextField
          select
          label={t('accounts:filters.scoreLevel')}
          value={params.scoreLevel ?? ''}
          onChange={(event) => updateParam('scoreLevel', event.target.value)}
          size="small"
        >
          <MenuItem value="">{t('accounts:filters.all')}</MenuItem>
          {SCORE_LEVELS.map((level) => (
            <MenuItem key={level} value={level}>
              {t(`common:scoreLevel.${level}`)}
            </MenuItem>
          ))}
        </TextField>
        <TextField
          select
          label={t('accounts:filters.cloudProvider')}
          value={params.cloudProvider ?? ''}
          onChange={(event) => updateParam('cloudProvider', event.target.value)}
          size="small"
        >
          <MenuItem value="">{t('accounts:filters.all')}</MenuItem>
          {CLOUD_PROVIDERS.map((provider) => (
            <MenuItem key={provider} value={provider}>
              {t(`common:cloudProvider.${provider}`)}
            </MenuItem>
          ))}
        </TextField>
        <TextField
          label={t('accounts:filters.industry')}
          placeholder={t('accounts:filters.industryPlaceholder')}
          value={params.industry ?? ''}
          onChange={(event) => updateParam('industry', event.target.value)}
          size="small"
        />
        <TextField
          label={t('accounts:filters.minScore')}
          type="number"
          value={params.minScore ?? ''}
          onChange={(event) => updateParam('minScore', event.target.value)}
          size="small"
          inputProps={{ min: 0, max: 100 }}
        />
        <TextField
          select
          label={t('accounts:filters.marketplaceActivity')}
          value={params.marketplaceActivity ?? ''}
          onChange={(event) => updateParam('marketplaceActivity', event.target.value)}
          size="small"
        >
          <MenuItem value="">{t('accounts:filters.all')}</MenuItem>
          {MARKETPLACE_ACTIVITY.map((activity) => (
            <MenuItem key={activity} value={activity}>
              {t(`common:marketplaceActivity.${activity}`)}
            </MenuItem>
          ))}
        </TextField>
        <Button startIcon={<ClearIcon />} onClick={clearFilters} sx={{ minHeight: 40 }}>
          {t('accounts:filters.clear')}
        </Button>
      </Box>

      <DataGrid
        rows={data?.items ?? []}
        columns={columns}
        rowCount={data?.pagination.totalItems ?? 0}
        loading={isFetching}
        paginationMode="server"
        sortingMode="server"
        paginationModel={paginationModel}
        onPaginationModelChange={(model) => {
          setSearchParams((current) => {
            const next = new URLSearchParams(current);
            next.set('page', String(model.page + 1));
            next.set('pageSize', String(model.pageSize));
            return next;
          });
        }}
        sortModel={sortModel}
        onSortModelChange={(model) => {
          const [sort] = model;
          setSearchParams((current) => {
            const next = new URLSearchParams(current);
            next.set('sortBy', (sort?.field as GetAccountsSortBy | undefined) ?? DEFAULT_SORT_BY);
            next.set('sortOrder', sort?.sort ?? DEFAULT_SORT_ORDER);
            next.set('page', String(DEFAULT_PAGE));
            return next;
          });
        }}
        pageSizeOptions={PAGE_SIZE_OPTIONS}
        disableRowSelectionOnClick
        autoHeight
        localeText={{ noRowsLabel: t('accounts:grid.empty') }}
        aria-label={t('accounts:grid.ariaLabel')}
        sx={{
          bgcolor: 'background.paper',
          '& .MuiDataGrid-columnHeaders': { bgcolor: 'action.hover' },
          '& .MuiDataGrid-cell:focus, & .MuiDataGrid-columnHeader:focus': { outline: 'none' },
        }}
      />
    </Box>
  );
}
