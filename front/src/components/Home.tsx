import React from 'react';
import { Typography, Button, Box, Card, CardContent, Grid, useTheme } from '@mui/material';
import { useNavigate } from 'react-router-dom';
import {
  Search as SearchIcon,
  BugReport as BugReportIcon,
  Settings as SettingsIcon,
  Extension as ExtensionIcon,
  ArrowForward as ArrowForwardIcon
} from '@mui/icons-material';

const Home: React.FC = () => {
  const navigate = useNavigate();
  const theme = useTheme();

  const features = [
    {
      icon: <SearchIcon sx={{ fontSize: 40, color: 'primary.main' }} />,
      title: 'Investigations',
      description: 'Manage and monitor your fraud investigations with real-time updates and comprehensive reporting.',
      action: () => navigate('/investigations'),
      color: 'primary'
    },
    {
      icon: <BugReportIcon sx={{ fontSize: 40, color: 'secondary.main' }} />,
      title: 'New Investigation',
      description: 'Start a new investigation with our intelligent agents and automated analysis tools.',
      action: () => navigate('/investigation'),
      color: 'secondary'
    },
    {
      icon: <SettingsIcon sx={{ fontSize: 40, color: 'info.main' }} />,
      title: 'Settings',
      description: 'Configure your investigation preferences, default agents, and tool mappings.',
      action: () => navigate('/settings'),
      color: 'info'
    },
    {
      icon: <ExtensionIcon sx={{ fontSize: 40, color: 'success.main' }} />,
      title: 'MCP Tools',
      description: 'Access Model Context Protocol tools for advanced data analysis and automation.',
      action: () => navigate('/mcp'),
      color: 'success'
    }
  ];

  return (
    <Box sx={{ p: 0 }}>
      {/* Hero Section */}
      <Box sx={{ 
        textAlign: 'center', 
        py: 8,
        background: 'linear-gradient(135deg, #faf5ff 0%, #e9d5ff 100%)',
        borderRadius: 3,
        mb: 6
      }}>
        <Box sx={{ display: 'flex', justifyContent: 'center', mb: 4 }}>
          <img 
            src="/assets/images/Olorin-Logo-Wizard-Only-transparent.png" 
            alt="Olorin.ai Wizard Logo" 
            style={{ height: 80, width: 'auto' }}
            onError={(e) => {
              const target = e.target as HTMLImageElement;
              target.src = '/logo.png';
            }}
          />
        </Box>
        <Typography 
          variant="h2" 
          component="h1" 
          sx={{ 
            fontWeight: 700, 
            color: 'text.primary', 
            mb: 2,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: 2
          }}
        >
          Welcome to Olorin<span style={{ color: theme.palette.primary.main }}>.ai</span>
        </Typography>
        <Typography 
          variant="h5" 
          component="h2" 
          sx={{ 
            color: 'text.secondary', 
            mb: 4,
            maxWidth: 600,
            mx: 'auto'
          }}
        >
          Your Intelligent Investigation Assistant
        </Typography>
        <Button
          variant="contained"
          size="large"
          onClick={() => navigate('/investigation')}
          endIcon={<ArrowForwardIcon />}
          sx={{ 
            px: 4, 
            py: 1.5,
            textTransform: 'none',
            fontWeight: 600,
            fontSize: '1.1rem',
            boxShadow: '0 4px 12px rgba(147, 51, 234, 0.3)',
            '&:hover': {
              boxShadow: '0 6px 16px rgba(147, 51, 234, 0.4)',
            },
          }}
        >
          Start New Investigation
        </Button>
      </Box>

      {/* Features Grid */}
      <Typography 
        variant="h4" 
        component="h2" 
        sx={{ 
          fontWeight: 600, 
          textAlign: 'center', 
          mb: 4,
          color: 'text.primary'
        }}
      >
        What would you like to do?
      </Typography>
      
      <Grid container spacing={4}>
        {features.map((feature, index) => (
          <Grid item xs={12} sm={6} md={3} key={index}>
            <Card 
              sx={{ 
                height: '100%',
                cursor: 'pointer',
                '&:hover': { 
                  boxShadow: '0 4px 12px rgba(147, 51, 234, 0.15)',
                  transform: 'translateY(-4px)'
                },
                transition: 'all 0.3s ease-in-out',
                border: '1px solid',
                borderColor: 'divider'
              }}
              onClick={feature.action}
            >
              <CardContent sx={{ 
                textAlign: 'center', 
                p: 4,
                display: 'flex',
                flexDirection: 'column',
                height: '100%'
              }}>
                <Box sx={{ mb: 3 }}>
                  {feature.icon}
                </Box>
                <Typography 
                  variant="h6" 
                  component="h3" 
                  sx={{ 
                    fontWeight: 600, 
                    mb: 2,
                    color: 'text.primary'
                  }}
                >
                  {feature.title}
                </Typography>
                <Typography 
                  variant="body2" 
                  color="text.secondary"
                  sx={{ 
                    flex: 1,
                    mb: 3
                  }}
                >
                  {feature.description}
                </Typography>
                <Button
                  variant="outlined"
                  endIcon={<ArrowForwardIcon />}
                  sx={{ 
                    textTransform: 'none',
                    fontWeight: 600,
                    borderColor: `${feature.color}.main`,
                    color: `${feature.color}.main`,
                    '&:hover': {
                      borderColor: `${feature.color}.dark`,
                      backgroundColor: `${feature.color}.50`,
                    }
                  }}
                >
                  Get Started
                </Button>
              </CardContent>
            </Card>
          </Grid>
        ))}
      </Grid>

      {/* Quick Stats */}
      <Box sx={{ mt: 8, p: 4, backgroundColor: 'grey.50', borderRadius: 3 }}>
        <Typography 
          variant="h5" 
          component="h3" 
          sx={{ 
            fontWeight: 600, 
            textAlign: 'center', 
            mb: 4,
            color: 'text.primary'
          }}
        >
          Platform Overview
        </Typography>
        <Grid container spacing={4} justifyContent="center">
          <Grid item xs={6} sm={3}>
            <Box sx={{ textAlign: 'center' }}>
              <Typography variant="h3" sx={{ fontWeight: 700, color: 'primary.main', mb: 1 }}>
                4
              </Typography>
              <Typography variant="body2" color="text.secondary">
                Core Modules
              </Typography>
            </Box>
          </Grid>
          <Grid item xs={6} sm={3}>
            <Box sx={{ textAlign: 'center' }}>
              <Typography variant="h3" sx={{ fontWeight: 700, color: 'secondary.main', mb: 1 }}>
                6+
              </Typography>
              <Typography variant="body2" color="text.secondary">
                AI Agents
              </Typography>
            </Box>
          </Grid>
          <Grid item xs={6} sm={3}>
            <Box sx={{ textAlign: 'center' }}>
              <Typography variant="h3" sx={{ fontWeight: 700, color: 'info.main', mb: 1 }}>
                10+
              </Typography>
              <Typography variant="body2" color="text.secondary">
                Analysis Tools
              </Typography>
            </Box>
          </Grid>
          <Grid item xs={6} sm={3}>
            <Box sx={{ textAlign: 'center' }}>
              <Typography variant="h3" sx={{ fontWeight: 700, color: 'success.main', mb: 1 }}>
                24/7
              </Typography>
              <Typography variant="body2" color="text.secondary">
                Monitoring
              </Typography>
            </Box>
          </Grid>
        </Grid>
      </Box>
    </Box>
  );
};

export default Home; 