import React, { createContext, useContext, useState, useEffect, useCallback, ReactNode } from 'react';
import { getCurrentUrlParams } from '../utils/urlParams';

interface DemoModeContextType {
  isDemoMode: boolean;
  demoAuthId: string | null;
  enterDemoMode: (authId: string) => void;
  exitDemoMode: () => void;
  checkDemoModeStatus: () => void;
}

const DemoModeContext = createContext<DemoModeContextType | undefined>(undefined);

const DEMO_MODE_KEY = 'olorin_demo_mode';
const DEMO_AUTH_KEY = 'olorin_demo_auth';
const DEMO_MODE_DURATION = 24 * 60 * 60 * 1000; // 24 hours

interface DemoModeData {
  enabled: boolean;
  authId: string | null;
  timestamp: number;
}

export const DemoModeProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  // Initialize state from session storage
  const [isDemoMode, setIsDemoMode] = useState(() => {
    try {
      const storedData = sessionStorage.getItem(DEMO_MODE_KEY);
      if (storedData) {
        const demoData: DemoModeData = JSON.parse(storedData);
        const now = Date.now();
        return demoData.enabled && (now - demoData.timestamp) < DEMO_MODE_DURATION;
      }
    } catch (error) {
      console.error('Error reading demo mode from storage:', error);
    }
    return false;
  });
  
  const [demoAuthId, setDemoAuthId] = useState<string | null>(() => {
    try {
      const storedData = sessionStorage.getItem(DEMO_MODE_KEY);
      if (storedData) {
        const demoData: DemoModeData = JSON.parse(storedData);
        return demoData.authId;
      }
    } catch (error) {
      console.error('Error reading demo auth from storage:', error);
    }
    return null;
  });

  // Enter demo mode
  const enterDemoMode = useCallback((authId: string) => {
    const demoData: DemoModeData = {
      enabled: true,
      authId,
      timestamp: Date.now(),
    };
    
    sessionStorage.setItem(DEMO_MODE_KEY, JSON.stringify(demoData));
    sessionStorage.setItem(DEMO_AUTH_KEY, authId);
    setIsDemoMode(true);
    setDemoAuthId(authId);
    
    // Remove demo parameter from URL to prevent easy bypass
    const url = new URL(window.location.href);
    url.searchParams.delete('demo');
    window.history.replaceState({}, '', url.toString());
  }, [setIsDemoMode, setDemoAuthId]);

  // Exit demo mode (requires special action)
  const exitDemoMode = useCallback(() => {
    sessionStorage.removeItem(DEMO_MODE_KEY);
    sessionStorage.removeItem(DEMO_AUTH_KEY);
    setIsDemoMode(false);
    setDemoAuthId(null);
    
    // Remove demo parameter from URL
    const url = new URL(window.location.href);
    url.searchParams.delete('demo');
    window.history.replaceState({}, '', url.toString());
  }, [setIsDemoMode, setDemoAuthId]);

  // Check if demo mode should be active
  const checkDemoModeStatus = useCallback(() => {
    try {
      // Check URL parameters first
      const urlParams = getCurrentUrlParams();
      const urlDemoParam = urlParams.get('demo');
      const urlAuthId = urlParams.get('authid');

      // If URL explicitly sets demo=false, clear demo mode
      if (urlDemoParam === 'false') {
        exitDemoMode();
        return;
      }

      // Check session storage for existing demo mode
      const storedData = sessionStorage.getItem(DEMO_MODE_KEY);
      if (storedData) {
        const demoData: DemoModeData = JSON.parse(storedData);
        const now = Date.now();
        
        // Check if demo mode is still valid (within duration)
        if (demoData.enabled && (now - demoData.timestamp) < DEMO_MODE_DURATION) {
          setIsDemoMode(true);
          setDemoAuthId(demoData.authId);
          return;
        }
      }

      // If URL has demo=true, activate demo mode (authId is optional for demo)
      if (urlDemoParam === 'true') {
        enterDemoMode(urlAuthId || 'demo-user');
      }
    } catch (error) {
      console.error('Error checking demo mode status:', error);
    }
  }, [setIsDemoMode, setDemoAuthId, enterDemoMode, exitDemoMode]);

  // Check demo mode on mount and URL changes
  useEffect(() => {
    checkDemoModeStatus();

    // Listen for URL changes
    const handlePopState = () => {
      checkDemoModeStatus();
    };

    // Add keyboard shortcut to exit demo mode (Ctrl+Shift+D)
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.ctrlKey && e.shiftKey && e.key === 'D') {
        if (isDemoMode) {
          if (window.confirm('Exit demo mode? This will refresh the page.')) {
            exitDemoMode();
            window.location.href = '/';
          }
        }
      }
    };

    window.addEventListener('popstate', handlePopState);
    window.addEventListener('keydown', handleKeyDown);
    
    // Check periodically to enforce demo mode
    const interval = setInterval(() => {
      const storedData = sessionStorage.getItem(DEMO_MODE_KEY);
      if (storedData) {
        const demoData: DemoModeData = JSON.parse(storedData);
        if (demoData.enabled && !isDemoMode) {
          setIsDemoMode(true);
          setDemoAuthId(demoData.authId);
        }
      }
    }, 1000);

    return () => {
      window.removeEventListener('popstate', handlePopState);
      window.removeEventListener('keydown', handleKeyDown);
      clearInterval(interval);
    };
  }, [isDemoMode, checkDemoModeStatus, exitDemoMode]);

  // Prevent navigation away in demo mode
  useEffect(() => {
    if (isDemoMode) {
      const handleBeforeUnload = (e: BeforeUnloadEvent) => {
        // Only warn if trying to navigate to external sites
        if (document.activeElement?.tagName === 'A' && 
            (document.activeElement as HTMLAnchorElement).hostname !== window.location.hostname) {
          e.preventDefault();
          e.returnValue = '';
        }
      };

      window.addEventListener('beforeunload', handleBeforeUnload);
      return () => window.removeEventListener('beforeunload', handleBeforeUnload);
    }
  }, [isDemoMode]);

  return (
    <DemoModeContext.Provider value={{
      isDemoMode,
      demoAuthId,
      enterDemoMode,
      exitDemoMode,
      checkDemoModeStatus,
    }}>
      {children}
    </DemoModeContext.Provider>
  );
};

export const useDemoMode = (): DemoModeContextType => {
  const context = useContext(DemoModeContext);
  if (context === undefined) {
    throw new Error('useDemoMode must be used within a DemoModeProvider');
  }
  return context;
};