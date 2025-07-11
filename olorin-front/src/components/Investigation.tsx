import React from 'react';
import { useParams } from 'react-router-dom';
import { Typography, Paper, Box } from '@mui/material';

const Investigation: React.FC = () => {
  const { id } = useParams<{ id: string }>();

  return (
    <Box sx={{ mt: 4 }}>
      <Paper sx={{ p: 3 }}>
        <Typography variant="h4" component="h1" gutterBottom>
          Investigation {id}
        </Typography>
        <Typography variant="body1" color="text.secondary">
          Investigation details will be displayed here.
        </Typography>
      </Paper>
    </Box>
  );
};

export default Investigation;
