import { useMemo } from 'react';
import { useLocation } from 'react-router-dom';
import {
  AppBar, Toolbar, Typography, Box, Chip, IconButton, Tooltip, Breadcrumbs,
} from '@mui/material';
import { useTheme } from '@mui/material/styles';
import { Logout, NavigateNext, Person } from '@mui/icons-material';
import useAuth from '@/hooks/useAuth';
import { DRAWER_WIDTH_EXPANDED } from './sidebarContext';

const BREADCRUMB_MAP: Record<string, string> = {
  '': 'Dashboard',
  'analysis': 'Analysis',
  'long-rna': 'RNA-seq',
  'small-rna': 'Small RNA',
  'circ-rna': 'CircRNA',
  'sample-group': 'Sample Groups',
  'diff-expr': 'DEGs Analysis',
  'pathway': 'Pathway Analysis',
  'full-pipeline': 'Full Pipeline',
  'files': 'File Browser',
  'references': 'References',
  'annotations': 'Annotations',
  'templates': 'Templates',
  'jobs': 'Jobs',
  'admin': 'Admin',
  'documentation': 'Documentation',
  'settings': 'Settings',
};

interface HeaderProps {
  drawerWidth?: number;
}

export default function Header({ drawerWidth = DRAWER_WIDTH_EXPANDED }: HeaderProps) {
  const theme = useTheme();
  const { user, logout } = useAuth();
  const location = useLocation();

  const breadcrumbs = useMemo(() => {
    const segments = location.pathname.split('/').filter(Boolean);
    if (segments.length === 0) return [{ label: 'Dashboard' }];
    return segments.map((seg) => ({
      label: BREADCRUMB_MAP[seg] || seg.charAt(0).toUpperCase() + seg.slice(1),
    }));
  }, [location.pathname]);

  return (
    <AppBar
      position="fixed"
      elevation={0}
      sx={{
        width: `calc(100% - ${drawerWidth}px)`,
        ml: `${drawerWidth}px`,
        transition: 'width 200ms ease-out, margin-left 200ms ease-out',
        backgroundColor: 'rgba(13, 17, 23, 0.8)',
        backdropFilter: 'blur(20px)',
        borderBottom: `1px solid ${theme.palette.divider}`,
        boxShadow: '0 1px 3px rgba(0, 0, 0, 0.12)',
      }}
    >
      <Toolbar sx={{ minHeight: '56px !important', px: 3 }}>
        {/* Breadcrumb navigation */}
        <Breadcrumbs
          separator={
            <NavigateNext sx={{ fontSize: 16, color: theme.palette.text.secondary }} />
          }
          sx={{ flex: 1 }}
        >
          {breadcrumbs.map((crumb, index) => (
            <Typography
              key={index}
              variant="body2"
              sx={{
                color: index === breadcrumbs.length - 1
                  ? theme.palette.text.primary
                  : theme.palette.text.secondary,
                fontWeight: index === breadcrumbs.length - 1 ? 500 : 400,
                fontSize: '0.8125rem',
              }}
            >
              {crumb.label}
            </Typography>
          ))}
        </Breadcrumbs>

        {/* User info on the right */}
        {user && (
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <Chip
              icon={<Person sx={{ fontSize: 16 }} />}
              label={user.name}
              size="small"
              variant="outlined"
              sx={{
                borderColor: theme.palette.divider,
                color: theme.palette.text.secondary,
                fontWeight: 500,
                fontSize: '0.75rem',
                height: 30,
                transition: 'all 200ms ease',
                '& .MuiChip-icon': {
                  color: theme.palette.text.secondary,
                },
                '&:hover': {
                  borderColor: theme.palette.primary.main,
                  color: theme.palette.text.primary,
                },
              }}
            />
            <Tooltip title="Logout" arrow>
              <IconButton
                onClick={logout}
                size="small"
                sx={{
                  color: theme.palette.text.secondary,
                  transition: 'all 200ms ease',
                  '&:hover': {
                    color: theme.palette.error.main,
                    backgroundColor: 'rgba(248, 81, 73, 0.1)',
                  },
                }}
              >
                <Logout sx={{ fontSize: 18 }} />
              </IconButton>
            </Tooltip>
          </Box>
        )}
      </Toolbar>
    </AppBar>
  );
}
