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
  Radio,
  RadioGroup,
  FormControlLabel,
  FormLabel,
  Paper,
  IconButton,
  Tooltip,
  useTheme,
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
    <Paper sx={{ p: 3, mb: 3, backgroundColor: 'background.paper' }} elevation={1}>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 3 }}>
        <Box>
          <Typography variant="h4" component="h1" sx={{ fontWeight: 700, color: 'text.primary' }}>
            ATO Fraud Investigation System
          </Typography>
          <Typography variant="body1" sx={{ color: 'text.secondary', mt: 1 }}>
            Investigation ID:{' '}
            <Typography component="span" sx={{ color: 'primary.main', fontWeight: 500 }}>
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
          
          <Box sx={{ display: 'flex', gap: 1 }}>
            <Tooltip title="Edit Steps">
              <IconButton
                onClick={() => setIsEditModalOpen(true)}
                color="default"
                disabled={isLoading}
                sx={{ 
                  backgroundColor: 'action.hover',
                  '&:hover': { backgroundColor: 'action.selected' }
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
                  '&:hover': { backgroundColor: 'action.selected' }
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
                  '&:hover': { backgroundColor: 'action.selected' }
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

      <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
        {/* Radio button group for input type selection */}
        <FormControl component="fieldset">
          <RadioGroup
            row
            value={selectedInputType}
            onChange={(e) => setSelectedInputType(e.target.value as 'userId' | 'deviceId')}
          >
            <FormControlLabel 
              value="userId" 
              control={<Radio />} 
              label="User ID"
              sx={{ mr: 4 }}
            />
            <FormControlLabel 
              value="deviceId" 
              control={<Radio />} 
              label="Device ID"
            />
          </RadioGroup>
        </FormControl>

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
          
          {!isLoading ? (
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
          ) : (
            <Button
              variant="contained"
              color="error"
              onClick={handleStopInvestigation}
              disabled={!isLoading}
              size="large"
              sx={{ px: 4, whiteSpace: 'nowrap' }}
            >
              Stop investigation
            </Button>
          )}
        </Box>
        
        {startTime && (
          <Box sx={{ display: 'flex', justifyContent: 'flex-end' }}>
            <Stopwatch
              startTime={startTime}
              endTime={endTime}
              label="Investigation Time"
              className="text-lg"
              data-testid="stopwatch"
            />
          </Box>
        )}
      </Box>
    </Paper>
  );
};

export default InvestigationHeader;
