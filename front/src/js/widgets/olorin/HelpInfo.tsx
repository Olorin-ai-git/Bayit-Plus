import React, { ReactNode } from 'react';
import { Button, Chip } from '@mui/material';
import styled from 'styled-components';

// Simplified interface
interface Sandbox {
  logger?: {
    log: (message: string) => void;
  };
}

const StyledHR = styled.hr`
  border: 0;
  height: 1px;
  background: #e5e7eb;
  margin: 1rem 0;
`;

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
    <div style={{ padding: '1rem', maxWidth: '600px' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '1rem' }}>
        <h2 style={{ margin: 0 }}>Olorin Investigation Platform</h2>
        <Chip label="v1.0.0" color="success" size="small" />
      </div>
      
      <StyledHR />
      
      <div style={{ marginBottom: '1rem' }}>
        <h3>About</h3>
        <p>
          Olorin is an AI-powered fraud investigation platform that provides autonomous 
          and manual investigation capabilities for detecting and assessing security risks.
        </p>
      </div>
      
      <div style={{ marginBottom: '1rem' }}>
        <h3>Features</h3>
        <ul style={{ paddingLeft: '1.5rem' }}>
          <li>Autonomous investigation with multiple AI agents</li>
          <li>Real-time risk assessment and scoring</li>
          <li>Comprehensive logging and audit trails</li>
          <li>Integration with multiple data sources</li>
          <li>Customizable investigation workflows</li>
        </ul>
      </div>
      
      <div style={{ marginBottom: '1rem' }}>
        <h3>Getting Started</h3>
        <p>
          To start an investigation, navigate to the Investigations tab and create a new 
          investigation for a user or device ID. The system will automatically run 
          multiple agents to assess risk and provide detailed analysis.
        </p>
      </div>
      
      {children}
      
      <div style={{ marginTop: '1rem', textAlign: 'center' }}>
        <Button onClick={handleHelpClick} variant="outlined">
          Get More Help
        </Button>
      </div>
    </div>
  );
};

export default HelpInfo;
