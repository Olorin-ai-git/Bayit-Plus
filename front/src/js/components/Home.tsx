import React from 'react';
import { Chip } from '@mui/material';
import styled from 'styled-components';

const StyledHR = styled.hr`
  border: 0;
  height: 1px;
  background: #e0e0e0;
  margin: 1rem 0;
`;

const Home: React.FC = () => {
  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '1rem' }}>
        <h2 style={{ margin: 0 }}>Olorin Investigation Platform</h2>
        <Chip label="v1.0.0" color="success" size="small" />
      </div>
      <StyledHR />
    </div>
  );
};

export default Home; 