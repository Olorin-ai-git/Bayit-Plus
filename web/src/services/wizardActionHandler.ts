/**
 * Wizard Action Handler - Re-export barrel
 * Actual implementation split into wizard/ directory for maintainability.
 */

export {
  setupWizardActionHandler,
  cleanupWizardActionHandler,
  useWizardActionHandler,
} from './wizard';

export type { WizardAction } from './wizard';
