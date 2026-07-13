import { useTranslation } from 'react-i18next';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import Typography from '@mui/material/Typography';
import ErrorOutlineIcon from '@mui/icons-material/ErrorOutline';

interface ErrorStateProps {
  /** Overrides the default localized "Something went wrong" title. */
  title?: string;
  description?: string;
  /** When provided, renders a localized retry button wired to this handler. */
  onRetry?: () => void;
  minHeight?: number | string;
}

/** Reusable error-state placeholder with an optional retry action. */
export function ErrorState({ title, description, onRetry, minHeight = 200 }: ErrorStateProps) {
  const { t } = useTranslation('common');

  return (
    <Box
      role="alert"
      sx={{
        minHeight,
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        textAlign: 'center',
        gap: 1.5,
        color: 'text.secondary',
        px: 2,
      }}
    >
      <ErrorOutlineIcon color="error" sx={{ fontSize: 48 }} aria-hidden />
      <Typography variant="h6" color="text.primary">
        {title ?? t('states.error')}
      </Typography>
      {description ? <Typography variant="body2">{description}</Typography> : null}
      {onRetry ? (
        <Button variant="outlined" onClick={onRetry} sx={{ mt: 1 }}>
          {t('actions.retry')}
        </Button>
      ) : null}
    </Box>
  );
}
