import React from 'react';
import {
  InvestigationStep,
  InvestigationStepId,
} from '../types/RiskAssessment';
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
    <div className="flex flex-col h-full min-h-0 space-y-4">
      {/* Details Modal at top level */}
      {modalOpen && modalStep && (
        <>
          <style>{`
                        .modal-overlay {
                            position: fixed;
                            top: 0; left: 0; right: 0; bottom: 0;
                            background: rgba(0,0,0,0.4);
                            z-index: 1000;
                            display: flex;
                            align-items: center;
                            justify-content: center;
                        }
                        .modal-content {
                            background: #fff;
                            border-radius: 8px;
                            padding: 2rem;
                            width: 650px;
                            height: 650px;
                            max-width: 95vw;
                            max-height: 95vh;
                            overflow-y: auto;
                            box-shadow: 0 2px 24px rgba(0,0,0,0.2);
                        }
                    `}</style>
          <div className="modal-overlay" onClick={handleCloseModal}>
            <div className="modal-content" onClick={(e) => e.stopPropagation()}>
              <h3 className="text-lg font-bold mb-2">
                {modalStep.title} - Complete Agent Details
              </h3>
              <div
                className="text-gray-800 whitespace-pre-line overflow-auto"
                style={{ maxHeight: '530px' }}
              >
                <AgentDetailsTable
                  details={modalStep.details}
                  agentType={modalStep.agent}
                />
              </div>
              <div className="flex justify-center mt-2">
                <button
                  type="button"
                  className="px-6 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
                  onClick={handleCloseModal}
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        </>
      )}
      <style>
        {`
                @keyframes fadeInStep {
                    from { opacity: 0; transform: translateY(20px); }
                    to { opacity: 1; transform: translateY(0); }
                }
                .fade-in-step-card {
                    opacity: 0;
                    animation: fadeInStep 0.7s forwards;
                }
                `}
      </style>
      <div className="flex items-center mb-4">
        <h2 className="text-xl font-semibold">Investigation Steps</h2>
      </div>
      <div className="mb-6">
        <ProgressBar
          currentStep={currentStepIndex}
          steps={selectedInvestigationSteps.map((s) => ({ title: s.title }))}
        />
      </div>
      <div className="flex-1 min-h-0 overflow-y-auto">
        {stepStates.map((step) => (
          <div
            key={step.id}
            className="mb-4 fade-in-step-card"
            style={{
              animationDelay: `${step.id ? step.id.charCodeAt(0) * 0.15 : 0}s`,
            }}
          >
            <InvestigationStepComponent
              step={step}
              isActive={currentStep === step.id}
              startTime={stepStartTimes[step.id]}
              endTime={stepEndTimes[step.id]}
              onShowDetailsModal={handleShowDetailsModal}
            />
          </div>
        ))}
      </div>
    </div>
  );
};

export default InvestigationSteps;
