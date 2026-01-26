/**
 * Logger for Bayit+ tvOS App
 *
 * Re-exports the shared logger with Sentry integration and correlation ID support.
 * This file exists for backward compatibility and platform-specific configuration.
 */

export {
  logger,
  initLoggerSentry,
  setCorrelationId,
  getCorrelationId,
  generateCorrelationId,
} from "@bayit/shared-utils";

export { default } from "@bayit/shared-utils";
