import { Chip, type ChipProps } from '@mui/material';

const statusColors: Record<string, { color: ChipProps['color']; sx?: object }> = {
  completed: { color: 'success' },
  processing: { color: 'info', sx: { animation: 'pulse-glow 2s ease-in-out infinite' } },
  queued: { color: 'warning' },
  failed: { color: 'error' },
  ready: { color: 'default' },
};

export default function StatusBadge({ status }: { status: string }) {
  const config = statusColors[status] || statusColors.ready;
  return <Chip label={status} size="small" color={config.color} sx={{ fontWeight: 600, ...config.sx }} />;
}
