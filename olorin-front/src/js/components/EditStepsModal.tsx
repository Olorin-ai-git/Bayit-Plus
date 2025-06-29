import React, { useState } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  Box,
  Typography,
  List,
  ListItem,
  ListItemText,
  IconButton,
  Paper,
  useTheme,
  Collapse,
  Fade,
  Checkbox,
  FormControlLabel,
  Grid,
  Slide,
  Divider,
} from '@mui/material';
import { TransitionGroup } from 'react-transition-group';
import CloseIcon from '@mui/icons-material/Close';
import AddIcon from '@mui/icons-material/Add';
import RemoveIcon from '@mui/icons-material/Remove';
import BuildIcon from '@mui/icons-material/Build';
import { InvestigationStep } from '../types/RiskAssessment';
import { useStepTools } from '../hooks/useStepTools';

interface EditStepsModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (selectedSteps: InvestigationStep[]) => void;
  allSteps: InvestigationStep[];
  selectedSteps: InvestigationStep[];
}

const EditStepsModal: React.FC<EditStepsModalProps> = ({
  isOpen,
  onClose,
  onSave,
  allSteps,
  selectedSteps,
}) => {
  const theme = useTheme();
  const [localSelectedSteps, setLocalSelectedSteps] = useState<InvestigationStep[]>(selectedSteps);
  const [selectedStepForTools, setSelectedStepForTools] = useState<InvestigationStep | null>(null);
  const [toolsUpdateTrigger, setToolsUpdateTrigger] = useState(0);
  const [getToolsForStep, setToolsForStep, availableTools, isLoading, error, hasStepOverrides] = useStepTools();

  const availableSteps = allSteps.filter(
    (step) => !localSelectedSteps.some((s) => s.id === step.id)
  );

  const handleAddStep = (step: InvestigationStep) => {
    setLocalSelectedSteps([...localSelectedSteps, step]);
  };

  const handleRemoveStep = (stepId: string) => {
    setLocalSelectedSteps(localSelectedSteps.filter((s) => s.id !== stepId));
    // Close tools panel if this step was selected
    if (selectedStepForTools?.id === stepId) {
      setSelectedStepForTools(null);
    }
  };

  const handleMoveUp = (index: number) => {
    if (index === 0) return;
    const newSteps = [...localSelectedSteps];
    [newSteps[index - 1], newSteps[index]] = [newSteps[index], newSteps[index - 1]];
    setLocalSelectedSteps(newSteps);
  };

  const handleMoveDown = (index: number) => {
    if (index === localSelectedSteps.length - 1) return;
    const newSteps = [...localSelectedSteps];
    [newSteps[index], newSteps[index + 1]] = [newSteps[index + 1], newSteps[index]];
    setLocalSelectedSteps(newSteps);
  };

  const handleStepClick = (step: InvestigationStep) => {
    // Toggle tools panel for the clicked step
    setSelectedStepForTools(selectedStepForTools?.id === step.id ? null : step);
  };

  const handleToolToggle = (stepId: string, tool: string) => {
    const currentTools = getSelectedTools(stepId, selectedStepForTools?.agent || '');
    const newTools = currentTools.includes(tool)
      ? currentTools.filter(t => t !== tool)
      : [...currentTools, tool];
    
    console.log(`Toggling tool "${tool}" for step "${stepId}":`, {
      currentTools,
      newTools,
      wasSelected: currentTools.includes(tool)
    });
    
    // Update the step tools (stores in session storage)
    setToolsForStep(stepId, newTools);
    
    // Trigger a re-render to update checkbox states
    setToolsUpdateTrigger(prev => prev + 1);
  };

  const handleSave = () => {
    onSave(localSelectedSteps);
    onClose();
  };

  const isRequired = (stepId: string) => {
    const requiredSteps = ['initialization', 'risk-assessment'];
    return requiredSteps.includes(stepId);
  };

  const getSelectedTools = (stepId: string, agentName: string): string[] => {
    // Include toolsUpdateTrigger to ensure fresh data after tool toggles
    return getToolsForStep(stepId, agentName);
  };

  return (
    <Dialog
      open={isOpen}
      onClose={onClose}
      maxWidth="xl"
      fullWidth
      PaperProps={{
        sx: {
          borderRadius: 2,
          minHeight: '70vh',
          maxHeight: '90vh',
        },
      }}
    >
      <DialogTitle sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <Typography variant="h6">Edit Investigation Steps</Typography>
        <IconButton
          onClick={onClose}
          size="small"
          sx={{ color: theme.palette.text.secondary }}
        >
          <CloseIcon />
        </IconButton>
      </DialogTitle>
      
      <DialogContent dividers sx={{ overflow: 'hidden' }}>
        <Box sx={{ 
          display: 'flex', 
          gap: 3, 
          position: 'relative',
          height: '100%',
          minHeight: '500px',
          overflow: 'hidden'
        }}>
          {/* Available Steps */}
          <Box sx={{ flex: 1, minWidth: 0 }}>
            <Typography variant="subtitle2" sx={{ mb: 1, fontWeight: 600 }}>
              Available Steps
            </Typography>
            <Paper
              variant="outlined"
              sx={{
                height: '500px',
                p: 1,
                backgroundColor: theme.palette.grey[50],
                overflow: 'auto'
              }}
            >
              <List dense>
                {availableSteps.length === 0 ? (
                  <Fade in={true} timeout={300}>
                    <ListItem>
                      <ListItemText
                        primary="No steps available"
                        primaryTypographyProps={{
                          color: 'text.secondary',
                          variant: 'body2',
                        }}
                      />
                    </ListItem>
                  </Fade>
                ) : (
                  <TransitionGroup>
                    {availableSteps.map((step) => (
                      <Collapse key={step.id} timeout={300}>
                        <ListItem
                          secondaryAction={
                            <Button
                              size="small"
                              variant="contained"
                              color="primary"
                              onClick={() => handleAddStep(step)}
                              startIcon={<AddIcon />}
                              sx={{ 
                                minWidth: 'auto',
                                transition: 'all 0.2s ease-in-out',
                                '&:hover': {
                                  transform: 'scale(1.05)',
                                  boxShadow: 3,
                                },
                                '&:active': {
                                  transform: 'scale(0.95)',
                                },
                              }}
                            >
                              Add
                            </Button>
                          }
                          sx={{
                            mb: 1,
                            backgroundColor: theme.palette.background.paper,
                            borderRadius: 1,
                            boxShadow: 1,
                            transition: 'all 0.2s ease-in-out',
                            '&:hover': {
                              transform: 'translateX(4px)',
                              boxShadow: 2,
                            },
                          }}
                        >
                          <ListItemText primary={step.title} />
                        </ListItem>
                      </Collapse>
                    ))}
                  </TransitionGroup>
                )}
              </List>
            </Paper>
          </Box>

          {/* Selected Steps */}
          <Box sx={{ flex: 1, minWidth: 0 }}>
            <Typography variant="subtitle2" sx={{ mb: 1, fontWeight: 600 }}>
              Selected Steps (in order)
            </Typography>
            <Paper
              variant="outlined"
              sx={{
                height: '500px',
                p: 1,
                backgroundColor: theme.palette.grey[50],
                overflow: 'auto'
              }}
            >
              <List dense>
                {localSelectedSteps.length === 0 ? (
                  <Fade in={true} timeout={300}>
                    <ListItem>
                      <ListItemText
                        primary="No steps selected"
                        primaryTypographyProps={{
                          color: 'text.secondary',
                          variant: 'body2',
                        }}
                      />
                    </ListItem>
                  </Fade>
                ) : (
                  <TransitionGroup>
                    {localSelectedSteps.map((step, index) => (
                      <Collapse key={step.id} timeout={300}>
                        <ListItem
                          onClick={() => handleStepClick(step)}
                          secondaryAction={
                            <Box sx={{ display: 'flex', gap: 0.5, alignItems: 'center' }}>
                              <IconButton
                                size="small"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleMoveUp(index);
                                }}
                                disabled={index === 0 || isRequired(step.id)}
                                sx={{
                                  transition: 'all 0.2s ease-in-out',
                                  '&:hover:not(:disabled)': {
                                    transform: 'translateY(-2px)',
                                    backgroundColor: 'primary.light',
                                    color: 'primary.contrastText',
                                  },
                                }}
                              >
                                ↑
                              </IconButton>
                              <IconButton
                                size="small"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleMoveDown(index);
                                }}
                                disabled={index === localSelectedSteps.length - 1 || isRequired(step.id)}
                                sx={{
                                  transition: 'all 0.2s ease-in-out',
                                  '&:hover:not(:disabled)': {
                                    transform: 'translateY(2px)',
                                    backgroundColor: 'primary.light',
                                    color: 'primary.contrastText',
                                  },
                                }}
                              >
                                ↓
                              </IconButton>
                              {!isRequired(step.id) && (
                                <Button
                                  size="small"
                                  variant="contained"
                                  color="error"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    handleRemoveStep(step.id);
                                  }}
                                  startIcon={<RemoveIcon />}
                                  sx={{ 
                                    minWidth: 'auto',
                                    ml: 1,
                                    transition: 'all 0.2s ease-in-out',
                                    '&:hover': {
                                      transform: 'scale(1.05)',
                                      boxShadow: 3,
                                    },
                                    '&:active': {
                                      transform: 'scale(0.95)',
                                    },
                                  }}
                                >
                                  Remove
                                </Button>
                              )}
                            </Box>
                          }
                          sx={{
                            mb: 1,
                            backgroundColor: selectedStepForTools?.id === step.id 
                              ? theme.palette.primary.light 
                              : theme.palette.background.paper,
                            borderRadius: 1,
                            boxShadow: selectedStepForTools?.id === step.id ? 3 : 1,
                            opacity: isRequired(step.id) ? 0.7 : 1,
                            cursor: 'pointer',
                            transition: 'all 0.2s ease-in-out',
                            '&:hover': {
                              transform: 'translateX(-4px)',
                              boxShadow: 2,
                            },
                          }}
                        >
                          <ListItemText
                            primary={
                              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                                <Typography variant="body2">{step.title}</Typography>
                                {selectedStepForTools?.id === step.id && (
                                  <BuildIcon sx={{ fontSize: 16, color: 'primary.main' }} />
                                )}
                              </Box>
                            }
                            secondary={isRequired(step.id) ? 'Required' : 'Click to configure tools'}
                            secondaryTypographyProps={{
                              color: 'text.secondary',
                              variant: 'caption',
                            }}
                          />
                        </ListItem>
                      </Collapse>
                    ))}
                  </TransitionGroup>
                )}
              </List>
            </Paper>
          </Box>

        </Box>

        {/* Tools Selection Panel - Positioned as overlay */}
        <Slide direction="left" in={selectedStepForTools !== null} mountOnEnter unmountOnExit>
          <Box sx={{ 
            position: 'fixed',
            right: 0,
            top: 0,
            bottom: 0,
            width: 350,
            zIndex: 1300,
            backgroundColor: 'background.paper',
            boxShadow: '-4px 0 20px rgba(0, 0, 0, 0.15)',
          }}>
              <Paper
                elevation={0}
                sx={{
                  height: '100%',
                  p: 3,
                  backgroundColor: theme.palette.background.paper,
                  borderRadius: 0,
                  overflow: 'auto',
                }}
              >
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 3 }}>
                  <BuildIcon sx={{ color: 'primary.main' }} />
                  <Typography variant="h6" sx={{ fontWeight: 600, flex: 1 }}>
                    Tools Configuration
                  </Typography>
                  <IconButton
                    size="small"
                    onClick={() => setSelectedStepForTools(null)}
                    sx={{ color: theme.palette.text.secondary }}
                  >
                    <CloseIcon />
                  </IconButton>
                </Box>
                
                {selectedStepForTools && (
                  <Fade in={true} timeout={300}>
                    <Box>
                      <Typography variant="body2" sx={{ mb: 2, color: 'text.secondary' }}>
                        Agent: {selectedStepForTools.agent}
                      </Typography>
                      
                      <Divider sx={{ mb: 3 }} />
                      
                      <Typography variant="subtitle2" sx={{ mb: 2, fontWeight: 600 }}>
                        Select Tools
                      </Typography>
                      
                      {isLoading ? (
                        <Typography variant="body2" sx={{ color: 'text.secondary', fontStyle: 'italic' }}>
                          Loading tools...
                        </Typography>
                      ) : error ? (
                        <Typography variant="body2" sx={{ color: 'error.main', fontStyle: 'italic' }}>
                          Error loading tools: {error}
                        </Typography>
                      ) : (
                        <Grid container spacing={1} key={toolsUpdateTrigger}>
                          {availableTools.map((tool) => {
                            const isSelected = getSelectedTools(selectedStepForTools.id, selectedStepForTools.agent).includes(tool);
                            return (
                              <Grid item xs={12} key={tool}>
                                <FormControlLabel
                                  control={
                                    <Checkbox
                                      checked={isSelected}
                                      onChange={() => handleToolToggle(selectedStepForTools.id, tool)}
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
                                    <Typography variant="body2" sx={{ fontSize: '0.875rem' }}>
                                      {tool}
                                    </Typography>
                                  }
                                  sx={{
                                    m: 0,
                                    width: '100%',
                                    transition: 'all 0.2s ease-in-out',
                                    '&:hover': {
                                      backgroundColor: 'action.hover',
                                      borderRadius: 1,
                                    },
                                  }}
                              />
                            </Grid>
                            );
                          })}
                        </Grid>
                      )}
                      
                      <Box sx={{ 
                        mt: 3, 
                        p: 2, 
                        backgroundColor: theme.palette.grey[100],
                        border: `1px solid ${theme.palette.grey[300]}`,
                        borderRadius: 1 
                      }}>
                        <Typography variant="body2" sx={{ 
                          color: theme.palette.text.primary,
                          fontSize: '0.875rem',
                          fontWeight: 500,
                          display: 'flex',
                          alignItems: 'center',
                          gap: 1
                        }}>
                          💡 These settings override global agent tool preferences and are saved automatically.
                        </Typography>
                      </Box>
                    </Box>
                  </Fade>
                )}
              </Paper>
            </Box>
          </Slide>
      </DialogContent>
      
      <DialogActions sx={{ px: 3, py: 2 }}>
        <Button onClick={onClose} color="inherit">
          Cancel
        </Button>
        <Button onClick={handleSave} variant="contained" color="primary">
          Save Changes
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default EditStepsModal;
