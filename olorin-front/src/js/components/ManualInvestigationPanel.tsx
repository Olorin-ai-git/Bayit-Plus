import React, { useRef, useEffect, useState } from 'react';
import { Box, Collapse } from '@mui/material';
import RiskScoreDisplay from './RiskScoreDisplay';
import InvestigationSteps from './InvestigationSteps';
import { InvestigationStep } from '../types/RiskAssessment';
import { InvestigationStepId, StepStatus } from '../constants/definitions';

interface ManualInvestigationPanelProps {
  autonomousMode: boolean;
  stepStates: InvestigationStep[];
  selectedInvestigationSteps: InvestigationStep[];
  currentStep: InvestigationStepId;
  currentStepIndex: number;
  isLoading: boolean;
  isInvestigationClosed: boolean;
  stepStartTimes: Record<string, Date>;
  stepEndTimes: Record<string, Date>;
}

const ManualInvestigationPanel: React.FC<ManualInvestigationPanelProps> = ({
  autonomousMode,
  stepStates,
  selectedInvestigationSteps,
  currentStep,
  currentStepIndex,
  isLoading,
  isInvestigationClosed,
  stepStartTimes,
  stepEndTimes,
}) => {
  // Splitter logic for risk score and steps
  const [riskScoreHeight, setRiskScoreHeight] = useState(180); // initial height in px
  const splitterRef = useRef<HTMLDivElement>(null);
  const draggingRef = useRef(false);

  useEffect(() => {
    /**
     * Handles mouse movement for resizing the risk score section.
     * @param {MouseEvent} e - The mouse event.
     */
    function onMouseMove(e: MouseEvent) {
      if (draggingRef.current && splitterRef.current) {
        const container = splitterRef.current.parentElement;
        if (container) {
          const containerRect = container.getBoundingClientRect();
          const containerTop = containerRect.top;
          const containerHeight = containerRect.height;
          const newHeight = Math.max(60, Math.min(containerHeight - 100, e.clientY - containerTop));
          setRiskScoreHeight(newHeight);
        }
      }
    }
    /**
     * Handles mouse up event to stop resizing.
     */
    function onMouseUp() {
      draggingRef.current = false;
    }
    window.addEventListener('mousemove', onMouseMove);
    window.addEventListener('mouseup', onMouseUp);
    return function cleanup() {
      window.removeEventListener('mousemove', onMouseMove);
      window.removeEventListener('mouseup', onMouseUp);
    };
  }, []);

  return (
    <Collapse in={!autonomousMode} timeout={400}>
      <Box
        sx={{
          display: !autonomousMode ? 'flex' : 'none',
          flexDirection: 'column',
          minHeight: 0,
          height: 'calc(100vh - 300px)', // Set explicit height for the container
          flex: 1,
          overflow: 'hidden',
          transition: 'opacity 0.3s ease-in-out'
        }}
      >
        <Box
          sx={{
            height: `${riskScoreHeight}px`,
            minHeight: '60px',
            overflow: 'hidden'
          }}
        >
          <RiskScoreDisplay steps={stepStates} />
        </Box>
        {/* Splitter bar between risk scores and steps */}
        <Box
          ref={splitterRef}
          sx={{
            height: '8px',
            cursor: 'row-resize',
            backgroundColor: 'divider',
            width: '100%',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            position: 'relative',
            zIndex: 10,
            '&:hover': {
              backgroundColor: 'action.hover'
            }
          }}
          tabIndex={0}
          role="separator"
          aria-orientation="horizontal"
          aria-label="Resize risk scores and steps"
          onMouseDown={() => {
            draggingRef.current = true;
          }}
          onKeyDown={(e) => {
            if (e.key === 'ArrowUp')
              setRiskScoreHeight((h) => Math.max(60, h - 10));
            if (e.key === 'ArrowDown')
              setRiskScoreHeight((h) => Math.min(window.innerHeight - 200, h + 10));
          }}
        >
          <Box sx={{ 
            height: '8px', 
            width: '96px', 
            backgroundColor: 'text.disabled', 
            borderRadius: 1 
          }} />
        </Box>
        {/* Steps section */}
        <Box
          sx={{ 
            flex: 1, 
            minHeight: 0,
            height: '100%', // Take remaining height from parent
            overflowY: 'auto',
            overflowX: 'hidden'
          }}
        >
          {stepStates.length > 0 && (
            <InvestigationSteps
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
        </Box>
      </Box>
    </Collapse>
  );
};

export default ManualInvestigationPanel; 