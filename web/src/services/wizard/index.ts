/**
 * Wizard Action Handler
 * Processes actions from wizard backend (navigate, search, play, etc.)
 * Uses custom events for SPA navigation instead of full page reloads.
 */

import React from 'react';
import logger from '@/utils/logger';
import type { WizardAction } from './types';
import {
  handleNavigateAction,
  handleSearchAction,
  handlePlayAction,
  handleScrollAction,
  handleControlAction,
  handleKidsContentAction,
  handleSubtitlesAction,
  handlePlaybackAction,
} from './actionHandlers';

const actionLogger = logger.scope('WizardAction');

function handleWizardAction(event: CustomEvent<WizardAction>) {
  const action = event.detail;
  actionLogger.info('Processing wizard action', {
    type: action.type,
    payload: action.payload,
  });

  switch (action.type) {
    case 'navigate':
      handleNavigateAction(action.payload);
      break;
    case 'search':
      handleSearchAction(action.payload);
      break;
    case 'play':
      handlePlayAction(action.payload);
      break;
    case 'scroll':
      handleScrollAction(action.payload);
      break;
    case 'control':
      handleControlAction(action.payload);
      break;
    case 'kids_content':
      handleKidsContentAction(action.payload);
      break;
    case 'subtitles':
      handleSubtitlesAction(action.payload);
      break;
    case 'playback':
      handlePlaybackAction(action.payload);
      break;
    default:
      actionLogger.warn('Unknown action type', { type: action.type });
  }
}

export function setupWizardActionHandler() {
  window.addEventListener('wizard:action', handleWizardAction as EventListener);
  actionLogger.info('Wizard action handler initialized');
}

export function cleanupWizardActionHandler() {
  window.removeEventListener('wizard:action', handleWizardAction as EventListener);
  actionLogger.info('Wizard action handler cleaned up');
}

export function useWizardActionHandler() {
  React.useEffect(() => {
    setupWizardActionHandler();
    return () => cleanupWizardActionHandler();
  }, []);
}

export type { WizardAction } from './types';
