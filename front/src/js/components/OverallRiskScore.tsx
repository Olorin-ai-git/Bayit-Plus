import React from 'react';
import { Paper, Typography, Box, useTheme } from '@mui/material';

/**
 * Component to display the overall risk score
 * @param {Object} props - Component props
 * @param {number} props.score - The overall risk score
 * @returns {JSX.Element} The rendered overall risk score component
 */
interface OverallRiskScoreProps {
  score: number;
}

const OverallRiskScore: React.FC<OverallRiskScoreProps> = ({ score }) => {
  const theme = useTheme();
  
  return (
    <Paper
      elevation={2}
      sx={{
        p: 3,
        mb: 3,
        position: 'relative',
        backgroundColor: theme.palette.background.paper,
      }}
    >
      <Typography
        variant="h6"
        sx={{
          color: theme.palette.text.secondary,
          mb: 1,
        }}
      >
        Overall Risk Score
      </Typography>
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
        <Typography
          variant="h3"
          component="div"
          sx={{
            color: theme.palette.primary.main,
            fontWeight: 'bold',
          }}
          data-testid="risk-score-value"
        >
          {score.toFixed(2)}
        </Typography>
      </Box>
    </Paper>
  );
};

export default OverallRiskScore;
