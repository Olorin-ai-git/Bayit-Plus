/**
 * Wizard Action Handler
 * Processes actions from wizard backend (navigate, search, play, etc.)
 */

import React from 'react';
import logger from '@/utils/logger';

const actionLogger = logger.scope('WizardAction');

export interface WizardAction {
  type: string;
  payload: Record<string, any>;
}

/**
 * Handle wizard actions globally
 * Call this to set up the global action listener
 */
export function setupWizardActionHandler() {
  window.addEventListener('wizard:action', handleWizardAction as EventListener);
  actionLogger.info('Wizard action handler initialized');
}

/**
 * Clean up wizard action handler
 */
export function cleanupWizardActionHandler() {
  window.removeEventListener('wizard:action', handleWizardAction as EventListener);
  actionLogger.info('Wizard action handler cleaned up');
}

/**
 * Handle wizard action event
 */
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

    default:
      actionLogger.warn('Unknown action type', { type: action.type });
  }
}

/**
 * Handle navigation action
 */
function handleNavigateAction(payload: Record<string, any>) {
  const { route, params } = payload;

  if (!route) {
    actionLogger.error('Navigate action missing route', { payload });
    return;
  }

  // Build URL with params
  let url = route;
  if (params && Object.keys(params).length > 0) {
    const queryString = new URLSearchParams(params as Record<string, string>).toString();
    url = `${route}?${queryString}`;
  }

  actionLogger.info('Navigating to route', { url });
  window.location.href = url;
}

/**
 * Handle search action
 */
function handleSearchAction(payload: Record<string, any>) {
  const { results, query } = payload;

  if (results && results.length > 0) {
    // Navigate to search results page with results
    const searchParams = new URLSearchParams({
      q: query || '',
      results: JSON.stringify(results.slice(0, 10)), // First 10 results
    });

    actionLogger.info('Showing search results', {
      query,
      count: results.length,
    });

    window.location.href = `/search?${searchParams.toString()}`;
  } else if (query) {
    // Navigate to search page with query
    actionLogger.info('Navigating to search', { query });
    window.location.href = `/search?q=${encodeURIComponent(query)}`;
  } else {
    actionLogger.warn('Search action missing query and results', { payload });
  }
}

/**
 * Handle play action
 */
function handlePlayAction(payload: Record<string, any>) {
  const { content_id, content_type, timestamp } = payload;

  if (!content_id) {
    actionLogger.error('Play action missing content_id', { payload });
    return;
  }

  // Build play URL based on content type
  let url = '';
  switch (content_type) {
    case 'vod':
    case 'movie':
    case 'series':
      url = `/watch/${content_id}`;
      break;

    case 'live':
    case 'channel':
      url = `/live/${content_id}`;
      break;

    case 'radio':
      url = `/radio/${content_id}`;
      break;

    case 'podcast':
      url = `/podcasts/${content_id}`;
      break;

    case 'audiobook':
      url = `/audiobooks/${content_id}`;
      break;

    default:
      url = `/watch/${content_id}`;
  }

  // Add timestamp if provided
  if (timestamp) {
    url += `?t=${timestamp}`;
  }

  actionLogger.info('Playing content', {
    content_id,
    content_type,
    url,
  });

  window.location.href = url;
}

/**
 * Handle scroll action
 */
function handleScrollAction(payload: Record<string, any>) {
  const { direction, target } = payload;

  if (target) {
    // Scroll to specific element
    const element = document.querySelector(target);
    if (element) {
      element.scrollIntoView({ behavior: 'smooth' });
      actionLogger.info('Scrolled to element', { target });
    } else {
      actionLogger.warn('Scroll target not found', { target });
    }
  } else if (direction) {
    // Scroll in direction
    const scrollAmount = window.innerHeight * 0.8;
    window.scrollBy({
      top: direction === 'down' ? scrollAmount : -scrollAmount,
      behavior: 'smooth',
    });
    actionLogger.info('Scrolled', { direction });
  } else {
    actionLogger.warn('Scroll action missing direction or target', { payload });
  }
}

/**
 * Handle control action (pause, play, volume, etc.)
 */
function handleControlAction(payload: Record<string, any>) {
  const { command, value } = payload;

  // Dispatch media control event
  window.dispatchEvent(new CustomEvent('media:control', {
    detail: { command, value },
  }));

  actionLogger.info('Media control', { command, value });
}

/**
 * Handle kids content action
 */
function handleKidsContentAction(payload: Record<string, any>) {
  const { items } = payload;

  if (items && items.length > 0) {
    // Navigate to kids section with filtered content
    actionLogger.info('Showing kids content', { count: items.length });
    window.location.href = '/kids';
  } else {
    actionLogger.warn('Kids content action missing items', { payload });
  }
}

/**
 * Hook to use wizard action handler in React components
 */
export function useWizardActionHandler() {
  React.useEffect(() => {
    setupWizardActionHandler();
    return () => cleanupWizardActionHandler();
  }, []);
}

// Auto-setup for non-React usage
if (typeof window !== 'undefined') {
  // Setup on load
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', setupWizardActionHandler);
  } else {
    setupWizardActionHandler();
  }

  // Cleanup on unload
  window.addEventListener('beforeunload', cleanupWizardActionHandler);
}
