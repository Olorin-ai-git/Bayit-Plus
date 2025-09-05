import React, { useState, useCallback, useEffect } from 'react';
import {
  Paper,
  Typography,
  Box,
  Button,
  Stepper,
  Step,
  StepLabel,
  StepContent,
  Alert,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  CircularProgress,
  Chip,
  LinearProgress,
  Fade,
  Collapse
} from '@mui/material';
import {
  PlayArrow as StartIcon,
  Stop as StopIcon,
  Refresh as RefreshIcon,
  Save as SaveIcon,
  Share as ShareIcon,
  Timeline as ProgressIcon
} from '@mui/icons-material';
import { useTheme } from '@mui/material/styles';

// Import our multi-entity components
import MultiEntityInvestigationStarter from './MultiEntityInvestigationStarter';
import EntityRelationshipBuilder from './EntityRelationshipBuilder';
import MultiEntityResults from './MultiEntityResults';
import CrossEntityInsightsPanel from './CrossEntityInsightsPanel';

// Import services and types
import { MultiEntityInvestigationClient, MultiEntityEventHandler } from '../services/MultiEntityInvestigationClient';
import {
  MultiEntityInvestigationRequest,
  MultiEntityInvestigationResult,
  MultiEntityInvestigationStatusUpdate,
  EntityDefinition,
  EntityRelationship,
  EntityType
} from '../types/multiEntityInvestigation';
import { LogLevel } from '../types/RiskAssessment';

interface MultiEntityInvestigationPanelProps {
  onLog?: (message: string, level: LogLevel) => void;
  onInvestigationComplete?: (result: MultiEntityInvestigationResult) => void;
  existingInvestigations?: string[];
}

enum InvestigationStep {
  SETUP = 0,
  RELATIONSHIPS = 1,
  EXECUTION = 2,
  RESULTS = 3
}

const STEP_LABELS = [
  'Setup Entities',
  'Build Relationships',
  'Execute Investigation',
  'Review Results'
];

const MultiEntityInvestigationPanel: React.FC<MultiEntityInvestigationPanelProps> = ({
  onLog,
  onInvestigationComplete,
  existingInvestigations = []
}) => {
  const theme = useTheme();
  const [activeStep, setActiveStep] = useState<InvestigationStep>(InvestigationStep.SETUP);
  const [investigationRequest, setInvestigationRequest] = useState<MultiEntityInvestigationRequest | null>(null);
  const [investigationResult, setInvestigationResult] = useState<MultiEntityInvestigationResult | null>(null);
  const [relationships, setRelationships] = useState<EntityRelationship[]>([]);
  const [isInvestigating, setIsInvestigating] = useState(false);
  const [investigationProgress, setInvestigationProgress] = useState(0);
  const [statusMessage, setStatusMessage] = useState('');
  const [showAdvancedMode, setShowAdvancedMode] = useState(false);
  const [client, setClient] = useState<MultiEntityInvestigationClient | null>(null);
  const [investigationId, setInvestigationId] = useState<string | null>(null);
  const [completedEntities, setCompletedEntities] = useState<string[]>([]);
  const [currentEntity, setCurrentEntity] = useState<string | null>(null);
  const [showStopDialog, setShowStopDialog] = useState(false);

  // Initialize client
  useEffect(() => {
    const multiEntityClient = new MultiEntityInvestigationClient({
      apiBaseUrl: '/api',
      wsBaseUrl: 'ws://localhost:8090'
    });
    setClient(multiEntityClient);

    return () => {
      multiEntityClient.stopInvestigation();
    };
  }, []);

  // Event handlers for investigation
  const eventHandlers: MultiEntityEventHandler = {
    onEntityStarted: useCallback((entityId: string) => {
      setCurrentEntity(entityId);
      setStatusMessage(`Starting investigation for ${entityId}...`);
      onLog?.(`Entity investigation started: ${entityId}`, LogLevel.INFO);
    }, [onLog]),

    onEntityCompleted: useCallback((entityId: string, result: any) => {
      setCompletedEntities(prev => [...prev, entityId]);
      setStatusMessage(`Completed investigation for ${entityId}`);
      onLog?.(`Entity investigation completed: ${entityId}`, LogLevel.SUCCESS);
    }, [onLog]),

    onEntityFailed: useCallback((entityId: string, error: string) => {
      setStatusMessage(`Failed to investigate ${entityId}: ${error}`);
      onLog?.(`Entity investigation failed: ${entityId} - ${error}`, LogLevel.ERROR);
    }, [onLog]),

    onCrossAnalysisStarted: useCallback(() => {
      setStatusMessage('Performing cross-entity analysis...');
      onLog?.('Cross-entity analysis started', LogLevel.INFO);
    }, [onLog]),

    onInvestigationCompleted: useCallback((result: MultiEntityInvestigationResult) => {
      setInvestigationResult(result);
      setIsInvestigating(false);
      setActiveStep(InvestigationStep.RESULTS);
      setStatusMessage('Investigation completed successfully');
      onLog?.('Multi-entity investigation completed', LogLevel.SUCCESS);
      onInvestigationComplete?.(result);
    }, [onLog, onInvestigationComplete]),

    onStatusUpdate: useCallback((update: MultiEntityInvestigationStatusUpdate) => {
      setInvestigationProgress(update.progress_percentage);
      setStatusMessage(update.message);
      setCompletedEntities(update.entities_completed);
      setCurrentEntity(update.current_entity || null);
    }, []),

    onError: useCallback((error: string) => {
      setStatusMessage(`Error: ${error}`);
      setIsInvestigating(false);
      onLog?.(error, LogLevel.ERROR);
    }, [onLog]),

    onLog: useCallback((message: string, level: LogLevel) => {
      onLog?.(message, level);
    }, [onLog])
  };

  // Handle investigation start from setup step
  const handleInvestigationSetup = useCallback((request: MultiEntityInvestigationRequest) => {
    setInvestigationRequest(request);
    
    // If advanced mode is enabled or user has defined relationships, go to relationship building
    if (request.metadata?.advanced_mode || relationships.length > 0) {
      setShowAdvancedMode(true);
      setActiveStep(InvestigationStep.RELATIONSHIPS);
    } else {
      // Skip relationship building and go directly to execution
      setActiveStep(InvestigationStep.EXECUTION);
    }
  }, [relationships]);

  // Handle relationship changes
  const handleRelationshipsChange = useCallback((updatedRelationships: EntityRelationship[]) => {
    setRelationships(updatedRelationships);
  }, []);

  // Start the actual investigation
  const startInvestigation = useCallback(async () => {
    if (!investigationRequest || !client) {
      onLog?.('No investigation request or client available', LogLevel.ERROR);
      return;
    }

    setIsInvestigating(true);
    setInvestigationProgress(0);
    setCompletedEntities([]);
    setCurrentEntity(null);
    setStatusMessage('Initializing investigation...');

    try {
      // Update request with relationships
      const finalRequest: MultiEntityInvestigationRequest = {
        ...investigationRequest,
        relationships
      };

      const id = await client.startInvestigation(finalRequest, eventHandlers);
      setInvestigationId(id);
      setStatusMessage('Investigation started successfully');
      onLog?.(`Investigation started with ID: ${id}`, LogLevel.SUCCESS);
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : 'Unknown error';
      setIsInvestigating(false);
      setStatusMessage(`Failed to start investigation: ${errorMsg}`);
      onLog?.(`Failed to start investigation: ${errorMsg}`, LogLevel.ERROR);
    }
  }, [investigationRequest, relationships, client, eventHandlers, onLog]);

  // Stop investigation
  const stopInvestigation = useCallback(() => {
    if (client) {
      client.stopInvestigation();
      setIsInvestigating(false);
      setStatusMessage('Investigation stopped by user');
      setInvestigationId(null);
      onLog?.('Investigation stopped', LogLevel.WARNING);
    }
    setShowStopDialog(false);
  }, [client, onLog]);

  // Navigate between steps
  const handleStepChange = useCallback((step: InvestigationStep) => {
    if (!isInvestigating) {
      setActiveStep(step);
    }
  }, [isInvestigating]);

  // Handle entity drill-down from results
  const handleEntityDrillDown = useCallback((entityId: string) => {
    onLog?.(`Drilling down into entity: ${entityId}`, LogLevel.INFO);
    // This could integrate with existing single-entity investigation components
    // For now, we'll just log the action
  }, [onLog]);

  // Handle pattern highlighting
  const handlePatternHighlight = useCallback((patternId: string) => {
    onLog?.(`Highlighting pattern: ${patternId}`, LogLevel.INFO);
    // This would highlight the pattern in visualizations
  }, [onLog]);

  // Reset investigation
  const resetInvestigation = useCallback(() => {
    setActiveStep(InvestigationStep.SETUP);
    setInvestigationRequest(null);
    setInvestigationResult(null);
    setRelationships([]);
    setIsInvestigating(false);
    setInvestigationProgress(0);
    setStatusMessage('');
    setCompletedEntities([]);
    setCurrentEntity(null);
    setInvestigationId(null);
    setShowAdvancedMode(false);
  }, []);

  // Export investigation results
  const exportResults = useCallback(() => {
    if (investigationResult) {
      const dataStr = JSON.stringify(investigationResult, null, 2);
      const dataBlob = new Blob([dataStr], { type: 'application/json' });
      const url = URL.createObjectURL(dataBlob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `multi-entity-investigation-${investigationResult.investigation_id}.json`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
      onLog?.('Investigation results exported', LogLevel.INFO);
    }
  }, [investigationResult, onLog]);

  const renderProgressIndicator = () => {
    if (!isInvestigating || !investigationRequest) return null;

    const totalEntities = investigationRequest.entities.length;
    const completedCount = completedEntities.length;

    return (
      <Fade in={isInvestigating}>
        <Paper elevation={1} sx={{ p: 2, mb: 3, bgcolor: theme.palette.primary.light, color: 'white' }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 2 }}>
            <CircularProgress size={24} color="inherit" />
            <Typography variant="body1" fontWeight="medium">
              {statusMessage}
            </Typography>
          </Box>
          
          <LinearProgress
            variant="determinate"
            value={investigationProgress}
            sx={{
              height: 8,
              borderRadius: 4,
              backgroundColor: 'rgba(255, 255, 255, 0.3)',
              '& .MuiLinearProgress-bar': {
                backgroundColor: 'white'
              }
            }}
          />
          
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mt: 1 }}>
            <Typography variant="body2">
              Progress: {investigationProgress.toFixed(0)}%
            </Typography>
            <Typography variant="body2">
              Entities: {completedCount}/{totalEntities}
            </Typography>
          </Box>

          {currentEntity && (
            <Typography variant="body2" sx={{ mt: 1 }}>
              Currently investigating: {currentEntity}
            </Typography>
          )}
        </Paper>
      </Fade>
    );
  };

  return (
    <Paper elevation={2} sx={{ p: 3 }}>
      {/* Header */}
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Typography variant="h5">
          Multi-Entity Investigation
        </Typography>
        <Box sx={{ display: 'flex', gap: 2 }}>
          {investigationResult && (
            <Button
              startIcon={<ShareIcon />}
              onClick={exportResults}
              variant="outlined"
            >
              Export
            </Button>
          )}
          <Button
            startIcon={<RefreshIcon />}
            onClick={resetInvestigation}
            disabled={isInvestigating}
          >
            Reset
          </Button>
        </Box>
      </Box>

      {/* Progress Indicator */}
      {renderProgressIndicator()}

      {/* Stepper */}
      <Stepper activeStep={activeStep} orientation="vertical">
        {/* Step 1: Setup Entities */}
        <Step>
          <StepLabel 
            onClick={() => handleStepChange(InvestigationStep.SETUP)}
            sx={{ cursor: isInvestigating ? 'default' : 'pointer' }}
          >
            {STEP_LABELS[InvestigationStep.SETUP]}
          </StepLabel>
          <StepContent>
            <MultiEntityInvestigationStarter
              onInvestigationStart={handleInvestigationSetup}
              availableEntityTypes={Object.values(EntityType)}
              existingInvestigations={existingInvestigations}
              isLoading={isInvestigating}
            />
          </StepContent>
        </Step>

        {/* Step 2: Build Relationships (Optional) */}
        <Step>
          <StepLabel 
            onClick={() => handleStepChange(InvestigationStep.RELATIONSHIPS)}
            sx={{ cursor: isInvestigating ? 'default' : 'pointer' }}
          >
            {STEP_LABELS[InvestigationStep.RELATIONSHIPS]}
            {showAdvancedMode && (
              <Chip label="Advanced" size="small" sx={{ ml: 1 }} />
            )}
          </StepLabel>
          <StepContent>
            {investigationRequest ? (
              <Box>
                <EntityRelationshipBuilder
                  entities={investigationRequest.entities}
                  relationships={relationships}
                  onRelationshipsChange={handleRelationshipsChange}
                  readonly={isInvestigating}
                />
                <Box sx={{ mt: 2, display: 'flex', gap: 2 }}>
                  <Button
                    variant="contained"
                    onClick={() => setActiveStep(InvestigationStep.EXECUTION)}
                    disabled={isInvestigating}
                  >
                    Continue to Execution
                  </Button>
                  <Button
                    onClick={() => setActiveStep(InvestigationStep.SETUP)}
                    disabled={isInvestigating}
                  >
                    Back to Setup
                  </Button>
                </Box>
              </Box>
            ) : (
              <Alert severity="warning">
                Please complete entity setup first.
              </Alert>
            )}
          </StepContent>
        </Step>

        {/* Step 3: Execute Investigation */}
        <Step>
          <StepLabel 
            onClick={() => handleStepChange(InvestigationStep.EXECUTION)}
            sx={{ cursor: isInvestigating ? 'default' : 'pointer' }}
          >
            {STEP_LABELS[InvestigationStep.EXECUTION]}
          </StepLabel>
          <StepContent>
            {investigationRequest ? (
              <Box>
                {/* Investigation Summary */}
                <Paper variant="outlined" sx={{ p: 2, mb: 3 }}>
                  <Typography variant="h6" gutterBottom>
                    Investigation Summary
                  </Typography>
                  <Typography variant="body2" color="text.secondary" gutterBottom>
                    Entities: {investigationRequest.entities.length} | 
                    Relationships: {relationships.length} | 
                    Logic: {investigationRequest.boolean_logic}
                  </Typography>
                  <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1, mt: 1 }}>
                    {investigationRequest.entities.map(entity => (
                      <Chip
                        key={entity.entity_id}
                        label={`${entity.display_name || entity.entity_id} (${entity.entity_type})`}
                        size="small"
                        color="primary"
                      />
                    ))}
                  </Box>
                </Paper>

                {/* Action Buttons */}
                <Box sx={{ display: 'flex', gap: 2 }}>
                  {!isInvestigating ? (
                    <Button
                      variant="contained"
                      startIcon={<StartIcon />}
                      onClick={startInvestigation}
                      size="large"
                    >
                      Start Investigation
                    </Button>
                  ) : (
                    <Button
                      variant="outlined"
                      startIcon={<StopIcon />}
                      onClick={() => setShowStopDialog(true)}
                      color="error"
                    >
                      Stop Investigation
                    </Button>
                  )}
                  <Button
                    onClick={() => setActiveStep(showAdvancedMode ? InvestigationStep.RELATIONSHIPS : InvestigationStep.SETUP)}
                    disabled={isInvestigating}
                  >
                    Back
                  </Button>
                </Box>
              </Box>
            ) : (
              <Alert severity="warning">
                Please complete entity setup first.
              </Alert>
            )}
          </StepContent>
        </Step>

        {/* Step 4: Results */}
        <Step>
          <StepLabel 
            onClick={() => handleStepChange(InvestigationStep.RESULTS)}
            sx={{ cursor: isInvestigating ? 'default' : 'pointer' }}
          >
            {STEP_LABELS[InvestigationStep.RESULTS]}
          </StepLabel>
          <StepContent>
            {investigationResult ? (
              <Box>
                <MultiEntityResults
                  investigationResult={investigationResult}
                  onEntityDrillDown={handleEntityDrillDown}
                  showCrossEntityInsights={true}
                  onExport={exportResults}
                />
                
                {/* Cross-Entity Insights */}
                <Box sx={{ mt: 3 }}>
                  <CrossEntityInsightsPanel
                    insights={investigationResult.cross_entity_analysis}
                    entities={investigationResult.entities}
                    relationships={relationships}
                    onPatternHighlight={handlePatternHighlight}
                    onEntityFocus={handleEntityDrillDown}
                  />
                </Box>
              </Box>
            ) : (
              <Alert severity="info">
                {isInvestigating 
                  ? 'Investigation in progress. Results will appear here when completed.'
                  : 'No investigation results available. Please run an investigation first.'
                }
              </Alert>
            )}
          </StepContent>
        </Step>
      </Stepper>

      {/* Stop Investigation Dialog */}
      <Dialog open={showStopDialog} onClose={() => setShowStopDialog(false)}>
        <DialogTitle>Stop Investigation</DialogTitle>
        <DialogContent>
          <Typography>
            Are you sure you want to stop the current investigation? 
            This action cannot be undone and you may lose partial results.
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setShowStopDialog(false)}>Cancel</Button>
          <Button onClick={stopInvestigation} color="error" variant="contained">
            Stop Investigation
          </Button>
        </DialogActions>
      </Dialog>
    </Paper>
  );
};

export default MultiEntityInvestigationPanel;