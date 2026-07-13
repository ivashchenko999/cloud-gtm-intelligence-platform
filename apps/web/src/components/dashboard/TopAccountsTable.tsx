import { useTranslation } from 'react-i18next';
import { Link as RouterLink } from 'react-router-dom';
import Chip from '@mui/material/Chip';
import Link from '@mui/material/Link';
import Table from '@mui/material/Table';
import TableBody from '@mui/material/TableBody';
import TableCell from '@mui/material/TableCell';
import TableHead from '@mui/material/TableHead';
import TableRow from '@mui/material/TableRow';
import Typography from '@mui/material/Typography';
import type { AccountSummary, ScoreLevel, SupportedLocale } from '@cloud-gtm/contracts';
import { formatNumber } from '../../i18n/formatters';

const scoreLevelColor: Record<ScoreLevel, 'success' | 'warning' | 'default'> = {
  HIGH: 'success',
  MEDIUM: 'warning',
  LOW: 'default',
};

interface TopAccountsTableProps {
  accounts: AccountSummary[];
  locale: SupportedLocale;
}

/**
 * Read-only ranking of the highest-intent accounts. The full sortable,
 * paginated grid is a separate feature (YUR-31); this is a compact top-10 view.
 */
export function TopAccountsTable({ accounts, locale }: TopAccountsTableProps) {
  const { t } = useTranslation(['dashboard', 'common']);

  if (accounts.length === 0) {
    return (
      <Typography variant="body2" color="text.secondary">
        {t('dashboard:topAccounts.empty')}
      </Typography>
    );
  }

  return (
    <Table size="small" aria-label={t('dashboard:charts.topAccounts')}>
      <TableHead>
        <TableRow>
          <TableCell>{t('dashboard:topAccounts.account')}</TableCell>
          <TableCell>{t('dashboard:topAccounts.industry')}</TableCell>
          <TableCell>{t('dashboard:topAccounts.cloud')}</TableCell>
          <TableCell align="right">{t('dashboard:topAccounts.intent')}</TableCell>
        </TableRow>
      </TableHead>
      <TableBody>
        {accounts.map((account) => (
          <TableRow key={account.id} hover>
            <TableCell>
              <Link component={RouterLink} to={`/accounts/${account.id}`} underline="hover">
                {account.name}
              </Link>
            </TableCell>
            <TableCell>{account.industry ?? '—'}</TableCell>
            <TableCell>{t(`common:cloudProvider.${account.primaryCloud}`)}</TableCell>
            <TableCell align="right">
              <Chip
                size="small"
                color={scoreLevelColor[account.scoreLevel]}
                label={formatNumber(account.purchaseIntentScore, locale)}
              />
            </TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
}
