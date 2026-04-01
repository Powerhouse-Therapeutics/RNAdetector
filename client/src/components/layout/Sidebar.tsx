import React, { useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import {
  Drawer, List, ListItemButton, ListItemIcon, ListItemText,
  Collapse, Typography, Box, Divider,
} from '@mui/material';
import {
  Home, ExpandLess, ExpandMore, Science, BubbleChart, AcUnit,
  Groups, CompareArrows, AccountTree, Work, Folder, Storage,
  Description, ViewModule, AdminPanelSettings, Settings, Biotech,
} from '@mui/icons-material';
import useAuthStore from '@/stores/authStore';

const DRAWER_WIDTH = 240;

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
  { label: 'Settings', icon: <Settings />, path: '/settings' },
];

export default function Sidebar() {
  const navigate = useNavigate();
  const location = useLocation();
  const user = useAuthStore((s) => s.user);
  const [openSections, setOpenSections] = useState<Record<string, boolean>>({
    Analysis: true,
    Data: false,
  });

  const toggleSection = (label: string) => {
    setOpenSections((prev) => ({ ...prev, [label]: !prev[label] }));
  };

  const isActive = (path: string) => location.pathname === path;

  return (
    <Drawer
      variant="permanent"
      sx={{
        width: DRAWER_WIDTH,
        flexShrink: 0,
        '& .MuiDrawer-paper': {
          width: DRAWER_WIDTH,
          boxSizing: 'border-box',
        },
      }}
    >
      <Box sx={{ p: 2, display: 'flex', alignItems: 'center', gap: 1 }}>
        <Biotech sx={{ color: 'primary.main', fontSize: 32 }} />
        <Box>
          <Typography variant="h6" sx={{ fontWeight: 700, color: 'primary.main', lineHeight: 1.2 }}>
            RNAdetector
          </Typography>
          <Typography variant="caption" sx={{ color: 'text.secondary' }}>
            Analysis Platform
          </Typography>
        </Box>
      </Box>

      <Divider sx={{ borderColor: 'rgba(0, 229, 255, 0.08)' }} />

      <List component="nav" sx={{ px: 1, py: 1 }}>
        {navItems.map((item) => {
          if (item.adminOnly && !user?.admin) return null;

          if (item.children) {
            return (
              <React.Fragment key={item.label}>
                <ListItemButton onClick={() => toggleSection(item.label)} sx={{ borderRadius: 2, my: 0.25 }}>
                  <ListItemIcon sx={{ minWidth: 36, color: 'text.secondary' }}>
                    {item.icon}
                  </ListItemIcon>
                  <ListItemText
                    primary={item.label}
                    primaryTypographyProps={{ fontSize: '0.875rem', fontWeight: 500 }}
                  />
                  {openSections[item.label] ? <ExpandLess /> : <ExpandMore />}
                </ListItemButton>
                <Collapse in={openSections[item.label]} timeout="auto" unmountOnExit>
                  <List component="div" disablePadding>
                    {item.children.map((child) => (
                      <ListItemButton
                        key={child.path}
                        selected={isActive(child.path)}
                        onClick={() => navigate(child.path)}
                        sx={{ pl: 4, borderRadius: 2, my: 0.25 }}
                      >
                        <ListItemIcon sx={{ minWidth: 32, color: isActive(child.path) ? 'primary.main' : 'text.secondary' }}>
                          {child.icon}
                        </ListItemIcon>
                        <ListItemText
                          primary={child.label}
                          primaryTypographyProps={{ fontSize: '0.8125rem' }}
                        />
                      </ListItemButton>
                    ))}
                  </List>
                </Collapse>
              </React.Fragment>
            );
          }

          return (
            <ListItemButton
              key={item.path}
              selected={isActive(item.path!)}
              onClick={() => navigate(item.path!)}
              sx={{ borderRadius: 2, my: 0.25 }}
            >
              <ListItemIcon sx={{ minWidth: 36, color: isActive(item.path!) ? 'primary.main' : 'text.secondary' }}>
                {item.icon}
              </ListItemIcon>
              <ListItemText
                primary={item.label}
                primaryTypographyProps={{ fontSize: '0.875rem', fontWeight: 500 }}
              />
            </ListItemButton>
          );
        })}
      </List>
    </Drawer>
  );
}
