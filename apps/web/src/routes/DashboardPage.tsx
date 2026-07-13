import { useTranslation } from 'react-i18next';
import Box from '@mui/material/Box';
import Typography from '@mui/material/Typography';
import { useGetDashboard } from '@cloud-gtm/api-client';
import type { DistributionBucket } from '@cloud-gtm/contracts';
import { toSupportedLocale } from '../i18n';
import { formatCurrency, formatNumber } from '../i18n/formatters';
import { LoadingState } from '../components/LoadingState';
import { ErrorState } from '../components/ErrorState';
import { EmptyState } from '../components/EmptyState';
import { KpiCard } from '../components/dashboard/KpiCard';
import { ChartCard } from '../components/dashboard/ChartCard';
import { DistributionChart, type ChartDatum } from '../components/dashboard/DistributionChart';
import { TopAccountsTable } from '../components/dashboard/TopAccountsTable';
import { LatestImportCard } from '../components/dashboard/LatestImportCard';

/** Maps raw distribution buckets to chart data, relabelling keys via `labelFor`. */
function toChartData(
  buckets: DistributionBucket[],
  labelFor: (key: string) => string,
): ChartDatum[] {
  return buckets.map((bucket) => ({
    key: bucket.key,
    label: labelFor(bucket.key),
    value: bucket.count,
  }));
}

export function DashboardPage() {
  const { t, i18n } = useTranslation(['dashboard', 'common', 'imports']);
  const locale = toSupportedLocale(i18n.language);
  const { data, isPending, isError, refetch } = useGetDashboard();

  const heading = (
    <Box sx={{ mb: 3 }}>
      <Typography variant="h4" component="h1" fontWeight={700} gutterBottom>
        {t('dashboard:title')}
      </Typography>
      <Typography variant="body1" color="text.secondary">
        {t('dashboard:subtitle')}
      </Typography>
    </Box>
  );

  if (isPending) {
    return (
      <Box>
        {heading}
        <LoadingState />
      </Box>
    );
  }

  if (isError) {
    return (
      <Box>
        {heading}
        <ErrorState onRetry={() => void refetch()} />
      </Box>
    );
  }

  if (data.totalAccounts === 0) {
    return (
      <Box>
        {heading}
        <EmptyState
          title={t('dashboard:empty.title')}
          description={t('dashboard:empty.description')}
        />
      </Box>
    );
  }

  const intentData = toChartData(data.intentDistribution, (key) => t(`common:scoreLevel.${key}`));
  const cloudData = toChartData(data.cloudDistribution, (key) => t(`common:cloudProvider.${key}`));
  const industryData = toChartData(data.industryDistribution, (key) => key);
  const countFormatter = (value: number) => formatNumber(value, locale);

  return (
    <Box>
      {heading}

      {/* KPI row */}
      <Box
        sx={{
          display: 'grid',
          gridTemplateColumns: { xs: '1fr', sm: 'repeat(2, 1fr)', lg: 'repeat(4, 1fr)' },
          gap: 2,
          mb: 3,
        }}
      >
        <KpiCard
          label={t('dashboard:kpi.totalAccounts')}
          value={formatNumber(data.totalAccounts, locale)}
        />
        <KpiCard
          label={t('dashboard:kpi.highIntentAccounts')}
          value={formatNumber(data.highIntentAccounts, locale)}
        />
        <KpiCard
          label={t('dashboard:kpi.averageIntent')}
          value={formatNumber(Math.round(data.averageIntentScore), locale)}
        />
        <KpiCard
          label={t('dashboard:kpi.pipelineValue')}
          value={formatCurrency(data.estimatedPipelineValue, locale)}
        />
        <KpiCard
          label={t('dashboard:kpi.awsOpportunities')}
          value={formatNumber(data.cloudOpportunities.aws, locale)}
        />
        <KpiCard
          label={t('dashboard:kpi.azureOpportunities')}
          value={formatNumber(data.cloudOpportunities.azure, locale)}
        />
        <KpiCard
          label={t('dashboard:kpi.gcpOpportunities')}
          value={formatNumber(data.cloudOpportunities.gcp, locale)}
        />
        <KpiCard
          label={t('dashboard:kpi.latestImportStatus')}
          value={data.latestImport ? t(`imports:status.${data.latestImport.status}`) : '—'}
          caption={data.latestImport?.filename}
        />
      </Box>

      {/* Charts */}
      <Box
        sx={{
          display: 'grid',
          gridTemplateColumns: { xs: '1fr', md: 'repeat(2, 1fr)' },
          gap: 2,
          mb: 3,
        }}
      >
        <ChartCard title={t('dashboard:charts.intentDistribution')}>
          <DistributionChart
            data={intentData}
            ariaLabel={t('dashboard:charts.intentDistribution')}
            emptyLabel={t('dashboard:charts.empty')}
            valueFormatter={countFormatter}
          />
        </ChartCard>
        <ChartCard title={t('dashboard:charts.cloudDistribution')}>
          <DistributionChart
            data={cloudData}
            ariaLabel={t('dashboard:charts.cloudDistribution')}
            emptyLabel={t('dashboard:charts.empty')}
            valueFormatter={countFormatter}
            color="secondary.main"
          />
        </ChartCard>
        <ChartCard title={t('dashboard:charts.opportunitiesByIndustry')}>
          <DistributionChart
            data={industryData}
            ariaLabel={t('dashboard:charts.opportunitiesByIndustry')}
            emptyLabel={t('dashboard:charts.empty')}
            valueFormatter={countFormatter}
          />
        </ChartCard>
        <ChartCard title={t('dashboard:charts.topAccounts')}>
          <TopAccountsTable accounts={data.topAccounts} locale={locale} />
        </ChartCard>
      </Box>

      {/* Latest import */}
      <LatestImportCard latestImport={data.latestImport} locale={locale} />
    </Box>
  );
}
