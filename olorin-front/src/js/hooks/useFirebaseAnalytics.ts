import { useCallback } from 'react';
import { logEvent, setUserProperties, setUserId } from 'firebase/analytics';
import { analytics } from '../../firebase';

export const useFirebaseAnalytics = () => {
  // Track page views
  const trackPageView = useCallback((pageName: string, pageTitle?: string) => {
    if (analytics) {
      try {
        logEvent(analytics, 'page_view', {
          page_title: pageTitle || pageName,
          page_location: window.location.href,
          page_path: window.location.pathname,
          page_name: pageName,
        });
      } catch (error) {
        console.warn('Failed to track page view:', error);
      }
    }
  }, []);

  // Track investigation events
  const trackInvestigationEvent = useCallback((eventName: string, investigationId?: string, additionalData?: Record<string, any>) => {
    if (analytics) {
      try {
        logEvent(analytics, eventName, {
          investigation_id: investigationId,
          timestamp: new Date().toISOString(),
          ...additionalData,
        });
      } catch (error) {
        console.warn('Failed to track investigation event:', error);
      }
    }
  }, []);

  // Track user interactions
  const trackUserInteraction = useCallback((action: string, category: string, label?: string) => {
    if (analytics) {
      logEvent(analytics, 'user_interaction', {
        action,
        category,
        label,
        timestamp: new Date().toISOString(),
      });
    }
  }, []);

  // Track agent activities
  const trackAgentActivity = useCallback((agentName: string, action: string, additionalData?: Record<string, any>) => {
    if (analytics) {
      logEvent(analytics, 'agent_activity', {
        agent_name: agentName,
        action,
        timestamp: new Date().toISOString(),
        ...additionalData,
      });
    }
  }, []);

  // Track search and filter events
  const trackSearchEvent = useCallback((searchTerm: string, searchType: string, resultsCount?: number) => {
    if (analytics) {
      logEvent(analytics, 'search', {
        search_term: searchTerm,
        search_type: searchType,
        results_count: resultsCount,
        timestamp: new Date().toISOString(),
      });
    }
  }, []);

  // Track feature usage
  const trackFeatureUsage = useCallback((featureName: string, additionalData?: Record<string, any>) => {
    if (analytics) {
      logEvent(analytics, 'feature_usage', {
        feature_name: featureName,
        timestamp: new Date().toISOString(),
        ...additionalData,
      });
    }
  }, []);

  // Set user properties
  const setUserAnalyticsProperties = useCallback((properties: Record<string, any>) => {
    if (analytics) {
      setUserProperties(analytics, properties);
    }
  }, []);

  // Set user ID
  const setAnalyticsUserId = useCallback((userId: string) => {
    if (analytics) {
      setUserId(analytics, userId);
    }
  }, []);

  // Track errors
  const trackError = useCallback((error: Error, errorInfo?: Record<string, any>) => {
    if (analytics) {
      try {
        logEvent(analytics, 'exception', {
          description: error.message,
          error_name: error.name,
          error_stack: error.stack,
          fatal: false,
          timestamp: new Date().toISOString(),
          ...errorInfo,
        });
      } catch (analyticsError) {
        console.warn('Failed to track error to analytics:', analyticsError);
      }
    }
  }, []);

  return {
    trackPageView,
    trackInvestigationEvent,
    trackUserInteraction,
    trackAgentActivity,
    trackSearchEvent,
    trackFeatureUsage,
    setUserAnalyticsProperties,
    setAnalyticsUserId,
    trackError,
  };
}; 