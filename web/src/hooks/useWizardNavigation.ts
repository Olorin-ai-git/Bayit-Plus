/**
 * useWizardNavigation Hook
 * Bridges wizard action handler custom events to React Router SPA navigation.
 * Listens for 'wizard:navigate' events and calls useNavigate() to avoid
 * full page reloads that destroy voice state.
 */

import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import logger from '@/utils/logger';

const navLogger = logger.scope('WizardNavigation');

export function useWizardNavigation() {
  const navigate = useNavigate();

  useEffect(() => {
    const handleWizardNavigate = (event: Event) => {
      const customEvent = event as CustomEvent<{ path: string }>;
      const { path } = customEvent.detail;

      if (!path) {
        navLogger.warn('wizard:navigate event missing path');
        return;
      }

      navLogger.info('SPA navigation', { path });
      navigate(path);
    };

    window.addEventListener('wizard:navigate', handleWizardNavigate);
    return () => {
      window.removeEventListener('wizard:navigate', handleWizardNavigate);
    };
  }, [navigate]);
}
