export {
  db,
  storage,
  auth,
  admin,
  initializeAdminApp,
  getSecureConfig
} from '@cvplus/core';

// Additional workflow-specific Firebase utilities can be added here if needed
export const WORKFLOW_COLLECTIONS = {
  JOBS: 'jobs',
  FEATURES: 'features',
  TEMPLATES: 'templates',
  ROLE_PROFILES: 'roleProfiles',
  CERTIFICATIONS: 'certifications',
  PLACEHOLDERS: 'placeholders'
} as const;