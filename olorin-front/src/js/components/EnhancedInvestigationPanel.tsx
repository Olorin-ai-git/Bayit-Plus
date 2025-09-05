import React, { useState, useCallback } from 'react';
import {
  Paper,
  Typography,
  Box,
  Tabs,
  Tab,
  Badge,
  Alert,
  Fade
} from '@mui/material';
import {
  Person as SingleEntityIcon,
  Hub as MultiEntityIcon,
  AutoGraph as AdvancedIcon
} from '@mui/icons-material';
import { useTheme } from '@mui/material/styles';

// Import existing components
import EnhancedAutonomousInvestigationPanel from './EnhancedAutonomousInvestigationPanel';
import ManualInvestigationPanel from './ManualInvestigationPanel';

// Import new multi-entity components
import MultiEntityInvestigationPanel from './MultiEntityInvestigationPanel';
import { MultiEntityInvestigationResult } from '../types/multiEntityInvestigation';

import { InvestigationStep, LogLevel } from '../types/RiskAssessment';
import { InvestigationStepId } from '../constants/definitions';

interface EnhancedInvestigationPanelProps {
  // Single entity props
  autonomousMode: boolean;
  stepStates: InvestigationStep[];
  userId: string;
  selectedInputType: 'userId' | 'deviceId';
  investigationId: string;
  isLoading: boolean;
  timeRange: string;
  selectedInvestigationSteps: InvestigationStep[];
  investigationIdState: string;
  investigationStartTime: Date | null;
  currentStep: InvestigationStepId;
  currentStepIndex: number;
  isInvestigationClosed: boolean;
  stepStartTimes: Record<InvestigationStepId, Date | null>;
  stepEndTimes: Record<InvestigationStepId, Date | null>;
  
  // Callbacks
  addLog: (message: string, type: LogLevel) => void;
  closeInvestigation: () => Promise<void>;
  setIsInvestigationClosed: (closed: boolean) => void;
  setInvestigationEndTime: (time: Date) => void;
  setStepStates: (steps: InvestigationStep[]) => void;
}

enum InvestigationMode {
  SINGLE_AUTONOMOUS = 0,
  SINGLE_MANUAL = 1,
  MULTI_ENTITY = 2
}

const MODE_LABELS = [
  { label: 'Single Entity (Autonomous)', icon: <SingleEntityIcon /> },
  { label: 'Single Entity (Manual)', icon: <SingleEntityIcon /> },
  { label: 'Multi-Entity Investigation', icon: <MultiEntityIcon /> }
];

const EnhancedInvestigationPanel: React.FC<EnhancedInvestigationPanelProps> = ({
  autonomousMode,
  stepStates,
  userId,
  selectedInputType,
  investigationId,
  isLoading,
  timeRange,
  selectedInvestigationSteps,
  investigationIdState,
  investigationStartTime,
  currentStep,
  currentStepIndex,
  isInvestigationClosed,
  stepStartTimes,
  stepEndTimes,
  addLog,
  closeInvestigation,
  setIsInvestigationClosed,
  setInvestigationEndTime,
  setStepStates
}) => {
  const theme = useTheme();
  const [selectedMode, setSelectedMode] = useState<InvestigationMode>(
    autonomousMode ? InvestigationMode.SINGLE_AUTONOMOUS : InvestigationMode.SINGLE_MANUAL
  );
  const [multiEntityResults, setMultiEntityResults] = useState<MultiEntityInvestigationResult[]>([]);

  const handleModeChange = useCallback((_: React.SyntheticEvent, newMode: InvestigationMode) => {
    setSelectedMode(newMode);
    addLog(`Switched to ${MODE_LABELS[newMode].label}`, LogLevel.INFO);
  }, [addLog]);

  const handleMultiEntityComplete = useCallback((result: MultiEntityInvestigationResult) => {
    setMultiEntityResults(prev => [...prev, result]);
    addLog(`Multi-entity investigation completed: ${result.investigation_id}`, LogLevel.SUCCESS);
  }, [addLog]);

  const renderTabPanel = (mode: InvestigationMode, index: number) => (
    <div role="tabpanel" hidden={selectedMode !== index}>
      {selectedMode === index && (
        <Fade in={selectedMode === index} timeout={300}>
          <Box sx={{ py: 2 }}>
            {mode === InvestigationMode.SINGLE_AUTONOMOUS && (
              <EnhancedAutonomousInvestigationPanel
                autonomousMode={true}
                stepStates={stepStates}
                userId={userId}
                selectedInputType={selectedInputType}
                investigationId={investigationId}
                isLoading={isLoading}
                timeRange={timeRange}
                selectedInvestigationSteps={selectedInvestigationSteps}
                investigationIdState={investigationIdState}
                investigationStartTime={investigationStartTime}
                addLog={addLog}
                closeInvestigation={closeInvestigation}
                setIsInvestigationClosed={setIsInvestigationClosed}
                setInvestigationEndTime={setInvestigationEndTime}
                setStepStates={setStepStates}
              />
            )}
            
            {mode === InvestigationMode.SINGLE_MANUAL && (
              <ManualInvestigationPanel
                autonomousMode={false}
                stepStates={stepStates}
                selectedInvestigationSteps={selectedInvestigationSteps}
                currentStep={currentStep}
                currentStepIndex={currentStepIndex}
                isLoading={isLoading}
                isInvestigationClosed={isInvestigationClosed}
                stepStartTimes={stepStartTimes}
                stepEndTimes={stepEndTimes}
              />
            )}
            
            {mode === InvestigationMode.MULTI_ENTITY && (
              <MultiEntityInvestigationPanel
                onLog={addLog}
                onInvestigationComplete={handleMultiEntityComplete}
                existingInvestigations={multiEntityResults.map(r => r.investigation_id)}
              />
            )}
          </Box>
        </Fade>
      )}
    </div>
  );

  return (
    <Paper elevation={2} sx={{ width: '100%' }}>
      {/* Mode Selection Tabs */}
      <Box sx={{ borderBottom: 1, borderColor: 'divider' }}>
        <Tabs
          value={selectedMode}
          onChange={handleModeChange}
          variant="fullWidth"
          sx={{
            '& .MuiTab-root': {
              minHeight: 64,
              textTransform: 'none',
              fontSize: '0.9rem'
            }
          }}
        >
          <Tab
            icon={<SingleEntityIcon />}
            iconPosition="start"
            label="Single Entity (Auto)"
            disabled={isLoading}
          />
          <Tab
            icon={<SingleEntityIcon />}
            iconPosition="start"
            label="Single Entity (Manual)"
            disabled={isLoading}
          />
          <Tab
            icon={
              <Badge badgeContent={multiEntityResults.length} color="primary">
                <MultiEntityIcon />
              </Badge>
            }
            iconPosition="start"
            label="Multi-Entity"
            disabled={isLoading}
          />
        </Tabs>
      </Box>

      {/* Mode-Specific Alert */}
      {selectedMode === InvestigationMode.MULTI_ENTITY && (
        <Alert 
          severity="info" 
          sx={{ m: 2, mb: 0 }}
          icon={<AdvancedIcon />}
        >
          <Typography variant="body2">
            Multi-Entity Investigation mode allows you to investigate multiple related entities 
            simultaneously with cross-entity analysis and Boolean logic relationships.
          </Typography>
        </Alert>
      )}

      {/* Tab Panels */}
      {renderTabPanel(InvestigationMode.SINGLE_AUTONOMOUS, 0)}
      {renderTabPanel(InvestigationMode.SINGLE_MANUAL, 1)}
      {renderTabPanel(InvestigationMode.MULTI_ENTITY, 2)}
    </Paper>
  );
};

export default EnhancedInvestigationPanel;