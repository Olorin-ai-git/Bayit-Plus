import React from 'react';
import { Chip, Typography, Divider, Box } from '@mui/material';

const Home: React.FC = () => {
  return (
    <Box>
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 2 }}>
        <Typography variant="h4" component="h2" sx={{ fontWeight: 600, color: 'text.primary' }}>
          Olorin Investigation Platform
        </Typography>
        <Chip label="v1.0.0" color="success" size="small" />
      </Box>
      <Divider sx={{ my: 2 }} />
    </Box>
  );
};

export default Home; 