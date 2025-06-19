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
} from '@mui/material';
import { TransitionGroup } from 'react-transition-group';
import CloseIcon from '@mui/icons-material/Close';
import AddIcon from '@mui/icons-material/Add';
import RemoveIcon from '@mui/icons-material/Remove';
import { InvestigationStep } from '../types/RiskAssessment';

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

  const availableSteps = allSteps.filter(
    (step) => !localSelectedSteps.some((s) => s.id === step.id)
  );

  const handleAddStep = (step: InvestigationStep) => {
    setLocalSelectedSteps([...localSelectedSteps, step]);
  };

  const handleRemoveStep = (stepId: string) => {
    setLocalSelectedSteps(localSelectedSteps.filter((s) => s.id !== stepId));
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

  const handleSave = () => {
    onSave(localSelectedSteps);
    onClose();
  };

  const isRequired = (stepId: string) => {
    const requiredSteps = ['initialization', 'risk-assessment'];
    return requiredSteps.includes(stepId);
  };

  return (
    <Dialog
      open={isOpen}
      onClose={onClose}
      maxWidth="md"
      fullWidth
      PaperProps={{
        sx: {
          borderRadius: 2,
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
      
      <DialogContent dividers>
        <Box sx={{ display: 'flex', gap: 3 }}>
          {/* Available Steps */}
          <Box sx={{ flex: 1 }}>
            <Typography variant="subtitle2" sx={{ mb: 1, fontWeight: 600 }}>
              Available Steps
            </Typography>
            <Paper
              variant="outlined"
              sx={{
                minHeight: 200,
                p: 1,
                backgroundColor: theme.palette.grey[50],
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
          <Box sx={{ flex: 1 }}>
            <Typography variant="subtitle2" sx={{ mb: 1, fontWeight: 600 }}>
              Selected Steps (in order)
            </Typography>
            <Paper
              variant="outlined"
              sx={{
                minHeight: 200,
                p: 1,
                backgroundColor: theme.palette.grey[50],
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
                          secondaryAction={
                            !isRequired(step.id) && (
                              <Button
                                size="small"
                                variant="contained"
                                color="error"
                                onClick={() => handleRemoveStep(step.id)}
                                startIcon={<RemoveIcon />}
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
                                Remove
                              </Button>
                            )
                          }
                          sx={{
                            mb: 1,
                            backgroundColor: theme.palette.background.paper,
                            borderRadius: 1,
                            boxShadow: 1,
                            opacity: isRequired(step.id) ? 0.7 : 1,
                            transition: 'all 0.2s ease-in-out',
                            '&:hover': {
                              transform: 'translateX(-4px)',
                              boxShadow: 2,
                            },
                          }}
                        >
                          <ListItemText
                            primary={step.title}
                            secondary={isRequired(step.id) ? 'Required' : undefined}
                            secondaryTypographyProps={{
                              color: 'text.secondary',
                              variant: 'caption',
                            }}
                          />
                          <Box sx={{ display: 'flex', gap: 0.5, mr: 2 }}>
                            <IconButton
                              size="small"
                              onClick={() => handleMoveUp(index)}
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
                              onClick={() => handleMoveDown(index)}
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
                          </Box>
                        </ListItem>
                      </Collapse>
                    ))}
                  </TransitionGroup>
                )}
              </List>
            </Paper>
          </Box>
        </Box>
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
