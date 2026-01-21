/**
 * Multimedia Backend Index
 * Main export file for multimedia backend functionality
  */

// Functions
export * from './functions';

// Services
export * from './services';

// Config
export { corsOptions } from './config/cors';

// Middleware  
export { withPremiumAccess } from './middleware/premiumGuard';

// Utils
export { sanitizeForFirestore, sanitizeErrorContext } from './utils/firestore-sanitizer';