import React, { useState, useEffect, useRef } from 'react';
import {
  Paper,
  Box,
  Typography,
  IconButton,
  Checkbox,
  FormControlLabel,
  Grid,
  Divider,
  useTheme,
  Fade,
  CircularProgress,
  Alert,
} from '@mui/material';
import {
  Close as CloseIcon,
  Build as BuildIcon,
  Settings as SettingsIcon,
} from '@mui/icons-material';
import { InvestigationStep } from '../types/RiskAssessment';
import { useStepTools } from '../hooks/useStepTools';

interface ToolsSidebarProps {
  isOpen: boolean;
  onClose: () => void;
  selectedStep: InvestigationStep | null;
  width?: number;
  onWidthChange?: (width: number) => void;
}

const MIN_WIDTH = 280;
const MAX_WIDTH = 500;

const ToolsSidebar: React.FC<ToolsSidebarProps> = ({
  isOpen,
  onClose,
  selectedStep,
  width: initialWidth = 320,
  onWidthChange,
}) => {
  const theme = useTheme();
  const [width, setWidth] = useState(initialWidth);
  const [isDragging, setIsDragging] = useState(false);
  const [shouldRender, setShouldRender] = useState(false);
  const [animationState, setAnimationState] = useState<
    'entering' | 'entered' | 'exiting' | 'exited'
  >(isOpen ? 'entered' : 'exited');

  const sidebarRef = useRef<HTMLDivElement>(null);
  const dragHandleRef = useRef<HTMLDivElement>(null);
  const startXRef = useRef<number>(0);
  const startWidthRef = useRef<number>(width);

  const [getToolsForStep, setToolsForStep, availableTools, isLoading, error] =
    useStepTools();

  // Handle resizing
  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (!isDragging) return;
      const dx = startXRef.current - e.clientX; // Reverse direction for right sidebar
      const newWidth = Math.max(
        MIN_WIDTH,
        Math.min(MAX_WIDTH, startWidthRef.current + dx),
      );
      setWidth(newWidth);
      if (onWidthChange) {
        onWidthChange(newWidth);
      }
    };

    const handleMouseUp = () => {
      setIsDragging(false);
      document.body.style.userSelect = '';
      document.body.style.cursor = '';
    };

    if (isDragging) {
      document.addEventListener('mousemove', handleMouseMove);
      document.addEventListener('mouseup', handleMouseUp);
      document.body.style.userSelect = 'none';
      document.body.style.cursor = 'col-resize';
    }

    return () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
    };
  }, [isDragging, onWidthChange]);

  // Handle visibility state for animations
  useEffect(() => {
    if (isOpen) {
      setShouldRender(true);
      setAnimationState('entering');
      // Small delay to ensure DOM is ready before starting animation
      const enterTimeout = setTimeout(() => setAnimationState('entered'), 10);
      return () => clearTimeout(enterTimeout);
    } else {
      setAnimationState('exiting');
      // Delay hiding to allow animation to complete
      const exitTimeout = setTimeout(() => {
        setAnimationState('exited');
        setShouldRender(false);
      }, 300);
      return () => clearTimeout(exitTimeout);
    }
  }, [isOpen]);

  const handleMouseDown = (e: React.MouseEvent) => {
    setIsDragging(true);
    startXRef.current = e.clientX;
    startWidthRef.current = width;
  };

  const handleToolToggle = (tool: string) => {
    if (!selectedStep) return;

    const currentTools = getSelectedTools();
    const newTools = currentTools.includes(tool)
      ? currentTools.filter((t) => t !== tool)
      : [...currentTools, tool];

    setToolsForStep(selectedStep.id, newTools);
  };

  const getSelectedTools = (): string[] => {
    if (!selectedStep) return [];
    return getToolsForStep(selectedStep.id, selectedStep.agent);
  };

  if (!shouldRender) return null;

  return (
    <Paper
      ref={sidebarRef}
      elevation={3}
      sx={{
        width: `${width}px`,
        display: 'flex',
        flexDirection: 'column',
        backgroundColor: theme.palette.background.paper,
        transition: isDragging
          ? 'none'
          : 'transform 0.3s ease-in-out, opacity 0.3s ease-in-out',
        height: '100%',
        position: 'relative',
        transform:
          animationState === 'entered' ? 'translateX(0)' : 'translateX(100%)',
        opacity: animationState === 'entered' ? 1 : 0,
      }}
    >
      {/* Drag handle */}
      <Box
        ref={dragHandleRef}
        onMouseDown={handleMouseDown}
        sx={{
          position: 'absolute',
          left: 0,
          top: 0,
          bottom: 0,
          width: '4px',
          cursor: 'col-resize',
          backgroundColor: 'transparent',
          '&:hover': {
            backgroundColor: theme.palette.primary.light,
          },
          '&:active': {
            backgroundColor: theme.palette.primary.main,
          },
          zIndex: 1,
        }}
      />

      {/* Header */}
      <Box
        sx={{
          p: 2,
          borderBottom: 1,
          borderColor: 'divider',
          display: 'flex',
          alignItems: 'center',
          gap: 1,
          backgroundColor: theme.palette.background.default,
        }}
      >
        <BuildIcon sx={{ color: 'primary.main' }} />
        <Typography variant="h6" sx={{ fontWeight: 600, flex: 1 }}>
          Tools Configuration
        </Typography>
        <IconButton
          onClick={onClose}
          size="small"
          sx={{ color: theme.palette.text.secondary }}
        >
          <CloseIcon />
        </IconButton>
      </Box>

      {/* Content */}
      <Box sx={{ flex: 1, p: 2, overflow: 'auto' }}>
        {selectedStep ? (
          <Fade in={true} timeout={300}>
            <Box>
              <Box sx={{ mb: 3 }}>
                <Typography
                  variant="subtitle1"
                  sx={{ fontWeight: 600, mb: 1, color: 'text.primary' }}
                >
                  {selectedStep.title}
                </Typography>
                <Typography variant="body2" sx={{ color: 'text.secondary' }}>
                  Agent: {selectedStep.agent}
                </Typography>
                <Typography
                  variant="caption"
                  sx={{ color: 'text.secondary', display: 'block', mt: 1 }}
                >
                  {selectedStep.description}
                </Typography>
              </Box>

              <Divider sx={{ mb: 3 }} />

              <Typography
                variant="subtitle2"
                sx={{ mb: 2, fontWeight: 600, color: 'text.primary' }}
              >
                Available Tools
              </Typography>

              {isLoading ? (
                <Box
                  sx={{ display: 'flex', alignItems: 'center', gap: 1, py: 2 }}
                >
                  <CircularProgress size={16} />
                  <Typography variant="body2" color="text.secondary">
                    Loading tools...
                  </Typography>
                </Box>
              ) : error ? (
                <Alert severity="error" sx={{ mb: 2 }}>
                  Error loading tools: {error}
                </Alert>
              ) : (
                <Grid container spacing={1}>
                  {availableTools.map((tool) => {
                    const isSelected = getSelectedTools().includes(tool);
                    return (
                      <Grid item xs={12} key={tool}>
                        <FormControlLabel
                          control={
                            <Checkbox
                              checked={isSelected}
                              onChange={() => handleToolToggle(tool)}
                              size="small"
                              sx={{
                                color: 'primary.main',
                                '&.Mui-checked': {
                                  color: 'primary.main',
                                },
                              }}
                            />
                          }
                          label={
                            <Typography
                              variant="body2"
                              sx={{ fontSize: '0.875rem' }}
                            >
                              {tool}
                            </Typography>
                          }
                          sx={{
                            m: 0,
                            width: '100%',
                            '&:hover': {
                              backgroundColor: theme.palette.action.hover,
                              borderRadius: 1,
                            },
                            transition: 'background-color 0.2s ease-in-out',
                          }}
                        />
                      </Grid>
                    );
                  })}
                </Grid>
              )}

              {!isLoading && !error && availableTools.length === 0 && (
                <Typography
                  variant="body2"
                  sx={{
                    color: 'text.secondary',
                    fontStyle: 'italic',
                    textAlign: 'center',
                    py: 4,
                  }}
                >
                  No tools available for this agent
                </Typography>
              )}
            </Box>
          </Fade>
        ) : (
          <Box
            sx={{
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              height: '50%',
            }}
          >
            <SettingsIcon
              sx={{ fontSize: 48, color: 'text.secondary', mb: 2 }}
            />
            <Typography
              variant="body1"
              sx={{ color: 'text.secondary', textAlign: 'center' }}
            >
              Select an investigation step to configure its tools
            </Typography>
          </Box>
        )}
      </Box>
    </Paper>
  );
};

export default ToolsSidebar;
