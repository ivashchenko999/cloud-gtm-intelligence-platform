import type { ReactNode } from 'react';
import { useTranslation } from 'react-i18next';
import Box from '@mui/material/Box';
import Typography from '@mui/material/Typography';
import InboxIcon from '@mui/icons-material/InboxOutlined';

interface EmptyStateProps {
  /** Overrides the default localized "Nothing to show yet" title. */
  title?: string;
  description?: string;
  /** Optional illustration; defaults to a neutral inbox glyph. */
  icon?: ReactNode;
  /** Optional call to action (e.g. an import button). */
  action?: ReactNode;
  minHeight?: number | string;
}

/** Reusable empty-state placeholder for lists and sections with no data. */
export function EmptyState({ title, description, icon, action, minHeight = 200 }: EmptyStateProps) {
  const { t } = useTranslation('common');

  return (
    <Box
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
      <Box sx={{ fontSize: 48, display: 'flex', color: 'action.disabled' }} aria-hidden>
        {icon ?? <InboxIcon fontSize="inherit" />}
      </Box>
      <Typography variant="h6" color="text.primary">
        {title ?? t('states.empty')}
      </Typography>
      {description ? <Typography variant="body2">{description}</Typography> : null}
      {action ? <Box sx={{ mt: 1 }}>{action}</Box> : null}
    </Box>
  );
}
