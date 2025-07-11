import React from 'react';
import { PencilSquareIcon } from '@heroicons/react/24/outline';
import { FaComments, FaBars } from 'react-icons/fa';
import {
  Box,
  Typography,
  Button,
  TextField,
  Select,
  MenuItem,
  FormControl,
  InputLabel,
  Paper,
  IconButton,
  Tooltip,
  useTheme,
  Collapse,
  Fade,
  Switch,
  Divider,
} from '@mui/material';
import Stopwatch from './Stopwatch';

/* eslint-disable @typescript-eslint/no-unused-vars */
interface Props {
  isSidebarOpen: boolean;
  setIsSidebarOpen: (open: boolean) => void;
  setIsEditModalOpen: (open: boolean) => void;
  isLoading: boolean;
  userId: string;
  setUserId: (id: string) => void;
  handleSubmit: (event: React.FormEvent) => void;
  cancelledRef: React.MutableRefObject<boolean>;
  closeInvestigation: () => void;
  startTime?: Date | null;
  endTime?: Date | null;
  isChatSidebarOpen: boolean;
  setIsChatSidebarOpen: (open: boolean) => void;
  currentInvestigationId: string;
  timeRange: string;
  onTimeRangeChange: (value: string) => void;
  selectedInputType: 'userId' | 'deviceId';
  setSelectedInputType: (type: 'userId' | 'deviceId') => void;
  autonomousMode: boolean;
  setAutonomousMode: (mode: boolean) => void;
}
/* eslint-enable @typescript-eslint/no-unused-vars */

/**
 * Header component for the investigation page
 * @param {Props} props - Component props
 * @returns {JSX.Element} The rendered header component
 */
const InvestigationHeader: React.FC<Omit<Props, 'useMock'>> = ({
  isSidebarOpen,
  setIsSidebarOpen,
  setIsEditModalOpen,
  isLoading,
  userId,
  setUserId,
  handleSubmit,
  cancelledRef,
  closeInvestigation,
  startTime = null,
  endTime = null,
  isChatSidebarOpen,
  setIsChatSidebarOpen,
  currentInvestigationId,
  timeRange,
  onTimeRangeChange,
  selectedInputType,
  setSelectedInputType,
  autonomousMode,
  setAutonomousMode,
}) => {
  const theme = useTheme();
  const timeRangeOptions = [
    '1d',
    '3d',
    '10d',
    '30d',
    '60d',
    '120d',
    '180d',
    '360d',
  ];

  /**
   * Handles the Start investigation button click and triggers form submission.
   * @param {React.MouseEvent<HTMLButtonElement>} e - The click event
   */
  const handleButtonClick = (e: React.MouseEvent<HTMLButtonElement>) => {
    // Create a synthetic form event to match handleSubmit signature
    const { form } = e.currentTarget;
    if (form) {
      const event = new window.Event('submit', {
        bubbles: true,
        cancelable: true,
      });
      form.dispatchEvent(event);
    } else {
      // fallback: call handleSubmit with a dummy event
      handleSubmit(e as React.FormEvent);
    }
  };

  /**
   * Handles stopping the investigation by setting the cancelled flag and closing the investigation.
   */
  const handleStopInvestigation = () => {
    cancelledRef.current = true;
    closeInvestigation();
  };

  return (
    <Paper
      sx={{ p: 3, mb: 3, backgroundColor: 'background.paper' }}
      elevation={1}
    >
      <Box
        sx={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'flex-start',
          mb: 3,
        }}
      >
        <Box>
          <Typography
            variant="h4"
            component="h1"
            sx={{ fontWeight: 700, color: 'text.primary' }}
          >
            Fraud Investigation System
          </Typography>
          <Typography variant="body1" sx={{ color: 'text.secondary', mt: 1 }}>
            Investigation ID:{' '}
            <Typography
              component="span"
              sx={{ color: 'primary.main', fontWeight: 500 }}
            >
              {currentInvestigationId}
            </Typography>
          </Typography>
        </Box>

        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
          <FormControl size="small" sx={{ minWidth: 120 }}>
            <InputLabel id="time-range-label">Time Range</InputLabel>
            <Select
              labelId="time-range-label"
              id="timeRange"
              value={timeRange}
              label="Time Range"
              onChange={(e) => onTimeRangeChange(e.target.value)}
            >
              {timeRangeOptions.map((opt) => (
                <MenuItem key={opt} value={opt}>
                  {opt}
                </MenuItem>
              ))}
            </Select>
          </FormControl>

          <Fade in={!!startTime} timeout={400}>
            <Box sx={{ display: startTime ? 'block' : 'none' }}>
              {startTime && (
                <Stopwatch
                  startTime={startTime}
                  endTime={endTime}
                  label="Investigation Time"
                  className="text-sm"
                  data-testid="stopwatch"
                />
              )}
            </Box>
          </Fade>

          <Box sx={{ display: 'flex', gap: 1 }}>
            <Tooltip title="Edit Steps">
              <IconButton
                onClick={() => setIsEditModalOpen(true)}
                color="default"
                disabled={isLoading}
                sx={{
                  backgroundColor: 'action.hover',
                  '&:hover': { backgroundColor: 'action.selected' },
                }}
                data-testid="edit-steps-btn"
              >
                <PencilSquareIcon style={{ width: 20, height: 20 }} />
              </IconButton>
            </Tooltip>

            <Tooltip title="Toggle Chat Sidebar">
              <IconButton
                onClick={() => setIsChatSidebarOpen(!isChatSidebarOpen)}
                color="default"
                sx={{
                  backgroundColor: 'action.hover',
                  '&:hover': { backgroundColor: 'action.selected' },
                }}
                data-testid="toggle-chat-btn"
              >
                {React.createElement(
                  FaComments as unknown as React.ElementType,
                  { size: 20 },
                )}
              </IconButton>
            </Tooltip>

            <Tooltip title="Toggle Logs Sidebar">
              <IconButton
                onClick={() => setIsSidebarOpen(!isSidebarOpen)}
                color="default"
                sx={{
                  backgroundColor: 'action.hover',
                  '&:hover': { backgroundColor: 'action.selected' },
                }}
                data-testid="toggle-logs-btn"
              >
                {React.createElement(FaBars as unknown as React.ElementType, {
                  size: 20,
                })}
              </IconButton>
            </Tooltip>
          </Box>
        </Box>
      </Box>

      <Collapse in={!isLoading} timeout={500}>
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
          {/* Investigation Mode Toggle */}
          <Box
            sx={{
              p: 2,
              background: `linear-gradient(135deg, ${theme.palette.primary.light}10 0%, ${theme.palette.primary.main}15 100%)`,
              border: `1px solid ${theme.palette.primary.light}30`,
              borderRadius: 1,
              transition: 'all 0.3s ease-in-out',
            }}
          >
            <Box
              sx={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                mb: 2,
              }}
            >
              <Box>
                <Typography
                  variant="h6"
                  sx={{ fontWeight: 600, color: 'text.primary' }}
                >
                  Investigation Mode
                </Typography>
                <Typography variant="body2" sx={{ color: 'text.secondary' }}>
                  {autonomousMode
                    ? 'Autonomous mode uses AI to run investigations automatically via WebSocket'
                    : 'Manual mode allows step-by-step investigation control'}
                </Typography>
              </Box>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                <Typography
                  variant="body2"
                  sx={{
                    fontWeight: 500,
                    color: !autonomousMode ? 'primary.main' : 'text.secondary',
                    transition: 'color 0.2s ease-in-out',
                  }}
                >
                  Manual
                </Typography>
                <Switch
                  checked={autonomousMode}
                  onChange={() => setAutonomousMode(!autonomousMode)}
                  disabled={isLoading}
                  color="secondary"
                  sx={{
                    '& .MuiSwitch-thumb': {
                      transition: 'all 0.2s ease-in-out',
                    },
                  }}
                />
                <Typography
                  variant="body2"
                  sx={{
                    fontWeight: 500,
                    color: autonomousMode ? 'primary.main' : 'text.secondary',
                    transition: 'color 0.2s ease-in-out',
                  }}
                >
                  Autonomous
                </Typography>
              </Box>
            </Box>

            {/* Entity Type Toggle */}
            <Box
              sx={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
              }}
            >
              <Box>
                <Typography
                  variant="body1"
                  sx={{ fontWeight: 500, color: 'text.primary' }}
                >
                  Entity Type
                </Typography>
                <Typography variant="body2" sx={{ color: 'text.secondary' }}>
                  {selectedInputType === 'userId'
                    ? 'Investigate by User ID for user-based analysis'
                    : 'Investigate by Device ID for device-based analysis'}
                </Typography>
              </Box>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                <Typography
                  variant="body2"
                  sx={{
                    fontWeight: 500,
                    color:
                      selectedInputType === 'userId'
                        ? 'primary.main'
                        : 'text.secondary',
                    transition: 'color 0.2s ease-in-out',
                  }}
                >
                  User ID
                </Typography>
                <Switch
                  checked={selectedInputType === 'deviceId'}
                  onChange={() =>
                    setSelectedInputType(
                      selectedInputType === 'userId' ? 'deviceId' : 'userId',
                    )
                  }
                  disabled={isLoading}
                  color="primary"
                  sx={{
                    '& .MuiSwitch-thumb': {
                      transition: 'all 0.2s ease-in-out',
                    },
                  }}
                />
                <Typography
                  variant="body2"
                  sx={{
                    fontWeight: 500,
                    color:
                      selectedInputType === 'deviceId'
                        ? 'primary.main'
                        : 'text.secondary',
                    transition: 'color 0.2s ease-in-out',
                  }}
                >
                  Device ID
                </Typography>
              </Box>
            </Box>
          </Box>

          <Divider sx={{ my: 1 }} />

          <Box sx={{ display: 'flex', gap: 2, alignItems: 'flex-start' }}>
            <TextField
              fullWidth
              value={userId}
              onChange={(e) => setUserId(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && !isLoading && userId.trim() !== '') {
                  handleSubmit(e as React.FormEvent);
                }
              }}
              placeholder={
                selectedInputType === 'userId'
                  ? 'Enter User ID'
                  : 'Enter Device ID'
              }
              variant="outlined"
              size="medium"
            />

            <Button
              variant="contained"
              color="primary"
              onClick={handleButtonClick}
              disabled={userId.trim() === '' || isLoading}
              size="large"
              sx={{ px: 4, whiteSpace: 'nowrap' }}
            >
              Start investigation
            </Button>
          </Box>
        </Box>
      </Collapse>

      <Fade in={isLoading} timeout={300}>
        <Box
          sx={{
            display: isLoading ? 'flex' : 'none',
            alignItems: 'center',
            justifyContent: 'center',
            gap: 3,
            py: 1.5,
            minHeight: 56, // Maintain some height to prevent layout shift
          }}
        >
          {/* Entity Type Label when collapsed */}
          <Box
            sx={{
              display: 'flex',
              alignItems: 'center',
              gap: 1.5,
              px: 2,
              py: 0.5,
              backgroundColor: 'action.hover',
              borderRadius: 1,
              border: '1px solid',
              borderColor: 'divider',
            }}
          >
            <Typography
              variant="caption"
              sx={{
                color: 'text.secondary',
                fontWeight: 600,
                textTransform: 'uppercase',
                letterSpacing: 0.3,
                fontSize: 'inherit',
              }}
            >
              Entity
            </Typography>
            <Box
              sx={{
                px: 1,
                py: 0.25,
                backgroundColor: 'primary.main',
                borderRadius: 0.5,
                color: 'primary.contrastText',
              }}
            >
              <Typography
                variant="caption"
                sx={{ fontWeight: 600, fontSize: 'inherit' }}
              >
                {selectedInputType === 'userId' ? 'User ID' : 'Device ID'}
              </Typography>
            </Box>

            <Box
              sx={{
                width: '1px',
                height: '16px',
                backgroundColor: 'divider',
              }}
            />

            <Typography
              variant="caption"
              sx={{
                color: 'text.secondary',
                fontWeight: 600,
                textTransform: 'uppercase',
                letterSpacing: 0.3,
                fontSize: 'inherit',
              }}
            >
              Mode
            </Typography>
            <Box
              sx={{
                px: 1,
                py: 0.25,
                backgroundColor: 'primary.main',
                borderRadius: 0.5,
                color: 'primary.contrastText',
              }}
            >
              <Typography
                variant="caption"
                sx={{ fontWeight: 600, fontSize: 'inherit' }}
              >
                {autonomousMode ? 'Autonomous' : 'Manual'}
              </Typography>
            </Box>
          </Box>

          <Button
            variant="contained"
            color="error"
            onClick={handleStopInvestigation}
            size="medium"
            sx={{ px: 3, whiteSpace: 'nowrap' }}
          >
            Stop investigation
          </Button>
        </Box>
      </Fade>
    </Paper>
  );
};

export default InvestigationHeader;
