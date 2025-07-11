import React, { ReactNode } from 'react';
import {
  Button,
  Chip,
  Typography,
  Divider,
  Box,
  List,
  ListItem,
  ListItemText,
} from '@mui/material';

// Simplified interface
interface Sandbox {
  logger?: {
    log: (message: string) => void;
  };
}

interface HelpInfoProps {
  sandbox?: Sandbox;
  children?: ReactNode;
}

const HelpInfo: React.FC<HelpInfoProps> = ({ sandbox, children }) => {
  const handleHelpClick = () => {
    sandbox?.logger?.log('Help button clicked');
    // Add help functionality here
  };

  return (
    <Box sx={{ p: 2, maxWidth: 600 }}>
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 2 }}>
        <Typography
          variant="h4"
          component="h2"
          sx={{ fontWeight: 600, color: 'text.primary' }}
        >
          Olorin Investigation Platform
        </Typography>
        <Chip label="v1.0.0" color="success" size="small" />
      </Box>

      <Divider sx={{ my: 2 }} />

      <Box sx={{ mb: 3 }}>
        <Typography
          variant="h5"
          component="h3"
          sx={{ fontWeight: 600, mb: 1, color: 'text.primary' }}
        >
          About
        </Typography>
        <Typography variant="body1" color="text.secondary">
          Olorin is an AI-powered fraud investigation platform that provides
          autonomous and manual investigation capabilities for detecting and
          assessing security risks.
        </Typography>
      </Box>

      <Box sx={{ mb: 3 }}>
        <Typography
          variant="h5"
          component="h3"
          sx={{ fontWeight: 600, mb: 1, color: 'text.primary' }}
        >
          Features
        </Typography>
        <List dense>
          <ListItem>
            <ListItemText primary="Autonomous investigation with multiple AI agents" />
          </ListItem>
          <ListItem>
            <ListItemText primary="Real-time risk assessment and scoring" />
          </ListItem>
          <ListItem>
            <ListItemText primary="Comprehensive logging and audit trails" />
          </ListItem>
          <ListItem>
            <ListItemText primary="Integration with multiple data sources" />
          </ListItem>
          <ListItem>
            <ListItemText primary="Customizable investigation workflows" />
          </ListItem>
        </List>
      </Box>

      <Box sx={{ mb: 3 }}>
        <Typography
          variant="h5"
          component="h3"
          sx={{ fontWeight: 600, mb: 1, color: 'text.primary' }}
        >
          Getting Started
        </Typography>
        <Typography variant="body1" color="text.secondary">
          To start an investigation, navigate to the Investigations tab and
          create a new investigation for a user or device ID. The system will
          automatically run multiple agents to assess risk and provide detailed
          analysis.
        </Typography>
      </Box>

      {children}

      <Box sx={{ mt: 2, textAlign: 'center' }}>
        <Button onClick={handleHelpClick} variant="outlined">
          Get More Help
        </Button>
      </Box>
    </Box>
  );
};

export default HelpInfo;
