import { AppBar, Toolbar, Typography, Box, Chip, IconButton, Tooltip } from '@mui/material';
import { Logout, Biotech } from '@mui/icons-material';
import useAuth from '@/hooks/useAuth';

const DRAWER_WIDTH = 240;

export default function Header() {
  const { user, logout } = useAuth();

  return (
    <AppBar
      position="fixed"
      elevation={0}
      sx={{
        width: `calc(100% - ${DRAWER_WIDTH}px)`,
        ml: `${DRAWER_WIDTH}px`,
      }}
    >
      <Toolbar>
        <Biotech sx={{ color: 'primary.main', mr: 1 }} />
        <Typography variant="h6" noWrap sx={{ fontWeight: 700, color: 'primary.main' }}>
          RNAdetector
        </Typography>
        <Typography variant="caption" sx={{ ml: 1, color: 'text.secondary', mt: 0.5 }}>
          v2.0
        </Typography>

        <Box sx={{ flexGrow: 1 }} />

        {user && (
          <Chip
            label={user.name}
            size="small"
            sx={{
              mr: 1,
              bgcolor: 'rgba(0, 229, 255, 0.08)',
              color: 'text.primary',
              fontWeight: 500,
            }}
          />
        )}

        <Tooltip title="Logout">
          <IconButton onClick={logout} sx={{ color: 'text.secondary' }}>
            <Logout />
          </IconButton>
        </Tooltip>
      </Toolbar>
    </AppBar>
  );
}
