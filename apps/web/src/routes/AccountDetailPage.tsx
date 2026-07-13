import { useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate, useParams } from 'react-router-dom';
import AutoAwesomeIcon from '@mui/icons-material/AutoAwesome';
import CloseIcon from '@mui/icons-material/Close';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import Chip from '@mui/material/Chip';
import Divider from '@mui/material/Divider';
import Drawer from '@mui/material/Drawer';
import IconButton from '@mui/material/IconButton';
import LinearProgress from '@mui/material/LinearProgress';
import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';
import { useGetAccountsAccountId } from '@cloud-gtm/api-client';
import type { Account } from '@cloud-gtm/api-client';
import type { ScoreLevel } from '@cloud-gtm/contracts';
import { toSupportedLocale } from '../i18n';
import { formatCurrency, formatDate, formatNumber } from '../i18n/formatters';
import { ErrorState } from '../components/ErrorState';

function scoreColor(level: ScoreLevel): 'success' | 'warning' | 'default' {
  if (level === 'HIGH') return 'success';
  if (level === 'MEDIUM') return 'warning';
  return 'default';
}

function Field({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <Box>
      <Typography variant="overline" color="text.secondary" component="p">
        {label}
      </Typography>
      <Typography variant="body2" component="div">
        {value || '—'}
      </Typography>
    </Box>
  );
}

function accountFields(
  account: Account,
  locale: ReturnType<typeof toSupportedLocale>,
  t: ReturnType<typeof useTranslation>['t'],
) {
  return [
    [t('accounts:detail.fields.domain'), account.domain],
    [t('accounts:detail.fields.industry'), account.industry],
    [
      t('accounts:detail.fields.employees'),
      account.employeeCount == null ? undefined : formatNumber(account.employeeCount, locale),
    ],
    [
      t('accounts:detail.fields.annualRevenue'),
      account.annualRevenue == null ? undefined : formatCurrency(account.annualRevenue, locale),
    ],
    [t('accounts:detail.fields.primaryCloud'), t(`common:cloudProvider.${account.primaryCloud}`)],
    [
      t('accounts:detail.fields.cloudSpend'),
      account.estimatedCloudSpend == null
        ? undefined
        : formatCurrency(account.estimatedCloudSpend, locale),
    ],
    [
      t('accounts:detail.fields.marketplaceActivity'),
      account.marketplaceActivity
        ? t(`common:marketplaceActivity.${account.marketplaceActivity}`)
        : undefined,
    ],
    [
      t('accounts:detail.fields.marketplaceTransactions'),
      account.marketplaceTransactions == null
        ? undefined
        : formatNumber(account.marketplaceTransactions, locale),
    ],
    [t('accounts:detail.fields.created'), formatDate(account.createdAt, locale)],
    [t('accounts:detail.fields.updated'), formatDate(account.updatedAt, locale)],
  ] as const;
}

function AiPlaceholderButton({ label }: { label: string }) {
  const { t } = useTranslation('accounts');
  return (
    <Button
      variant="outlined"
      startIcon={<AutoAwesomeIcon />}
      disabled
      sx={{ justifyContent: 'flex-start', minHeight: 44 }}
    >
      <Box component="span" sx={{ textAlign: 'left' }}>
        {label}
        <Typography
          component="span"
          variant="caption"
          color="text.secondary"
          sx={{ display: 'block' }}
        >
          {t('detail.aiUnavailable')}
        </Typography>
      </Box>
    </Button>
  );
}

export function AccountDetailPage() {
  const { t, i18n } = useTranslation(['accounts', 'common']);
  const locale = toSupportedLocale(i18n.language);
  const { accountId = '' } = useParams();
  const navigate = useNavigate();
  const { data, isError, isPending, refetch } = useGetAccountsAccountId(accountId);

  const fields = useMemo(() => (data ? accountFields(data, locale, t) : []), [data, locale, t]);
  const close = () => navigate('/accounts');

  return (
    <Drawer
      anchor="right"
      open
      onClose={close}
      PaperProps={{
        sx: {
          width: { xs: '100%', sm: 560 },
          maxWidth: '100%',
        },
      }}
    >
      <Box sx={{ display: 'flex', flexDirection: 'column', minHeight: '100%' }}>
        <Box sx={{ px: 3, py: 2.5, display: 'flex', alignItems: 'flex-start', gap: 2 }}>
          <Box sx={{ flex: 1, minWidth: 0 }}>
            <Typography variant="h5" component="h1" fontWeight={700}>
              {data?.name ?? t('detail.title')}
            </Typography>
            <Typography variant="body2" color="text.secondary">
              {t('detail.accountId', { id: accountId })}
            </Typography>
          </Box>
          <IconButton aria-label={t('detail.close')} onClick={close}>
            <CloseIcon />
          </IconButton>
        </Box>
        {isPending ? <LinearProgress aria-label={t('common:states.loading')} /> : null}
        <Divider />

        <Box sx={{ p: 3, display: 'grid', gap: 3 }}>
          {isError ? <ErrorState onRetry={() => void refetch()} /> : null}

          {data ? (
            <>
              <Box>
                <Typography variant="h6" component="h2" gutterBottom>
                  {t('detail.score')}
                </Typography>
                <Stack direction="row" spacing={1} alignItems="center" flexWrap="wrap" useFlexGap>
                  <Chip
                    color={scoreColor(data.scoreLevel)}
                    label={formatNumber(data.purchaseIntentScore, locale)}
                  />
                  <Chip variant="outlined" label={t(`common:scoreLevel.${data.scoreLevel}`)} />
                  <Chip
                    variant="outlined"
                    label={`${t('detail.scoreVersion')}: ${data.scoreVersion}`}
                  />
                </Stack>
              </Box>

              <Box>
                <Typography variant="h6" component="h2" gutterBottom>
                  {t('detail.profile')}
                </Typography>
                <Box
                  sx={{
                    display: 'grid',
                    gridTemplateColumns: { xs: '1fr', sm: '1fr 1fr' },
                    gap: 2,
                  }}
                >
                  {fields.map(([label, value]) => (
                    <Field key={label} label={label} value={value} />
                  ))}
                </Box>
              </Box>

              <Box>
                <Typography variant="h6" component="h2" gutterBottom>
                  {t('detail.products')}
                </Typography>
                {(data.existingProducts?.length ?? 0) > 0 ? (
                  <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap>
                    {data.existingProducts?.map((product) => (
                      <Chip key={product} label={product} variant="outlined" />
                    ))}
                  </Stack>
                ) : (
                  <Typography variant="body2" color="text.secondary">
                    {t('detail.noProducts')}
                  </Typography>
                )}
              </Box>

              <Box>
                <Typography variant="h6" component="h2" gutterBottom>
                  {t('detail.scoreFactors')}
                </Typography>
                {data.scoreFactors.length > 0 ? (
                  <Stack spacing={1.25}>
                    {data.scoreFactors.map((factor) => (
                      <Box
                        key={factor.code}
                        sx={{
                          display: 'grid',
                          gridTemplateColumns: '1fr auto',
                          gap: 2,
                          alignItems: 'center',
                          border: 1,
                          borderColor: 'divider',
                          borderRadius: 1,
                          p: 1.5,
                        }}
                      >
                        <Typography variant="body2">{factor.label}</Typography>
                        <Chip size="small" label={`+${formatNumber(factor.points, locale)}`} />
                      </Box>
                    ))}
                  </Stack>
                ) : (
                  <Typography variant="body2" color="text.secondary">
                    {t('detail.noScoreFactors')}
                  </Typography>
                )}
              </Box>

              <Box>
                <Typography variant="h6" component="h2" gutterBottom>
                  {t('detail.aiActions')}
                </Typography>
                <Stack spacing={1}>
                  <AiPlaceholderButton label={t('detail.aiExplanation')} />
                  <AiPlaceholderButton label={t('detail.aiNextAction')} />
                  <AiPlaceholderButton label={t('detail.aiOutreach')} />
                </Stack>
              </Box>
            </>
          ) : null}
        </Box>
      </Box>
    </Drawer>
  );
}
