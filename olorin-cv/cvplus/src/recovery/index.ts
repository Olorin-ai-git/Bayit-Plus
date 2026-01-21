/**
 * Recovery Scripts Index
 * Central export point for all module recovery scripts
 */

// Level 2 Module Recovery Scripts
export { AuthModuleRecovery } from './auth.recovery';
export { I18nModuleRecovery } from './i18n.recovery';
export { CVProcessingModuleRecovery } from './cv-processing.recovery';
export { MultimediaModuleRecovery } from './multimedia.recovery';
export { AnalyticsModuleRecovery } from './analytics.recovery';
export { PremiumModuleRecovery } from './premium.recovery';
export { PublicProfilesModuleRecovery } from './public-profiles.recovery';
export { RecommendationsModuleRecovery } from './recommendations.recovery';
export { AdminModuleRecovery } from './admin.recovery';
export { WorkflowModuleRecovery } from './workflow.recovery';
export { PaymentsModuleRecovery } from './payments.recovery';

// Recovery Script Factory
import { ModuleRecoveryScript } from '../models';

export const createModuleRecoveryScript = (
  moduleId: string,
  workspacePath: string
): ModuleRecoveryScript => {
  switch (moduleId) {
    case 'auth':
      return new AuthModuleRecovery(workspacePath);
    case 'i18n':
      return new I18nModuleRecovery(workspacePath);
    case 'cv-processing':
      return new CVProcessingModuleRecovery(workspacePath);
    case 'multimedia':
      return new MultimediaModuleRecovery(workspacePath);
    case 'analytics':
      return new AnalyticsModuleRecovery(workspacePath);
    case 'premium':
      return new PremiumModuleRecovery(workspacePath);
    case 'public-profiles':
      return new PublicProfilesModuleRecovery(workspacePath);
    case 'recommendations':
      return new RecommendationsModuleRecovery(workspacePath);
    case 'admin':
      return new AdminModuleRecovery(workspacePath);
    case 'workflow':
      return new WorkflowModuleRecovery(workspacePath);
    case 'payments':
      return new PaymentsModuleRecovery(workspacePath);
    default:
      throw new Error(`Unsupported module: ${moduleId}`);
  }
};

// All supported Level 2 modules
export const LEVEL_2_MODULES = [
  'auth',
  'i18n',
  'cv-processing',
  'multimedia',
  'analytics',
  'premium',
  'public-profiles',
  'recommendations',
  'admin',
  'workflow',
  'payments'
] as const;

export type Level2Module = typeof LEVEL_2_MODULES[number];

// Recovery script registry
export const RECOVERY_SCRIPT_REGISTRY = LEVEL_2_MODULES.reduce((registry, moduleId) => {
  registry[moduleId] = (workspacePath: string) => createModuleRecoveryScript(moduleId, workspacePath);
  return registry;
}, {} as Record<Level2Module, (workspacePath: string) => ModuleRecoveryScript>);