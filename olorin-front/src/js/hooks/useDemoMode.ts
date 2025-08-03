import { useDemoMode as useDemoModeContext } from '../contexts/DemoModeContext';

// Re-export the context hook with a more convenient name
export const useDemoMode = () => {
  const context = useDemoModeContext();
  return context;
};

// Helper function to check if demo mode is active (for backward compatibility)
export const isDemoModeActive = (): boolean => {
  // This function is used in places where hooks can't be used
  // Check session storage directly
  try {
    const storedData = sessionStorage.getItem('olorin_demo_mode');
    if (storedData) {
      const demoData = JSON.parse(storedData);
      const now = Date.now();
      const DEMO_MODE_DURATION = 24 * 60 * 60 * 1000; // 24 hours
      
      return demoData.enabled && (now - demoData.timestamp) < DEMO_MODE_DURATION;
    }
  } catch (error) {
    console.error('Error checking demo mode:', error);
  }
  return false;
};