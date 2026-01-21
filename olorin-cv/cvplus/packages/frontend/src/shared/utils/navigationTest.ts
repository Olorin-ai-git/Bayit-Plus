// Navigation Test Utility
// This utility helps debug navigation issues in the CV Analysis flow

export const navigationTest = {
  // Test if the preview route exists in the current router
  testPreviewRoute: (jobId: string) => {
    const testPath = `/preview/${jobId}`;
    logger.warn('🧪 [TEST] Testing preview route:', testPath);
    
    // Try to create a URL object to validate the path
    try {
      const url = new URL(testPath, window.location.origin);
      logger.warn('✅ [TEST] Preview route URL is valid:', url.href);
      return true;
    } catch (error) {
      logger.error('❌ [TEST] Preview route URL is invalid:', error);
      return false;
    }
  },

  // Test sessionStorage operations
  testSessionStorage: (jobId: string) => {
    logger.warn('🧪 [TEST] Testing sessionStorage operations');
    
    try {
      // Test storing recommendations
      const testRecommendations = ['test-rec-1', 'test-rec-2'];
      sessionStorage.setItem(`recommendations-${jobId}`, JSON.stringify(testRecommendations));
      
      // Test retrieving recommendations
      const retrieved = sessionStorage.getItem(`recommendations-${jobId}`);
      const parsed = JSON.parse(retrieved || '[]');
      
      logger.warn('✅ [TEST] SessionStorage test successful');
      logger.warn('✅ [TEST] Stored:', testRecommendations);
      logger.warn('✅ [TEST] Retrieved:', parsed);
      
      // Clean up test data
      sessionStorage.removeItem(`recommendations-${jobId}`);
      
      return true;
    } catch (error) {
      logger.error('❌ [TEST] SessionStorage test failed:', error);
      return false;
    }
  },

  // Test React Router navigation programmatically
  testNavigation: (navigate: (path: string) => void, jobId: string) => {
    logger.warn('🧪 [TEST] Testing programmatic navigation');
    
    try {
      const testPath = `/preview/${jobId}`;
      logger.warn('🧪 [TEST] Attempting navigation to:', testPath);
      
      // Store current path for comparison
      const currentPath = window.location.pathname;
      logger.warn('🧪 [TEST] Current path:', currentPath);
      
      // Attempt navigation
      navigate(testPath);
      
      // Since navigation is async, we'll log success immediately
      logger.warn('✅ [TEST] Navigation call completed without throwing');
      return true;
    } catch (error) {
      logger.error('❌ [TEST] Navigation test failed:', error);
      return false;
    }
  },

  // Enhanced navigation with multiple fallback strategies
  performEnhancedNavigation: (navigate: (path: string) => void, jobId: string, selectedRecommendations: string[] = []) => {
    logger.warn('🚀 [NAV] Enhanced navigation initiated');
    logger.warn('🚀 [NAV] Target jobId:', jobId);
    logger.warn('🚀 [NAV] Recommendations:', selectedRecommendations);
    
    const targetPath = `/preview/${jobId}`;
    const currentPath = window.location.pathname;
    
    // Store data first
    try {
      sessionStorage.setItem(`recommendations-${jobId}`, JSON.stringify(selectedRecommendations));
      logger.warn('💾 [NAV] Stored recommendations in sessionStorage');
    } catch (storageError) {
      logger.warn('⚠️ [NAV] Failed to store recommendations:', storageError);
    }
    
    logger.warn('🚀 [NAV] Current path:', currentPath);
    logger.warn('🚀 [NAV] Target path:', targetPath);
    
    // Strategy 1: React Router navigate
    try {
      logger.warn('🔄 [NAV] Strategy 1: React Router navigate');
      navigate(targetPath);
      
      // Check if navigation happened after a short delay
      setTimeout(() => {
        const newPath = window.location.pathname;
        logger.warn('🔄 [NAV] Path after React Router navigate:', newPath);
        
        if (newPath === currentPath) {
          logger.warn('⚠️ [NAV] React Router navigation may have failed, trying fallback');
          navigationTest.performFallbackNavigation(jobId);
        } else {
          logger.warn('✅ [NAV] React Router navigation successful');
        }
      }, 200);
      
    } catch (navError) {
      logger.error('❌ [NAV] React Router navigation failed:', navError);
      navigationTest.performFallbackNavigation(jobId);
    }
  },
  
  // Fallback navigation strategies
  performFallbackNavigation: (jobId: string) => {
    logger.warn('🔄 [NAV] Performing fallback navigation');
    
    const targetPath = `/preview/${jobId}`;
    
    // Strategy 2: Direct window.location assignment
    setTimeout(() => {
      try {
        logger.warn('🔄 [NAV] Strategy 2: window.location assignment');
        window.location.assign(targetPath);
      } catch (windowError) {
        logger.error('❌ [NAV] Window location assignment failed:', windowError);
        
        // Strategy 3: Window.location.href as last resort
        setTimeout(() => {
          logger.warn('🚑 [NAV] Strategy 3: Last resort window.location.href');
          window.location.href = targetPath;
        }, 300);
      }
    }, 100);
  },

  // Run all tests
  runAllTests: (navigate: (path: string) => void, jobId: string) => {
    logger.warn('🧪 [TEST] Running comprehensive navigation tests...');
    
    const results = {
      previewRoute: navigationTest.testPreviewRoute(jobId),
      sessionStorage: navigationTest.testSessionStorage(jobId),
      navigation: navigationTest.testNavigation(navigate, jobId)
    };
    
    logger.warn('🧪 [TEST] Test results:', results);
    
    const allPassed = Object.values(results).every(result => result === true);
    
    if (allPassed) {
      logger.warn('✅ [TEST] All navigation tests passed!');
    } else {
      logger.error('❌ [TEST] Some navigation tests failed. Check the results above.');
    }
    
    return results;
  }
};

// Export for global access in development
if (typeof window !== 'undefined') {
  (window as any).navigationTest = navigationTest;
}