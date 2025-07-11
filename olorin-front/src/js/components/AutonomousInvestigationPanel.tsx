import React, { useEffect, useState } from 'react';
import {
  Paper,
  Typography,
  Box,
  LinearProgress,
  useTheme,
} from '@mui/material';
import { useSimpleAutonomousInvestigation } from '../hooks/useAutonomousInvestigation';
import { AutonomousInvestigationStatus } from '../types/AnalyzeResponse';
import { LogEntry } from '../types/RiskAssessment';

interface AutonomousInvestigationPanelProps {
  entityId: string;
  entityType: string;
  investigationId: string;
  onInvestigationComplete?: () => void;
  onInvestigationStart?: () => void;
  isInvestigating?: boolean;
  onLog?: (logEntry: LogEntry) => void;
  onStepUpdate?: (
    stepId: string,
    riskScore: number,
    llmThoughts: string,
  ) => void;
  closeInvestigation?: () => void;
}

const AutonomousInvestigationPanel: React.FC<
  AutonomousInvestigationPanelProps
> = ({
  entityId,
  entityType,
  investigationId,
  onInvestigationComplete,
  onInvestigationStart,
  isInvestigating = false,
  onLog,
  onStepUpdate,
  closeInvestigation,
}) => {
  const theme = useTheme();
  const {
    startInvestigation,
    status,
    error,
    progress,
    // isLoading,
    // debugState,
  } = useSimpleAutonomousInvestigation();

  const [hasStarted, setHasStarted] = useState(false);
  const [isCompleted, setIsCompleted] = useState(false);

  useEffect(() => {
    if (
      status === AutonomousInvestigationStatus.COMPLETED ||
      (status === 'COMPLETED' && progress >= 100)
    ) {
      setIsCompleted(true);
      onInvestigationComplete?.();

      // Call closeInvestigation after a short delay to allow progress bar to show 100%
      setTimeout(() => {
        closeInvestigation?.();
      }, 1000);
    }
  }, [status, progress, onInvestigationComplete, closeInvestigation]);

  // Start investigation when isInvestigating becomes true (but only once)
  useEffect(() => {
    if (isInvestigating && !hasStarted && !isCompleted) {
      // Start the autonomous investigation
      const handleStartInvestigation = async () => {
        try {
          setHasStarted(true);
          onInvestigationStart?.();
          await startInvestigation(
            entityId,
            entityType,
            investigationId,
            onLog,
          );
        } catch (err) {
          console.error('Failed to start autonomous investigation:', err);
          setHasStarted(false); // Reset if failed
        }
      };

      handleStartInvestigation();
    }
  }, [
    isInvestigating,
    hasStarted,
    isCompleted,
    investigationId,
    startInvestigation,
    entityId,
    entityType,
    onInvestigationStart,
    onLog,
  ]);

  // Reset states when investigation ID changes (new investigation)
  useEffect(() => {
    setHasStarted(false);
    setIsCompleted(false);
  }, [investigationId]);

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
      <Box sx={{ mb: 2 }}>
        <Typography
          variant="h6"
          sx={{ color: theme.palette.text.primary, mb: 1 }}
        >
          Autonomous Investigation
        </Typography>
        {(isCompleted ||
          status === 'COMPLETED' ||
          status === AutonomousInvestigationStatus.COMPLETED) && (
          <Typography
            variant="body2"
            sx={{ color: theme.palette.text.secondary }}
          >
            Investigation completed successfully
          </Typography>
        )}
      </Box>

      {/* Show progress bar when investigation is active OR completed (to show 100%) */}
      {(isInvestigating && hasStarted) || (isCompleted && progress >= 100) ? (
        <>
          <Box
            sx={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              mb: 1,
            }}
          >
            <Typography
              variant="body2"
              sx={{ fontWeight: 500, color: theme.palette.text.secondary }}
            >
              Investigation Progress
            </Typography>
            <Typography
              variant="body2"
              sx={{ color: theme.palette.text.secondary, fontWeight: 600 }}
            >
              {progress}%
            </Typography>
          </Box>
          <LinearProgress
            variant="determinate"
            value={progress}
            sx={{
              height: 10,
              borderRadius: 2,
              backgroundColor: theme.palette.grey[200],
              mb: 2,
              '& .MuiLinearProgress-bar': {
                borderRadius: 2,
                backgroundColor:
                  isCompleted && progress >= 100
                    ? theme.palette.success.main
                    : theme.palette.primary.main,
              },
            }}
          />
        </>
      ) : null}

      {status && (
        <Typography
          variant="body2"
          sx={{
            color: theme.palette.text.secondary,
            fontStyle: 'italic',
          }}
        >
          Status: {status}
        </Typography>
      )}

      {error && (
        <Typography
          variant="body2"
          sx={{
            mt: 1,
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
