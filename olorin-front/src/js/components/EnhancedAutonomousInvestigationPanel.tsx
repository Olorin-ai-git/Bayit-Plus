import React from 'react';
import { Box, Collapse, Fade } from '@mui/material';
import AutonomousInvestigationPanel from './AutonomousInvestigationPanel';
import RiskScoreDisplay from './RiskScoreDisplay';
import { InvestigationStep, LogLevel } from '../types/RiskAssessment';
import { useFirebaseAnalytics } from '../hooks/useFirebaseAnalytics';

interface EnhancedAutonomousInvestigationPanelProps {
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
  addLog: (message: string, type: LogLevel) => void;
  closeInvestigation: () => Promise<void>;
  setIsInvestigationClosed: (closed: boolean) => void;
  setInvestigationEndTime: (time: Date) => void;
  setStepStates: (steps: InvestigationStep[]) => void;
}

const EnhancedAutonomousInvestigationPanel: React.FC<EnhancedAutonomousInvestigationPanelProps> = ({
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
  addLog,
  closeInvestigation,
  setIsInvestigationClosed,
  setInvestigationEndTime,
  setStepStates,
}) => {
  const analytics = useFirebaseAnalytics();
  const handleInvestigationComplete = () => {
    addLog(
      'Autonomous investigation completed successfully',
      LogLevel.SUCCESS,
    );
    setIsInvestigationClosed(true);
    setInvestigationEndTime(new Date());

    // Track autonomous investigation completion
    analytics.trackInvestigationEvent('autonomous_investigation_completed', investigationIdState, {
      user_id: userId,
      input_type: selectedInputType,
      time_range: timeRange,
      selected_steps: selectedInvestigationSteps.map(step => step.id),
      autonomous_mode: true,
      investigation_duration: investigationStartTime ? Date.now() - investigationStartTime.getTime() : null,
    });

    // Mark all steps as completed
    const updatedSteps = selectedInvestigationSteps.map(
      (step) => ({
        ...step,
        status: 'COMPLETED' as any,
        timestamp: new Date().toISOString(),
      }),
    );
    setStepStates(updatedSteps);
  };

  const handleInvestigationStart = () => {
    addLog(
      'Starting autonomous investigation...',
      LogLevel.INFO,
    );
  };

  const handleLog = (logEntry: any) => {
    console.log('onLog wrapper called with:', logEntry);
    if (logEntry && logEntry.message) {
      addLog(logEntry.message, logEntry.type);
    } else {
      console.warn('onLog called with invalid logEntry:', logEntry);
    }
  };

  return (
    <>
      {/* Autonomous Investigation Panel */}
      <Collapse in={autonomousMode} timeout={400}>
        <Box sx={{ display: autonomousMode ? 'block' : 'none' }}>
          <AutonomousInvestigationPanel
            entityId={userId}
            entityType={selectedInputType === 'userId' ? 'user_id' : 'device_id'}
            investigationId={investigationId || ''}
            isInvestigating={isLoading && autonomousMode}
            onLog={handleLog}
            closeInvestigation={closeInvestigation}
            onInvestigationComplete={handleInvestigationComplete}
            onInvestigationStart={handleInvestigationStart}
          />
        </Box>
      </Collapse>

      {/* Autonomous Mode: Show risk scores */}
      <Fade in={autonomousMode && stepStates.length > 0} timeout={600}>
        <Box sx={{ 
          mb: 3,
          display: (autonomousMode && stepStates.length > 0) ? 'block' : 'none'
        }}>
          {autonomousMode && stepStates.length > 0 && (
            <RiskScoreDisplay steps={stepStates} />
          )}
        </Box>
      </Fade>
    </>
  );
};

export default EnhancedAutonomousInvestigationPanel; 