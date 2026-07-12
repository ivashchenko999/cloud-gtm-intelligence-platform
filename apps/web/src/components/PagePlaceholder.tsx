import Box from '@mui/material/Box';
import Typography from '@mui/material/Typography';

interface PagePlaceholderProps {
  title: string;
  subtitle?: string;
}

/** Shared page header used by the placeholder route pages until each feature lands. */
export function PagePlaceholder({ title, subtitle }: PagePlaceholderProps) {
  return (
    <Box>
      <Typography variant="h4" component="h1" fontWeight={700} gutterBottom>
        {title}
      </Typography>
      {subtitle ? (
        <Typography variant="body1" color="text.secondary">
          {subtitle}
        </Typography>
      ) : null}
    </Box>
  );
}
