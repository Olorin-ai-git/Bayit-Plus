import React from 'react';
import {
  Box,
  Typography,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  Fade,
} from '@mui/material';
import { InvestigationStep } from '../types/RiskAssessment';
import { InvestigationStepId } from '../constants/definitions';
import InvestigationStepComponent from './InvestigationStep';
import ProgressBar from './ProgressBar';
import AgentDetailsTable from './AgentDetailsTable';

interface Props {
  stepStates: InvestigationStep[];
  selectedInvestigationSteps: InvestigationStep[];
  currentStep: InvestigationStepId;
  currentStepIndex: number;
  isLoading: boolean;
  isInvestigationClosed: boolean;
  stepStartTimes: Record<InvestigationStepId, Date | null>;
  stepEndTimes: Record<InvestigationStepId, Date | null>;
}

/**
 * Component for displaying investigation steps and progress
 * @param {Props} props - Component props
 * @returns {JSX.Element} The rendered investigation steps component
 */
const InvestigationSteps: React.FC<Props> = ({
  stepStates,
  selectedInvestigationSteps,
  currentStep,
  currentStepIndex,
  stepStartTimes,
  stepEndTimes,
}) => {
  const [modalOpen, setModalOpen] = React.useState(false);
  const [modalStep, setModalStep] = React.useState<InvestigationStep | null>(
    null,
  );

  /**
   * Opens the details modal for the selected investigation step.
   * @param {InvestigationStep} step - The step to show in the modal.
   */
  const handleShowDetailsModal = (step: InvestigationStep) => {
    setModalStep(step);
    setModalOpen(true);
  };
  /**
   * Closes the details modal.
   */
  const handleCloseModal = () => {
    setModalOpen(false);
    setModalStep(null);
  };

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', height: '100%', minHeight: 0 }}>
      {/* Details Modal */}
      <Dialog
        open={modalOpen}
        onClose={handleCloseModal}
        maxWidth="md"
        fullWidth
        PaperProps={{
          sx: {
            height: '650px',
            maxHeight: '95vh'
          }
        }}
      >
        {modalStep && (
          <>
            <DialogTitle sx={{ fontWeight: 600 }}>
              {modalStep.title} - Complete Agent Details
            </DialogTitle>
            <DialogContent sx={{ overflow: 'auto' }}>
              <AgentDetailsTable
                details={modalStep.details}
                agentType={modalStep.agent || 'Unknown Agent'}
              />
            </DialogContent>
            <DialogActions>
              <Button
                onClick={handleCloseModal}
                variant="contained"
                color="primary"
              >
                Close
              </Button>
            </DialogActions>
          </>
        )}
      </Dialog>

      <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
        <Typography variant="h5" sx={{ fontWeight: 600 }}>
          Investigation Steps
        </Typography>
      </Box>
      
      <Box sx={{ mb: 3 }}>
        <ProgressBar
          currentStep={currentStepIndex}
          steps={selectedInvestigationSteps.map((s) => ({ title: s.title }))}
        />
      </Box>
      
      <Box sx={{ flex: 1, minHeight: 0, overflowY: 'auto' }}>
        {stepStates.map((step, index) => (
          <Fade
            key={step.id}
            in={true}
            timeout={700}
            style={{
              transitionDelay: `${index * 150}ms`
            }}
          >
            <Box sx={{ mb: 2 }}>
              <InvestigationStepComponent
                step={step}
                isActive={currentStep === step.id}
                startTime={stepStartTimes[step.id]}
                endTime={stepEndTimes[step.id]}
                onShowDetailsModal={handleShowDetailsModal}
              />
            </Box>
          </Fade>
        ))}
      </Box>
    </Box>
  );
};

export default InvestigationSteps;
