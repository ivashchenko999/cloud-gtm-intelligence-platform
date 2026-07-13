import type { ReactNode } from 'react';
import Card from '@mui/material/Card';
import CardContent from '@mui/material/CardContent';
import Typography from '@mui/material/Typography';

interface KpiCardProps {
  label: string;
  value: ReactNode;
  /** Optional secondary line under the value (e.g. a status or context hint). */
  caption?: ReactNode;
}

/** A single at-a-glance metric tile in the dashboard KPI row. */
export function KpiCard({ label, value, caption }: KpiCardProps) {
  return (
    <Card variant="outlined" sx={{ height: '100%' }}>
      <CardContent>
        <Typography variant="overline" color="text.secondary" component="p">
          {label}
        </Typography>
        <Typography variant="h4" component="p" fontWeight={700}>
          {value}
        </Typography>
        {caption ? (
          <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>
            {caption}
          </Typography>
        ) : null}
      </CardContent>
    </Card>
  );
}
