import Box from '@mui/material/Box';
import Typography from '@mui/material/Typography';

export interface ChartDatum {
  /** Stable identity used as the React key. */
  key: string;
  /** Localized, human-readable category label shown to the left of the bar. */
  label: string;
  value: number;
}

interface DistributionChartProps {
  data: ChartDatum[];
  /** Accessible name for the whole chart (typically the card title). */
  ariaLabel: string;
  /** Message rendered when there is nothing to chart. */
  emptyLabel: string;
  /** Formats each bar's value for display (defaults to the raw number). */
  valueFormatter?: (value: number) => string;
  color?: string;
}

/**
 * Lightweight horizontal bar chart built from layout primitives — no charting
 * dependency — so every label and value is real, localized DOM text that reads
 * well for assistive tech and is straightforward to assert in tests.
 */
export function DistributionChart({
  data,
  ariaLabel,
  emptyLabel,
  valueFormatter = (value) => String(value),
  color = 'primary.main',
}: DistributionChartProps) {
  if (data.length === 0) {
    return (
      <Typography variant="body2" color="text.secondary">
        {emptyLabel}
      </Typography>
    );
  }

  const max = Math.max(...data.map((datum) => datum.value), 1);

  return (
    <Box role="list" aria-label={ariaLabel} sx={{ display: 'grid', gap: 1.5 }}>
      {data.map((datum) => (
        <Box
          key={datum.key}
          role="listitem"
          sx={{
            display: 'grid',
            gridTemplateColumns: 'minmax(72px, 30%) 1fr auto',
            alignItems: 'center',
            gap: 1.5,
          }}
        >
          <Typography variant="body2" noWrap title={datum.label}>
            {datum.label}
          </Typography>
          <Box
            sx={{ height: 10, borderRadius: 5, bgcolor: 'action.hover', overflow: 'hidden' }}
            aria-hidden
          >
            <Box
              sx={{
                height: '100%',
                borderRadius: 5,
                bgcolor: color,
                width: `${Math.max((datum.value / max) * 100, datum.value > 0 ? 2 : 0)}%`,
                transition: 'width 300ms ease',
              }}
            />
          </Box>
          <Typography variant="body2" fontWeight={600} sx={{ fontVariantNumeric: 'tabular-nums' }}>
            {valueFormatter(datum.value)}
          </Typography>
        </Box>
      ))}
    </Box>
  );
}
