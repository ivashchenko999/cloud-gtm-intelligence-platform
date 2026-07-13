import { useTranslation } from 'react-i18next';
import Box from '@mui/material/Box';
import CircularProgress from '@mui/material/CircularProgress';
import Typography from '@mui/material/Typography';

interface LoadingStateProps {
  /** Overrides the default localized "Loading…" label. */
  message?: string;
  /** Minimum vertical space the state fills; useful for centering inside cards. */
  minHeight?: number | string;
}

/** Reusable centered loading indicator for async route and section content. */
export function LoadingState({ message, minHeight = 200 }: LoadingStateProps) {
  const { t } = useTranslation('common');
  const label = message ?? t('states.loading');

  return (
    <Box
      role="status"
      aria-live="polite"
      sx={{
        minHeight,
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 2,
        color: 'text.secondary',
      }}
    >
      <CircularProgress aria-hidden />
      <Typography variant="body2">{label}</Typography>
    </Box>
  );
}
