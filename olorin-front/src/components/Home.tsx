import React from 'react';
import { Typography, Button, Box } from '@mui/material';
import { useNavigate } from 'react-router-dom';

const Home: React.FC = () => {
  const navigate = useNavigate();

  return (
    <Box sx={{ textAlign: 'center', mt: 8 }}>
      <Typography variant="h3" component="h1" gutterBottom>
        Welcome to Olorin
      </Typography>
      <Typography variant="h5" component="h2" gutterBottom color="text.secondary">
        Your Intelligent Investigation Assistant
      </Typography>
      <Button
        variant="contained"
        color="primary"
        size="large"
        onClick={() => navigate('/investigation/new')}
        sx={{ mt: 4 }}
      >
        Start New Investigation
      </Button>
    </Box>
  );
};

export default Home; 