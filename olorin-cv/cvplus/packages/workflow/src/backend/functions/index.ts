/**
 * CVPlus Workflow Module - Firebase Functions Export
 * 
 * This module exports all workflow-related Firebase functions
 * that will be migrated from the main functions directory.
  */

// Job Management Functions
export { injectCompletedFeatures } from './injectCompletedFeatures';
export { skipFeature } from './skipFeature';
export { updateJobFeatures } from './updateJobFeatures';
export { monitorJobs } from './monitorJobs';

// Template and Placeholder Functions  
export { getTemplates } from './getTemplates';
export { updatePlaceholderValue } from './updatePlaceholderValue';

// Certification Functions
export { certificationBadges } from './certificationBadges';

// Role Profile Functions
export { 
  createRoleProfile,
  updateRoleProfile,
  getRoleProfile 
} from './roleProfileFunctions';