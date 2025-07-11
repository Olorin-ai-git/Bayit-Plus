import { InvestigationStep } from '../types/RiskAssessment';
import { InvestigationStepId, StepStatus } from '../constants/definitions';

/**
 * Formats a timestamp into a consistent string format
 * @param {string | number | Date} timestamp - The timestamp to format
 * @returns {string} Formatted timestamp string
 */
export const formatTimestamp = (timestamp: string | number | Date): string =>
  new Date(timestamp).toLocaleString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    timeZoneName: 'short',
  });

/**
 * Updates the status of a step in the current steps array
 * @param {InvestigationStep[]} currentSteps - Current steps array
 * @param {InvestigationStepId} stepId - ID of the step to update
 * @param {StepStatus} status - New status for the step
 * @returns {Promise<void>} Promise that resolves when steps are updated
 */
export const updateStepStatus = async (
  currentSteps: InvestigationStep[],
  stepId: InvestigationStepId,
  status: StepStatus,
): Promise<InvestigationStep[]> =>
  currentSteps.map((step) => (step.id === stepId ? { ...step, status } : step));
