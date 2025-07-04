import React, { ReactNode, useState } from 'react';
import { 
  AppBar, 
  Box,
  Button,
  Container,
  Drawer,
  IconButton,
  List,
  ListItem,
  ListItemButton,
  ListItemIcon,
  ListItemText,
  Toolbar,
  Typography,
  useTheme,
  useMediaQuery,
} from '@mui/material';
import {
  Menu as MenuIcon,
  Close as CloseIcon,
  Assignment as InvestigationsIcon,
  Search as InvestigationIcon,
  Settings as SettingsIcon,
  Code as MCPIcon,
} from '@mui/icons-material';
import {
  useLocation,
  useNavigate,
} from 'react-router-dom';
import { preserveUrlParams } from '../js/utils/urlParams';

interface LayoutProps {
  children: ReactNode;
}

const Layout: React.FC<LayoutProps> = ({ children }) => {
  const navigate = useNavigate();
  const location = useLocation();
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('md'));
  const [mobileOpen, setMobileOpen] = useState(false);

  const isActive = (path: string) => {
    if (path === '/investigation') {
      return location.pathname === '/investigation' || location.pathname.startsWith('/investigation/');
    }
    return location.pathname === path;
  };

  const navigationItems = [
    {
      path: '/investigations',
      label: 'Investigations',
      icon: <InvestigationsIcon />
    },
    {
      path: '/investigation',
      label: 'New Investigation',
      icon: <InvestigationIcon />
    },
    {
      path: '/mcp',
      label: 'Investigate with AI',
      icon: <MCPIcon />
    },
    {
      path: '/settings',
      label: 'Settings',
      icon: <SettingsIcon />
    }
  ];

  const handleDrawerToggle = () => {
    setMobileOpen(!mobileOpen);
  };

  const handleNavigation = (path: string) => {
    const pathWithParams = preserveUrlParams(path);
    navigate(pathWithParams);
    if (isMobile) {
      setMobileOpen(false);
    }
  };

  const drawer = (
    <Box sx={{ width: 250 }}>
      <Box sx={{ p: 2, borderBottom: 1, borderColor: 'divider' }}>
        <Typography variant="h6" component="div" sx={{ 
          fontWeight: 700,
          color: 'primary.main',
          display: 'flex',
          alignItems: 'center',
          gap: 1
        }}>
          <img 
            src="/assets/images/Olorin-Logo-With-Text-transparent.png" 
            alt="Olorin.ai" 
            style={{ height: 40, width: 'auto' }}
            onError={(e) => {
              const target = e.target as HTMLImageElement;
              target.src = '/logo.png';
            }}
          />
          <Box component="span" sx={{ color: 'text.primary', fontSize: '1.25rem' }}>
            Olorin<span style={{ color: theme.palette.primary.main }}>.ai</span>
          </Box>
        </Typography>
      </Box>
      <List>
        {navigationItems.map((item) => (
          <ListItem key={item.path} disablePadding>
            <ListItemButton
              onClick={() => handleNavigation(item.path)}
              selected={isActive(item.path)}
              sx={{
                mx: 1,
                borderRadius: 1,
                '&.Mui-selected': {
                  backgroundColor: 'primary.50',
                  color: 'primary.main',
                  '&:hover': {
                    backgroundColor: 'primary.100',
                  },
                },
              }}
            >
              <ListItemIcon sx={{ 
                color: isActive(item.path) ? 'primary.main' : 'inherit',
                minWidth: 40
              }}>
                {item.icon}
              </ListItemIcon>
              <ListItemText 
                primary={item.label} 
                primaryTypographyProps={{
                  fontWeight: isActive(item.path) ? 600 : 400
                }}
              />
            </ListItemButton>
          </ListItem>
        ))}
      </List>
    </Box>
  );

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', minHeight: '100vh' }}>
      <AppBar 
        position="sticky" 
        elevation={0}
        sx={{ 
          backgroundColor: 'white',
          borderBottom: 1,
          borderColor: 'divider',
          zIndex: theme.zIndex.drawer + 1
        }}
      >
        <Toolbar sx={{ justifyContent: 'space-between' }}>
          <Box sx={{ display: 'flex', alignItems: 'center' }}>
            {isMobile && (
              <IconButton
                color="inherit"
                aria-label="open drawer"
                edge="start"
                onClick={handleDrawerToggle}
                sx={{ mr: 2, color: 'text.primary' }}
              >
                <MenuIcon />
              </IconButton>
            )}
            
            <Typography 
              variant="h6" 
              component="div" 
              sx={{ 
                fontWeight: 700,
                color: 'text.primary',
                display: 'flex',
                alignItems: 'center',
                gap: 1
              }}
            >
              <img 
                src="/assets/images/Olorin-Logo-With-Text-transparent.png" 
                alt="Olorin.ai" 
                style={{ height: 40, width: 'auto' }}
                onError={(e) => {
                  const target = e.target as HTMLImageElement;
                  target.src = '/logo.png';
                }}
              />
              <Box component="span" sx={{ fontSize: '1.25rem' }}>
                Olorin<span style={{ color: theme.palette.primary.main }}>.ai</span>
              </Box>
            </Typography>
          </Box>

          {!isMobile && (
            <Box sx={{ display: 'flex', gap: 1 }}>
              {navigationItems.map((item) => (
                <Button
                  key={item.path}
                  variant={isActive(item.path) ? 'contained' : 'text'}
                  onClick={() => handleNavigation(item.path)}
                  startIcon={item.icon}
                  sx={{
                    textTransform: 'none',
                    fontWeight: 600,
                    borderRadius: 2,
                    px: 3,
                    py: 1,
                    '&.MuiButton-contained': {
                      backgroundColor: 'primary.main',
                      '&:hover': {
                        backgroundColor: 'primary.dark',
                      },
                    },
                    '&.MuiButton-text': {
                      color: 'text.secondary',
                      '&:hover': {
                        backgroundColor: 'primary.50',
                        color: 'primary.main',
                      },
                    },
                  }}
                >
                  {item.label}
                </Button>
              ))}
            </Box>
          )}
        </Toolbar>
      </AppBar>

      <Drawer
        variant="temporary"
        open={mobileOpen}
        onClose={handleDrawerToggle}
        ModalProps={{
          keepMounted: true, // Better open performance on mobile.
        }}
        sx={{
          display: { xs: 'block', md: 'none' },
          '& .MuiDrawer-paper': { 
            boxSizing: 'border-box', 
            width: 250,
            backgroundColor: 'background.paper'
          },
        }}
      >
        <Box sx={{ display: 'flex', justifyContent: 'flex-end', p: 1 }}>
          <IconButton onClick={handleDrawerToggle}>
            <CloseIcon />
          </IconButton>
        </Box>
        {drawer}
      </Drawer>

      <Box component="main" sx={{ flexGrow: 1, backgroundColor: 'background.default' }}>
        <Container maxWidth="xl" sx={{ py: 2, px: { xs: 2, sm: 3, md: 4 } }}>
          {children}
        </Container>
      </Box>
    </Box>
  );
};

export default Layout; 