import React, { useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import {
  Drawer, List, ListItemButton, ListItemIcon, ListItemText,
  Collapse, Typography, Box, Divider, IconButton, Tooltip,
} from '@mui/material';
import { useTheme } from '@mui/material/styles';
import {
  Home, ExpandLess, ExpandMore, Science, BubbleChart, AcUnit,
  Groups, CompareArrows, AccountTree, Work, Folder, Storage,
  Description, ViewModule, AdminPanelSettings, Settings, Biotech,
  MenuBook, ChevronLeft, ChevronRight,
} from '@mui/icons-material';
import useAuthStore from '@/stores/authStore';
import { useSidebarContext, DRAWER_WIDTH_EXPANDED, DRAWER_WIDTH_COLLAPSED } from './sidebarContext';

interface NavItem {
  label: string;
  icon: React.ReactNode;
  path?: string;
  children?: { label: string; path: string; icon: React.ReactNode }[];
  adminOnly?: boolean;
}

const navItems: NavItem[] = [
  { label: 'Dashboard', icon: <Home />, path: '/' },
  {
    label: 'Analysis',
    icon: <Science />,
    children: [
      { label: 'RNA-seq', path: '/analysis/long-rna', icon: <Biotech /> },
      { label: 'Small RNA', path: '/analysis/small-rna', icon: <AcUnit /> },
      { label: 'CircRNA', path: '/analysis/circ-rna', icon: <BubbleChart /> },
      { label: 'Sample Groups', path: '/analysis/sample-group', icon: <Groups /> },
      { label: 'DEGs Analysis', path: '/analysis/diff-expr', icon: <CompareArrows /> },
      { label: 'Pathway Analysis', path: '/analysis/pathway', icon: <AccountTree /> },
      { label: 'Full Pipeline', path: '/analysis/full-pipeline', icon: <Biotech /> },
    ],
  },
  {
    label: 'Data',
    icon: <Storage />,
    children: [
      { label: 'File Browser', path: '/files', icon: <Folder /> },
      { label: 'References', path: '/references', icon: <Storage /> },
      { label: 'Annotations', path: '/annotations', icon: <Description /> },
      { label: 'Templates', path: '/templates', icon: <ViewModule /> },
    ],
  },
  { label: 'Jobs', icon: <Work />, path: '/jobs' },
  { label: 'Admin', icon: <AdminPanelSettings />, path: '/admin', adminOnly: true },
  { label: 'Documentation', icon: <MenuBook />, path: '/documentation' },
  { label: 'Settings', icon: <Settings />, path: '/settings' },
];

export default function Sidebar() {
  const theme = useTheme();
  const navigate = useNavigate();
  const location = useLocation();
  const user = useAuthStore((s) => s.user);
  const { collapsed, setCollapsed } = useSidebarContext();
  const [openSections, setOpenSections] = useState<Record<string, boolean>>({
    Analysis: true,
    Data: false,
  });

  const drawerWidth = collapsed ? DRAWER_WIDTH_COLLAPSED : DRAWER_WIDTH_EXPANDED;

  const toggleSection = (label: string) => {
    if (collapsed) {
      setCollapsed(false);
      setOpenSections((prev) => ({ ...prev, [label]: true }));
      return;
    }
    setOpenSections((prev) => ({ ...prev, [label]: !prev[label] }));
  };

  const isActive = (path: string) => location.pathname === path;
  const isChildActive = (children: { path: string }[]) =>
    children.some((c) => location.pathname === c.path);

  const activeBarSx = {
    content: '""',
    position: 'absolute',
    left: 0,
    top: '20%',
    bottom: '20%',
    width: 3,
    borderRadius: '0 3px 3px 0',
    backgroundColor: theme.palette.primary.main,
  };

  const itemTransition = 'all 200ms ease';

  return (
    <Drawer
      variant="permanent"
      sx={{
        width: drawerWidth,
        flexShrink: 0,
        transition: 'width 200ms ease-out',
        '& .MuiDrawer-paper': {
          width: drawerWidth,
          boxSizing: 'border-box',
          transition: 'width 200ms ease-out',
          overflowX: 'hidden',
          backgroundColor: theme.palette.mode === 'dark' ? '#0D1117' : theme.palette.background.paper,
          borderRight: `1px solid ${theme.palette.divider}`,
        },
      }}
    >
      {/* Logo area */}
      <Box
        sx={{
          p: collapsed ? 1.25 : 2,
          display: 'flex',
          alignItems: 'center',
          gap: 1,
          minHeight: 64,
          transition: itemTransition,
        }}
      >
        <Biotech
          sx={{
            color: theme.palette.primary.main,
            fontSize: 28,
            flexShrink: 0,
            ml: collapsed ? 0.5 : 0,
            transition: itemTransition,
          }}
        />
        {!collapsed && (
          <Box sx={{ overflow: 'hidden', whiteSpace: 'nowrap' }}>
            <Typography
              variant="h6"
              sx={{
                fontWeight: 700,
                color: theme.palette.primary.main,
                lineHeight: 1.2,
                fontSize: '1rem',
                letterSpacing: '-0.01em',
              }}
            >
              RNAdetector
            </Typography>
            <Typography variant="caption" sx={{ color: theme.palette.text.secondary, fontSize: '0.7rem' }}>
              Analysis Platform
            </Typography>
          </Box>
        )}
      </Box>

      <Divider sx={{ borderColor: theme.palette.divider, mx: 1, opacity: 0.6 }} />

      {/* Navigation */}
      <List
        component="nav"
        sx={{
          px: collapsed ? 0.5 : 1,
          py: 1,
          flex: 1,
          overflowY: 'auto',
          overflowX: 'hidden',
          '&::-webkit-scrollbar': { width: 4 },
          '&::-webkit-scrollbar-thumb': {
            background: '#21262D',
            borderRadius: 2,
          },
        }}
      >
        {navItems.map((item) => {
          if (item.adminOnly && !user?.admin) return null;

          if (item.children) {
            const sectionActive = isChildActive(item.children);
            return (
              <React.Fragment key={item.label}>
                {/* Section label when expanded */}
                {!collapsed && (
                  <Typography
                    variant="caption"
                    sx={{
                      display: 'block',
                      px: 2,
                      pt: 1.5,
                      pb: 0.5,
                      color: theme.palette.text.secondary,
                      fontSize: '0.65rem',
                      fontWeight: 600,
                      textTransform: 'uppercase',
                      letterSpacing: '0.08em',
                    }}
                  >
                    {item.label}
                  </Typography>
                )}

                {/* Section toggle button */}
                <Tooltip title={collapsed ? item.label : ''} placement="right" arrow>
                  <ListItemButton
                    onClick={() => toggleSection(item.label)}
                    sx={{
                      borderRadius: 2,
                      my: 0.25,
                      mx: collapsed ? 0.25 : 0,
                      minHeight: 40,
                      justifyContent: collapsed ? 'center' : 'flex-start',
                      px: collapsed ? 1.5 : 1.5,
                      position: 'relative',
                      transition: itemTransition,
                      '&:hover': {
                        backgroundColor: '#161B22',
                      },
                      ...(sectionActive && collapsed ? {
                        '&::before': activeBarSx,
                      } : {}),
                    }}
                  >
                    <ListItemIcon
                      sx={{
                        minWidth: collapsed ? 0 : 32,
                        mr: collapsed ? 0 : 1.5,
                        color: sectionActive ? theme.palette.primary.main : theme.palette.text.secondary,
                        transition: itemTransition,
                        '& .MuiSvgIcon-root': { fontSize: 20 },
                      }}
                    >
                      {item.icon}
                    </ListItemIcon>
                    {!collapsed && (
                      <>
                        <ListItemText
                          primary={openSections[item.label] ? '' : `${item.children.length} items`}
                          primaryTypographyProps={{
                            fontSize: '0.75rem',
                            color: theme.palette.text.secondary,
                          }}
                        />
                        {openSections[item.label] ? (
                          <ExpandLess sx={{ fontSize: 18, color: theme.palette.text.secondary }} />
                        ) : (
                          <ExpandMore sx={{ fontSize: 18, color: theme.palette.text.secondary }} />
                        )}
                      </>
                    )}
                  </ListItemButton>
                </Tooltip>

                {!collapsed && (
                  <Collapse in={openSections[item.label]} timeout={200} easing="ease-out">
                    <List component="div" disablePadding>
                      {item.children.map((child) => {
                        const active = isActive(child.path);
                        return (
                          <ListItemButton
                            key={child.path}
                            selected={active}
                            onClick={() => navigate(child.path)}
                            sx={{
                              borderRadius: 2,
                              my: 0.25,
                              ml: 1,
                              mr: 0,
                              minHeight: 36,
                              pl: 2,
                              position: 'relative',
                              transition: itemTransition,
                              '&:hover': {
                                backgroundColor: '#161B22',
                              },
                              '&.Mui-selected': {
                                backgroundColor: `rgba(88, 166, 255, 0.08)`,
                                '&::before': activeBarSx,
                                '&:hover': {
                                  backgroundColor: `rgba(88, 166, 255, 0.12)`,
                                },
                              },
                            }}
                          >
                            <ListItemIcon
                              sx={{
                                minWidth: 28,
                                mr: 1,
                                color: active ? theme.palette.primary.main : theme.palette.text.secondary,
                                transition: itemTransition,
                                '& .MuiSvgIcon-root': { fontSize: 18 },
                              }}
                            >
                              {child.icon}
                            </ListItemIcon>
                            <ListItemText
                              primary={child.label}
                              primaryTypographyProps={{
                                fontSize: '0.8125rem',
                                fontWeight: active ? 500 : 400,
                                color: active ? theme.palette.text.primary : theme.palette.text.secondary,
                                sx: { transition: itemTransition },
                              }}
                            />
                          </ListItemButton>
                        );
                      })}
                    </List>
                  </Collapse>
                )}
              </React.Fragment>
            );
          }

          // Top-level nav items
          const active = isActive(item.path!);
          return (
            <Tooltip key={item.path} title={collapsed ? item.label : ''} placement="right" arrow>
              <ListItemButton
                selected={active}
                onClick={() => navigate(item.path!)}
                sx={{
                  borderRadius: 2,
                  my: 0.25,
                  mx: collapsed ? 0.25 : 0,
                  minHeight: 40,
                  justifyContent: collapsed ? 'center' : 'flex-start',
                  px: collapsed ? 1.5 : 1.5,
                  position: 'relative',
                  transition: itemTransition,
                  '&:hover': {
                    backgroundColor: '#161B22',
                  },
                  '&.Mui-selected': {
                    backgroundColor: `rgba(88, 166, 255, 0.08)`,
                    '&::before': activeBarSx,
                    '&:hover': {
                      backgroundColor: `rgba(88, 166, 255, 0.12)`,
                    },
                  },
                }}
              >
                <ListItemIcon
                  sx={{
                    minWidth: collapsed ? 0 : 32,
                    mr: collapsed ? 0 : 1.5,
                    color: active ? theme.palette.primary.main : theme.palette.text.secondary,
                    transition: itemTransition,
                    '& .MuiSvgIcon-root': { fontSize: 20 },
                  }}
                >
                  {item.icon}
                </ListItemIcon>
                {!collapsed && (
                  <ListItemText
                    primary={item.label}
                    primaryTypographyProps={{
                      fontSize: '0.8125rem',
                      fontWeight: active ? 500 : 400,
                      color: active ? theme.palette.text.primary : theme.palette.text.secondary,
                      sx: { transition: itemTransition },
                    }}
                  />
                )}
              </ListItemButton>
            </Tooltip>
          );
        })}
      </List>

      {/* Collapse toggle at bottom */}
      <Divider sx={{ borderColor: theme.palette.divider, mx: 1, opacity: 0.6 }} />
      <Box
        sx={{
          p: 1,
          display: 'flex',
          justifyContent: collapsed ? 'center' : 'flex-end',
        }}
      >
        <IconButton
          onClick={() => setCollapsed((prev) => !prev)}
          size="small"
          sx={{
            color: theme.palette.text.secondary,
            transition: itemTransition,
            '&:hover': {
              color: theme.palette.text.primary,
              backgroundColor: '#161B22',
            },
          }}
        >
          {collapsed ? <ChevronRight sx={{ fontSize: 18 }} /> : <ChevronLeft sx={{ fontSize: 18 }} />}
        </IconButton>
      </Box>
    </Drawer>
  );
}
