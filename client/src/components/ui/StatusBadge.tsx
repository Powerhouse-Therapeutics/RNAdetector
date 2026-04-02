import { Chip, type ChipProps, keyframes } from '@mui/material';

const subtlePulse = keyframes`
  0%   { opacity: 1; }
  50%  { opacity: 0.6; }
  100% { opacity: 1; }
`;

const statusStyles: Record<string, { color: ChipProps['color']; bg: string; fg: string; animate?: boolean }> = {
  completed:  { color: 'success',  bg: 'rgba(63, 185, 80, 0.12)',  fg: '#3FB950' },
  processing: { color: 'info',     bg: 'rgba(88, 166, 255, 0.12)', fg: '#58A6FF', animate: true },
  queued:     { color: 'warning',  bg: 'rgba(210, 153, 34, 0.12)', fg: '#D29922' },
  failed:     { color: 'error',    bg: 'rgba(248, 81, 73, 0.12)',  fg: '#F85149' },
  ready:      { color: 'default',  bg: 'rgba(139, 148, 158, 0.12)', fg: '#8B949E' },
};

export default function StatusBadge({ status = 'ready' }: { status?: string | null }) {
  const safeStatus = status ?? 'ready';
  const config = statusStyles[safeStatus] || statusStyles.ready;
  return (
    <Chip
      label={safeStatus.charAt(0).toUpperCase() + safeStatus.slice(1)}
      size="small"
      sx={{
        fontWeight: 600,
        fontSize: '0.72rem',
        letterSpacing: '0.02em',
        bgcolor: config.bg,
        color: config.fg,
        border: `1px solid ${config.fg}20`,
        transition: 'all 200ms ease',
        ...(config.animate && {
          animation: `${subtlePulse} 2.4s ease-in-out infinite`,
        }),
        '&:hover': {
          bgcolor: `${config.fg}25`,
        },
      }}
    />
  );
}
