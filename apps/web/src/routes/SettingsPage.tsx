import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useQueryClient } from '@tanstack/react-query';
import Alert from '@mui/material/Alert';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import Divider from '@mui/material/Divider';
import Paper from '@mui/material/Paper';
import Stack from '@mui/material/Stack';
import TextField from '@mui/material/TextField';
import Typography from '@mui/material/Typography';
import {
  getGetDashboardQueryKey,
  getGetImportsQueryKey,
  usePostSettingsResetWorkspace,
} from '@cloud-gtm/api-client';
import type { ResetWorkspaceResponse } from '@cloud-gtm/api-client';
import { RESET_WORKSPACE_CONFIRMATION } from '@cloud-gtm/contracts';
import { toSupportedLocale } from '../i18n';
import { formatNumber } from '../i18n/formatters';

const accountListQueryKey = ['/accounts'] as const;

function ResetCounts({ result }: { result: ResetWorkspaceResponse }) {
  const { t, i18n } = useTranslation('settings');
  const locale = toSupportedLocale(i18n.language);
  const counts = [
    ['imports', result.deletedImports],
    ['importErrors', result.deletedImportErrors],
    ['accounts', result.deletedAccounts],
    ['scores', result.deletedAccountScores],
    ['insights', result.deletedInsights],
    ['dashboard', result.deletedDashboardSummaries],
  ] as const;

  return (
    <Box
      component="dl"
      sx={{
        display: 'grid',
        gridTemplateColumns: { xs: '1fr', sm: 'repeat(2, minmax(0, 1fr))' },
        gap: 1.5,
        m: 0,
      }}
    >
      {counts.map(([key, value]) => (
        <Box key={key} sx={{ minWidth: 0 }}>
          <Typography component="dt" variant="body2" color="text.secondary">
            {t(`dataManagement.counts.${key}`)}
          </Typography>
          <Typography component="dd" variant="h6" sx={{ m: 0, fontWeight: 700 }}>
            {formatNumber(value, locale)}
          </Typography>
        </Box>
      ))}
    </Box>
  );
}

export function SettingsPage() {
  const { t } = useTranslation('settings');
  const queryClient = useQueryClient();
  const [confirmation, setConfirmation] = useState('');
  const resetWorkspace = usePostSettingsResetWorkspace({
    mutation: {
      onSuccess: async () => {
        setConfirmation('');
        await Promise.all([
          queryClient.invalidateQueries({ queryKey: getGetDashboardQueryKey() }),
          queryClient.invalidateQueries({ queryKey: getGetImportsQueryKey() }),
          queryClient.invalidateQueries({ queryKey: accountListQueryKey }),
        ]);
      },
    },
  });
  const canReset = confirmation === RESET_WORKSPACE_CONFIRMATION && !resetWorkspace.isPending;

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

      <Paper
        variant="outlined"
        sx={{
          p: { xs: 2, md: 3 },
          borderColor: 'divider',
          borderRadius: 2,
          maxWidth: 840,
        }}
      >
        <Stack spacing={2.5}>
          <Box>
            <Typography variant="h6" component="h2" fontWeight={700} gutterBottom>
              {t('dataManagement.title')}
            </Typography>
            <Typography variant="body2" color="text.secondary">
              {t('dataManagement.description')}
            </Typography>
          </Box>

          <Alert severity="warning">{t('dataManagement.warning')}</Alert>

          {resetWorkspace.isSuccess && (
            <Alert severity="success">
              <Stack spacing={2}>
                <Typography variant="body2">{t('dataManagement.success')}</Typography>
                <ResetCounts result={resetWorkspace.data} />
              </Stack>
            </Alert>
          )}

          {resetWorkspace.isError && <Alert severity="error">{t('dataManagement.failure')}</Alert>}

          <Divider />

          <Stack
            direction={{ xs: 'column', sm: 'row' }}
            spacing={1.5}
            alignItems={{ xs: 'stretch', sm: 'flex-end' }}
          >
            <TextField
              label={t('dataManagement.confirmationLabel')}
              placeholder={t('dataManagement.confirmationPlaceholder')}
              value={confirmation}
              onChange={(event) => setConfirmation(event.target.value)}
              size="small"
              fullWidth
              sx={{ maxWidth: { sm: 320 } }}
              inputProps={{ autoComplete: 'off' }}
            />
            <Button
              type="button"
              variant="contained"
              color="error"
              disabled={!canReset}
              onClick={() =>
                resetWorkspace.mutate({
                  data: { confirmation: RESET_WORKSPACE_CONFIRMATION },
                })
              }
              sx={{ minWidth: 220 }}
            >
              {resetWorkspace.isPending
                ? t('dataManagement.resetting')
                : t('dataManagement.resetButton')}
            </Button>
          </Stack>
        </Stack>
      </Paper>
    </Box>
  );
}
