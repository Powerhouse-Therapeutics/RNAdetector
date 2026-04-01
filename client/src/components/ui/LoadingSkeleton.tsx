import { Box, Skeleton, Stack } from '@mui/material';

interface LoadingSkeletonProps {
  variant?: 'table' | 'card' | 'detail' | 'list';
  rows?: number;
}

export default function LoadingSkeleton({ variant = 'table', rows = 5 }: LoadingSkeletonProps) {
  if (variant === 'card') {
    return (
      <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: 2 }}>
        {Array.from({ length: rows }).map((_, i) => (
          <Box
            key={i}
            sx={{
              p: 3,
              borderRadius: 3,
              background: 'rgba(17, 24, 39, 0.6)',
              border: '1px solid rgba(0, 229, 255, 0.08)',
            }}
          >
            <Skeleton
              variant="text"
              width="60%"
              height={32}
              sx={{ bgcolor: 'rgba(156, 163, 175, 0.1)' }}
            />
            <Skeleton
              variant="text"
              width="100%"
              height={20}
              sx={{ bgcolor: 'rgba(156, 163, 175, 0.08)', mt: 1 }}
            />
            <Skeleton
              variant="text"
              width="80%"
              height={20}
              sx={{ bgcolor: 'rgba(156, 163, 175, 0.08)' }}
            />
            <Skeleton
              variant="rectangular"
              width="40%"
              height={32}
              sx={{ bgcolor: 'rgba(156, 163, 175, 0.1)', mt: 2, borderRadius: 2 }}
            />
          </Box>
        ))}
      </Box>
    );
  }

  if (variant === 'detail') {
    return (
      <Stack spacing={2}>
        <Skeleton variant="text" width="40%" height={40} sx={{ bgcolor: 'rgba(156, 163, 175, 0.1)' }} />
        <Skeleton variant="rectangular" height={200} sx={{ bgcolor: 'rgba(156, 163, 175, 0.08)', borderRadius: 2 }} />
        <Skeleton variant="text" width="70%" height={24} sx={{ bgcolor: 'rgba(156, 163, 175, 0.08)' }} />
        <Skeleton variant="text" width="50%" height={24} sx={{ bgcolor: 'rgba(156, 163, 175, 0.08)' }} />
      </Stack>
    );
  }

  if (variant === 'list') {
    return (
      <Stack spacing={1}>
        {Array.from({ length: rows }).map((_, i) => (
          <Skeleton
            key={i}
            variant="rectangular"
            height={48}
            sx={{ bgcolor: 'rgba(156, 163, 175, 0.08)', borderRadius: 1 }}
          />
        ))}
      </Stack>
    );
  }

  // Default: table
  return (
    <Stack spacing={1}>
      <Skeleton
        variant="rectangular"
        height={42}
        sx={{ bgcolor: 'rgba(156, 163, 175, 0.12)', borderRadius: 1 }}
      />
      {Array.from({ length: rows }).map((_, i) => (
        <Skeleton
          key={i}
          variant="rectangular"
          height={52}
          sx={{ bgcolor: 'rgba(156, 163, 175, 0.06)', borderRadius: 1 }}
        />
      ))}
    </Stack>
  );
}
