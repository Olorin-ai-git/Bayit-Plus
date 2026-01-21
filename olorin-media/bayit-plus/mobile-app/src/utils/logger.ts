/**
 * Logger for Bayit+ Mobile App (iOS).
 *
 * Re-exports the shared logger with Sentry integration and correlation ID support.
 * This file exists for backward compatibility - new code should import directly
 * from '@bayit/shared-utils'.
 */

export {
  logger,
  initLoggerSentry,
  setCorrelationId,
  getCorrelationId,
  generateCorrelationId,
} from "@bayit/shared-utils";

export { default } from "@bayit/shared-utils";
