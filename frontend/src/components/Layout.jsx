import React, { useState, useContext } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { 
  Box, Drawer, AppBar, Toolbar, List, Typography, Divider, 
  IconButton, ListItem, ListItemButton, ListItemIcon, ListItemText, 
  Avatar, Menu, MenuItem, Tooltip, useTheme, useMediaQuery
} from '@mui/material';
import {
  Menu as MenuIcon,
  Dashboard as DashboardIcon,
  ListAlt as ListIcon,
  AddLocationAlt as AddIcon,
  DirectionsTransit as StationIcon,
  Category as CategoryIcon,
  People as PeopleIcon,
  History as HistoryIcon,
  Settings as SettingsIcon,
  Brightness4 as DarkIcon,
  Brightness7 as LightIcon,
  ExitToApp as LogoutIcon
} from '@mui/icons-material';
import { AuthContext } from '../context/AuthContext';
import { ThemeContext } from '../context/ThemeContext';

const drawerWidth = 260;

// Reusable SVG Crest Logo for CUMTA
export const CumtaLogoSvg = ({ size = 40, color = '#006A4E' }) => (
  <svg width={size} height={size} viewBox="0 0 100 100" fill="none" xmlns="http://www.w3.org/2000/svg">
    <circle cx="50" cy="50" r="45" stroke={color} strokeWidth="6" />
    <path d="M50 8 C26.8 8 8 26.8 8 50 C8 73.2 26.8 92 50 92" stroke="#FFB81C" strokeWidth="4" strokeLinecap="round" />
    <rect x="35" y="30" width="30" height="25" rx="3" fill={color} />
    <circle cx="42" cy="65" r="5" fill="#FFB81C" />
    <circle cx="58" cy="65" r="5" fill="#FFB81C" />
    <rect x="30" y="55" width="40" height="5" rx="1" fill="#888" />
    <path d="M25 75 H75" stroke={color} strokeWidth="5" strokeLinecap="round" />
    <path d="M15 85 H85" stroke="#FFB81C" strokeWidth="3" strokeLinecap="round" />
  </svg>
);

export const ChennaiOneLogoSvg = ({ size = 35 }) => (
  <svg width={size} height={size} viewBox="0 0 100 100" fill="none" xmlns="http://www.w3.org/2000/svg">
    <circle cx="50" cy="50" r="45" fill="#0ea5e9" />
    <path d="M30 40 L50 20 L70 40 L58 40 L58 75 L42 75 L42 40 Z" fill="#ffffff" />
    <circle cx="50" cy="80" r="4" fill="#ffffff" />
  </svg>
);

export default function Layout({ children }) {
  const { user, logout } = useContext(AuthContext);
  const { mode, toggleThemeMode } = useContext(ThemeContext);
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('md'));
  const navigate = useNavigate();
  const location = useLocation();

  const [mobileOpen, setMobileOpen] = useState(false);
  const [anchorEl, setAnchorEl] = useState(null);

  const handleDrawerToggle = () => {
    setMobileOpen(!mobileOpen);
  };

  const handleProfileMenuOpen = (event) => {
    setAnchorEl(event.currentTarget);
  };

  const handleProfileMenuClose = () => {
    setAnchorEl(null);
  };

  const handleLogout = () => {
    handleProfileMenuClose();
    logout();
    navigate('/login');
  };

  const handleMenuClick = (path) => {
    navigate(path);
    if (isMobile) {
      setMobileOpen(false);
    }
  };

  // Configure menu items based on Roles
  const menuItems = [
    { text: 'Dashboard', icon: <DashboardIcon />, path: '/dashboard', roles: ['admin', 'field_inspector'] },
    { text: 'Observations Logs', icon: <ListIcon />, path: '/observations', roles: ['admin', 'field_inspector'] },
    { text: 'Submit Observation', icon: <AddIcon />, path: '/submit-observation', roles: ['admin', 'field_inspector'] },
    { text: 'Stations Manager', icon: <StationIcon />, path: '/stations', roles: ['admin'] },
    { text: 'Issue Categories', icon: <CategoryIcon />, path: '/categories', roles: ['admin'] },
    { text: 'Users Manager', icon: <PeopleIcon />, path: '/users', roles: ['admin'] },
    { text: 'Audit Logs', icon: <HistoryIcon />, path: '/audit-logs', roles: ['admin'] },
    { text: 'Settings', icon: <SettingsIcon />, path: '/settings', roles: ['admin', 'field_inspector'] }
  ];

  const drawerContent = (
    <Box sx={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
      {/* Branding Header */}
      <Box sx={{ 
        p: 2, 
        display: 'flex', 
        alignItems: 'center', 
        gap: 1.5,
        backgroundColor: theme.palette.mode === 'dark' ? '#0f172a' : '#006A4E',
        color: '#ffffff'
      }}>
        <CumtaLogoSvg size={42} color="#ffffff" />
        <Box>
          <Typography variant="h6" sx={{ fontSize: '1.05rem', fontWeight: 'bold', lineHeight: 1.1 }}>
            CUMTA QA
          </Typography>
          <Typography variant="caption" sx={{ opacity: 0.8, fontSize: '0.72rem' }}>
            Chennai Suburban Train QA
          </Typography>
        </Box>
      </Box>
      <Divider />
      
      {/* Navigation Options */}
      <Box sx={{ flexGrow: 1, overflowY: 'auto', py: 1.5 }}>
        <List sx={{ px: 1 }}>
          {menuItems
            .filter(item => item.roles.includes(user?.role))
            .map((item) => {
              const active = location.pathname === item.path;
              return (
                <ListItem key={item.text} disablePadding sx={{ mb: 0.5 }}>
                  <ListItemButton
                    onClick={() => handleMenuClick(item.path)}
                    sx={{
                      borderRadius: 2,
                      backgroundColor: active 
                        ? (theme.palette.mode === 'dark' ? 'rgba(255, 184, 28, 0.15)' : 'rgba(0, 106, 78, 0.08)')
                        : 'transparent',
                      color: active 
                        ? (theme.palette.mode === 'dark' ? '#FFB81C' : '#006A4E')
                        : theme.palette.text.primary,
                      '&:hover': {
                        backgroundColor: active
                          ? (theme.palette.mode === 'dark' ? 'rgba(255, 184, 28, 0.2)' : 'rgba(0, 106, 78, 0.12)')
                          : (theme.palette.mode === 'dark' ? 'rgba(255, 255, 255, 0.05)' : 'rgba(0, 0, 0, 0.03)'),
                      },
                    }}
                  >
                    <ListItemIcon sx={{ 
                      minWidth: 40,
                      color: active 
                        ? (theme.palette.mode === 'dark' ? '#FFB81C' : '#006A4E')
                        : theme.palette.text.secondary 
                    }}>
                      {item.icon}
                    </ListItemIcon>
                    <ListItemText 
                      primary={item.text} 
                      primaryTypographyProps={{ 
                        fontSize: '0.92rem',
                        fontWeight: active ? 'bold' : 'medium' 
                      }} 
                    />
                  </ListItemButton>
                </ListItem>
              );
            })}
        </List>
      </Box>

      {/* Footer Profile Info */}
      <Divider />
      <Box sx={{ p: 2, display: 'flex', alignItems: 'center', gap: 1.5 }}>
        <Avatar sx={{ 
          bgcolor: theme.palette.primary.main,
          color: '#ffffff',
          fontWeight: 'bold',
          width: 38,
          height: 38
        }}>
          {user?.username?.substring(0, 2).toUpperCase()}
        </Avatar>
        <Box sx={{ overflow: 'hidden', flexGrow: 1 }}>
          <Typography variant="body2" sx={{ fontWeight: 'bold', textOverflow: 'ellipsis', overflow: 'hidden', whiteSpace: 'nowrap' }}>
            {user?.username}
          </Typography>
          <Typography variant="caption" color="text.secondary" sx={{ textTransform: 'capitalize' }}>
            {user?.role?.replace('_', ' ')}
          </Typography>
        </Box>
        <IconButton size="small" color="error" onClick={logout} sx={{ ml: 'auto' }}>
          <LogoutIcon size="small" />
        </IconButton>
      </Box>
    </Box>
  );

  return (
    <Box sx={{ display: 'flex', minHeight: '100vh' }}>
      {/* Top Header App Bar */}
      <AppBar
        position="fixed"
        sx={{
          width: { md: `calc(100% - ${drawerWidth}px)` },
          ml: { md: `${drawerWidth}px` },
          bgcolor: theme.palette.background.paper,
          color: theme.palette.text.primary,
        }}
      >
        <Toolbar sx={{ justifyContent: 'space-between' }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <IconButton
              color="inherit"
              edge="start"
              onClick={handleDrawerToggle}
              sx={{ mr: 2, display: { md: 'none' } }}
            >
              <MenuIcon />
            </IconButton>
            <Typography variant="h6" noWrap component="div" sx={{ fontWeight: 'bold', fontSize: '1.2rem', display: { xs: 'none', sm: 'block' } }}>
              CUMTA suburban QA portal
            </Typography>
          </Box>

          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
            {/* Mode Switch */}
            <Tooltip title={mode === 'dark' ? 'Light Mode' : 'Dark Mode'}>
              <IconButton onClick={toggleThemeMode} color="inherit">
                {mode === 'dark' ? <LightIcon /> : <DarkIcon />}
              </IconButton>
            </Tooltip>

            {/* Profile Avatar Trigger */}
            <Tooltip title="Account settings">
              <IconButton onClick={handleProfileMenuOpen} size="small" sx={{ ml: 1 }}>
                <Avatar sx={{ width: 32, height: 32, bgcolor: '#006A4E', fontSize: '0.85rem' }}>
                  {user?.username?.substring(0, 2).toUpperCase()}
                </Avatar>
              </IconButton>
            </Tooltip>

            {/* Account Settings dropdown menu */}
            <Menu
              anchorEl={anchorEl}
              open={Boolean(anchorEl)}
              onClose={handleProfileMenuClose}
              transformOrigin={{ horizontal: 'right', vertical: 'top' }}
              anchorOrigin={{ horizontal: 'right', vertical: 'bottom' }}
            >
              <MenuItem onClick={() => { handleProfileMenuClose(); navigate('/settings'); }}>
                Profile Settings
              </MenuItem>
              <Divider />
              <MenuItem onClick={handleLogout} sx={{ color: 'error.main' }}>
                <ListItemIcon>
                  <LogoutIcon fontSize="small" color="error" />
                </ListItemIcon>
                Logout
              </MenuItem>
            </Menu>
          </Box>
        </Toolbar>
      </AppBar>

      {/* Side Navigation Drawers */}
      <Box
        component="nav"
        sx={{ width: { md: drawerWidth }, flexShrink: { md: 0 } }}
      >
        {/* Mobile Drawer */}
        <Drawer
          variant="temporary"
          open={mobileOpen}
          onClose={handleDrawerToggle}
          ModalProps={{ keepMounted: true }}
          sx={{
            display: { xs: 'block', md: 'none' },
            '& .MuiDrawer-paper': { boxSizing: 'border-box', width: drawerWidth },
          }}
        >
          {drawerContent}
        </Drawer>
        
        {/* Desktop Permanent Drawer */}
        <Drawer
          variant="permanent"
          sx={{
            display: { xs: 'none', md: 'block' },
            '& .MuiDrawer-paper': { boxSizing: 'border-box', width: drawerWidth },
          }}
          open
        >
          {drawerContent}
        </Drawer>
      </Box>

      {/* Main Content Area */}
      <Box
        component="main"
        sx={{
          flexGrow: 1,
          p: 3,
          width: { md: `calc(100% - ${drawerWidth}px)` },
          mt: '64px',
          backgroundColor: theme.palette.background.default,
          minHeight: 'calc(100vh - 64px)'
        }}
      >
        {children}
      </Box>
    </Box>
  );
}
