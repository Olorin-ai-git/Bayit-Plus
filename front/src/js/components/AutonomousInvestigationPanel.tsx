import React, { useEffect, useState } from 'react';
import {
  Paper,
  Typography,
  Button,
  Box,
  LinearProgress,
  useTheme,
} from '@mui/material';
import { useSimpleAutonomousInvestigation } from '../hooks/useAutonomousInvestigation';
import { AutonomousInvestigationStatus } from '../types/AnalyzeResponse';

interface AutonomousInvestigationPanelProps {
  entityId: string;
  entityType: string;
  investigationId: string;
  onInvestigationComplete?: () => void;
  onInvestigationStart?: () => void;
}

const AutonomousInvestigationPanel: React.FC<AutonomousInvestigationPanelProps> = ({
  entityId,
  entityType,
  investigationId,
  onInvestigationComplete,
  onInvestigationStart,
}) => {
  const theme = useTheme();
  const {
    startInvestigation,
    checkStatus,
    status,
    isLoading,
    error,
    progress,
  } = useSimpleAutonomousInvestigation();

  const [isInvestigating, setIsInvestigating] = useState(false);
  const [statusCheckInterval, setStatusCheckInterval] = useState<NodeJS.Timeout | null>(null);

  useEffect(() => {
    return () => {
      if (statusCheckInterval) {
        clearInterval(statusCheckInterval);
      }
    };
  }, [statusCheckInterval]);

  useEffect(() => {
    if (status === AutonomousInvestigationStatus.COMPLETED) {
      if (statusCheckInterval) {
        clearInterval(statusCheckInterval);
        setStatusCheckInterval(null);
      }
      setIsInvestigating(false);
      onInvestigationComplete?.();
    }
  }, [status, statusCheckInterval, onInvestigationComplete]);

  const handleStartInvestigation = async () => {
    try {
      setIsInvestigating(true);
      onInvestigationStart?.();
      
      await startInvestigation(entityId, entityType, investigationId);
      
      // Start polling for status
      const interval = setInterval(async () => {
        await checkStatus(investigationId);
      }, 2000); // Check every 2 seconds
      
      setStatusCheckInterval(interval);
    } catch (err) {
      setIsInvestigating(false);
      console.error('Failed to start investigation:', err);
    }
  };

  const getButtonColor = () => {
    if (isLoading || isInvestigating) return 'primary';
    if (status === AutonomousInvestigationStatus.COMPLETED) return 'success';
    if (error) return 'error';
    return 'primary';
  };

  const getButtonText = () => {
    if (isLoading) return 'Starting...';
    if (isInvestigating) return 'Investigating...';
    if (status === AutonomousInvestigationStatus.COMPLETED) return 'Investigation Complete';
    if (error) return 'Investigation Failed';
    return 'Start Autonomous Investigation';
  };

  return (
    <Paper
      elevation={1}
      sx={{
        p: 3,
        mb: 3,
        border: 1,
        borderColor: 'divider',
      }}
    >
      <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 2 }}>
        <Typography variant="h6" sx={{ color: theme.palette.text.primary }}>
          Autonomous Investigation
        </Typography>
        <Button
          variant="contained"
          color={getButtonColor()}
          onClick={handleStartInvestigation}
          disabled={isLoading || isInvestigating || status === AutonomousInvestigationStatus.COMPLETED}
          sx={{ fontWeight: 500 }}
        >
          {getButtonText()}
        </Button>
      </Box>

      {(isInvestigating || status === AutonomousInvestigationStatus.IN_PROGRESS) && (
        <>
          <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 1 }}>
            <Typography variant="body2" sx={{ fontWeight: 500, color: theme.palette.text.secondary }}>
              Investigation Progress
            </Typography>
            <Typography variant="body2" sx={{ color: theme.palette.text.secondary }}>
              {progress}%
            </Typography>
          </Box>
          <LinearProgress
            variant="determinate"
            value={progress}
            sx={{
              height: 8,
              borderRadius: 1,
              backgroundColor: theme.palette.grey[200],
              '& .MuiLinearProgress-bar': {
                borderRadius: 1,
                backgroundColor: theme.palette.primary.main,
              },
            }}
          />
        </>
      )}

      {status && (
        <Typography
          variant="body2"
          sx={{
            mt: 2,
            color: theme.palette.text.secondary,
          }}
        >
          Status: {status}
        </Typography>
      )}

      {error && (
        <Typography
          variant="body2"
          sx={{
            mt: 2,
            color: theme.palette.error.main,
          }}
        >
          Error: {error}
        </Typography>
      )}
    </Paper>
  );
};

export default AutonomousInvestigationPanel; 