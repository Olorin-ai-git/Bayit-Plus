/**
 * URL parameter utilities for preserving state during navigation
 */

/**
 * Gets current URL search parameters
 * @returns URLSearchParams object with current parameters
 */
export const getCurrentUrlParams = (): URLSearchParams => {
  return new URLSearchParams(window.location.search);
};

/**
 * Preserves current URL parameters when navigating to a new path
 * @param newPath - The new path to navigate to
 * @param additionalParams - Additional parameters to add/override
 * @returns The new path with preserved parameters
 */
export const preserveUrlParams = (
  newPath: string, 
  additionalParams?: Record<string, string>
): string => {
  const currentParams = getCurrentUrlParams();
  
  // Add any additional parameters
  if (additionalParams) {
    Object.entries(additionalParams).forEach(([key, value]) => {
      if (value) {
        currentParams.set(key, value);
      } else {
        currentParams.delete(key);
      }
    });
  }
  
  // Return path with parameters if any exist
  const paramString = currentParams.toString();
  if (paramString) {
    const separator = newPath.includes('?') ? '&' : '?';
    return `${newPath}${separator}${paramString}`;
  }
  
  return newPath;
};

/**
 * Checks if demo mode is active from URL parameters
 * @returns boolean indicating if demo mode is active
 */
export const isDemoModeActive = (): boolean => {
  const params = getCurrentUrlParams();
  return params.get('demo') === 'true';
};

/**
 * Gets the current auth ID from URL parameters
 * @returns string auth ID or null
 */
export const getCurrentAuthId = (): string | null => {
  const params = getCurrentUrlParams();
  return params.get('authid');
}; 