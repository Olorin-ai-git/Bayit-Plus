import React, { useEffect, useState } from 'react';
import { Box, Typography, Chip } from '@mui/material';
import { AccessTime } from '@mui/icons-material';

interface StopwatchProps {
  startTime: Date | null;
  endTime?: Date | null;
  label?: string;
  className?: string;
}

/**
 * A component that displays elapsed time in a stopwatch format
 */
const Stopwatch: React.FC<StopwatchProps> = ({
  startTime,
  endTime = undefined,
  label = '',
  className = '',
}) => {
  const [elapsedTime, setElapsedTime] = useState<string>('0m 0s');
  // const theme = useTheme();

  useEffect(() => {
    if (!startTime) return;

    const updateElapsedTime = () => {
      const now = endTime || new Date();
      const durationMs = now.getTime() - startTime.getTime();
      const seconds = Math.floor(durationMs / 1000);
      const minutes = Math.floor(seconds / 60);
      const remainingSeconds = seconds % 60;
      setElapsedTime(`${minutes}m ${remainingSeconds}s`);
    };

    // Update immediately
    updateElapsedTime();

    // If there's no end time, update every second
    if (!endTime) {
      const interval = setInterval(updateElapsedTime, 1000);
      return () => clearInterval(interval);
    }
  }, [startTime, endTime]);

  return (
    <Box
      sx={{ display: 'flex', alignItems: 'center', gap: 1 }}
      className={className}
    >
      {label && (
        <Typography variant="body2" sx={{ color: 'text.secondary' }}>
          {label}:
        </Typography>
      )}
      <Chip
        icon={<AccessTime />}
        label={elapsedTime}
        size="small"
        sx={{
          fontFamily:
            '"JetBrains Mono", "Fira Code", "SF Mono", Monaco, "Cascadia Code", "Roboto Mono", Consolas, "Courier New", monospace',
          backgroundColor: 'action.hover',
          '& .MuiChip-label': {
            fontWeight: 500,
          },
          '& .MuiChip-icon': {
            fontSize: '1rem',
          },
        }}
      />
    </Box>
  );
};

export default Stopwatch;
