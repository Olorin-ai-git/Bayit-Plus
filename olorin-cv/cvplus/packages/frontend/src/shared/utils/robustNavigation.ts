/**
 * Robust Navigation Utility
 * Provides reliable navigation with multiple fallback strategies
 * Designed to handle navigation issues in CVAnalysisResults component
 */

import type { NavigateFunction } from 'react-router-dom';
import { navigationDebugger } from './navigationDebugger';

export interface NavigationOptions {
  replace?: boolean;
  timeout?: number;
  maxRetries?: number;
  onSuccess?: () => void;
  onFailure?: (error: Error) => void;
}

export const robustNavigation = {
  /**
   * Primary navigation method with robust error handling and fallbacks
   */
  navigateToPreview: async (
    navigate: NavigateFunction,
    jobId: string,
    selectedRecommendations: string[] = [],
    options: NavigationOptions = {}
  ): Promise<boolean> => {
    const {
      replace = true,
      timeout = 300,
      maxRetries = 2,
      onSuccess,
      onFailure
    } = options;
    
    const targetPath = `/preview/${jobId}`;
    
    logger.warn('🚀 [ROBUST-NAV] Starting navigation to:', targetPath);
    logger.warn('🚀 [ROBUST-NAV] Options:', { replace, timeout, maxRetries });
    
    navigationDebugger.trackNavigationAttempt('robustNavigation', jobId, targetPath);
    
    // Store data first to ensure it's available regardless of navigation method
    try {
      sessionStorage.setItem(`recommendations-${jobId}`, JSON.stringify(selectedRecommendations));
      logger.warn('💾 [ROBUST-NAV] Stored recommendations in sessionStorage');
    } catch (storageError) {
      logger.warn('⚠️ [ROBUST-NAV] Failed to store recommendations:', storageError);
    }
    
    let attempt = 0;
    
    while (attempt < maxRetries) {
      attempt++;
      logger.warn(`🔄 [ROBUST-NAV] Navigation attempt ${attempt}/${maxRetries}`);
      
      try {
        // Strategy 1: React Router navigate with replace option
        logger.warn('📍 [ROBUST-NAV] Trying React Router navigate...');
        navigate(targetPath, { replace });
        
        // Wait for navigation to complete
        await new Promise(resolve => setTimeout(resolve, timeout));
        
        // Check if navigation was successful
        const currentPath = window.location.pathname;
        logger.warn('📍 [ROBUST-NAV] Current path after navigate:', currentPath);
        
        if (currentPath === targetPath) {
          logger.warn('✅ [ROBUST-NAV] React Router navigation successful!');
          navigationDebugger.trackNavigationResult('robustNavigation', jobId, true);
          onSuccess?.();
          return true;
        } else {
          logger.warn('⚠️ [ROBUST-NAV] React Router navigation did not change path');
          navigationDebugger.trackNavigationResult('robustNavigation', jobId, false, 'Path unchanged');
          throw new Error('React Router navigation failed - path unchanged');
        }
        
      } catch (error) {
        logger.error(`❌ [ROBUST-NAV] Attempt ${attempt} failed:`, error);
        
        if (attempt === maxRetries) {
          // Final fallback: window.location
          logger.warn('🔄 [ROBUST-NAV] All React Router attempts failed, using window.location');
          try {
            navigationDebugger.trackNavigationAttempt('window.location', jobId, targetPath);
            window.location.href = targetPath;
            logger.warn('✅ [ROBUST-NAV] Fallback navigation initiated');
            navigationDebugger.trackNavigationResult('window.location', jobId, true);
            return true;
          } catch (fallbackError) {
            logger.error('💥 [ROBUST-NAV] Even fallback navigation failed:', fallbackError);
            navigationDebugger.trackNavigationResult('window.location', jobId, false, (fallbackError as Error).message);
            onFailure?.(fallbackError as Error);
            return false;
          }
        }
        
        // Wait before retry
        await new Promise(resolve => setTimeout(resolve, 100));
      }
    }
    
    return false;
  },
  
  /**
   * Simple navigation test
   */
  testNavigation: (navigate: NavigateFunction, jobId: string): Promise<boolean> => {
    return new Promise((resolve) => {
      const targetPath = `/preview/${jobId}`;
      const originalPath = window.location.pathname;
      
      logger.warn('🧪 [ROBUST-NAV] Testing navigation...');
      logger.warn('🧪 [ROBUST-NAV] From:', originalPath);
      logger.warn('🧪 [ROBUST-NAV] To:', targetPath);
      
      try {
        navigate(targetPath);
        
        setTimeout(() => {
          const newPath = window.location.pathname;
          const success = newPath === targetPath;
          
          logger.warn('🧪 [ROBUST-NAV] Test result:', {
            originalPath,
            targetPath,
            newPath,
            success
          });
          
          resolve(success);
        }, 100);
        
      } catch (error) {
        logger.error('🧪 [ROBUST-NAV] Test failed:', error);
        resolve(false);
      }
    });
  },
  
  /**
   * Emergency navigation when all else fails
   */
  emergencyNavigate: (jobId: string): void => {
    logger.warn('🚑 [ROBUST-NAV] Emergency navigation initiated');
    const targetPath = `/preview/${jobId}`;
    
    try {
      // Force page reload to target
      window.location.href = targetPath;
      logger.warn('🚑 [ROBUST-NAV] Emergency navigation completed');
    } catch (error) {
      logger.error('💥 [ROBUST-NAV] Emergency navigation failed:', error);
      // Last resort: manual reload
      window.location.reload();
    }
  },
  
  /**
   * Validate route exists
   */
  validateRoute: (jobId: string): boolean => {
    const targetPath = `/preview/${jobId}`;
    
    try {
      // Check if path is valid
      const url = new URL(targetPath, window.location.origin);
      logger.warn('✅ [ROBUST-NAV] Route validation passed:', url.href);
      return true;
    } catch (error) {
      logger.error('❌ [ROBUST-NAV] Route validation failed:', error);
      return false;
    }
  }
};

// Export for development debugging
if (typeof window !== 'undefined') {
  (window as any).robustNavigation = robustNavigation;
}