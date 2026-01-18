/**
 * Shared Hooks Stub
 *
 * DEVELOPMENT STUB ONLY - DO NOT USE IN PRODUCTION
 *
 * This stub exists for build compatibility when the shared directory is unavailable.
 * All hooks throw errors to ensure proper configuration before deployment.
 *
 * To use real hooks, ensure the shared directory is correctly linked
 * in metro.config.js.
 */

const STUB_ERROR = new Error(
  'Shared hooks stub active. Real shared hooks not linked. ' +
  'Ensure the shared directory exists at ../shared relative to mobile-app.'
);

export const useAuth = () => {
  throw STUB_ERROR;
};

export const usePermissions = () => {
  throw STUB_ERROR;
};

export const useDirection = () => {
  throw STUB_ERROR;
};

export const useDeviceLayout = () => {
  throw STUB_ERROR;
};
