/**
 * Wizard Action Handlers
 * Individual handler functions for each wizard action type.
 */

import logger from '@/utils/logger';
import type {
  NavigatePayload,
  SearchPayload,
  PlayPayload,
  ScrollPayload,
  ControlPayload,
  KidsContentPayload,
  SubtitlesPayload,
  PlaybackPayload,
} from './types';

const actionLogger = logger.scope('WizardAction');

/** Allowed CSS selectors for scroll target validation */
const ALLOWED_SCROLL_SELECTORS = new Set([
  '#content-grid',
  '#main-content',
  '#hero-section',
  '#footer',
  '#sidebar',
  '[data-section="featured"]',
  '[data-section="continue-watching"]',
  '[data-section="trending"]',
  '[data-section="recommended"]',
  '[data-section="new-releases"]',
  '[data-section="kids"]',
  '[data-section="live"]',
  '[data-section="radio"]',
  '[data-section="podcasts"]',
]);

function navigateSPA(path: string) {
  window.dispatchEvent(new CustomEvent('wizard:navigate', {
    detail: { path },
  }));
}

export function handleNavigateAction(payload: NavigatePayload) {
  const route = payload.route || payload.path;

  if (!route) {
    actionLogger.error('Navigate action missing route/path', { payload });
    return;
  }

  let url = route;
  if (payload.params && Object.keys(payload.params).length > 0) {
    const queryString = new URLSearchParams(payload.params).toString();
    url = `${route}?${queryString}`;
  }

  actionLogger.info('Navigating to route', { url });
  navigateSPA(url);
}

export function handleSearchAction(payload: SearchPayload) {
  const { results, query } = payload;

  if (results && results.length > 0) {
    const searchParams = new URLSearchParams({
      q: query || '',
      results: JSON.stringify(results.slice(0, 10)),
    });

    actionLogger.info('Showing search results', { query, count: results.length });
    navigateSPA(`/search?${searchParams.toString()}`);
  } else if (query) {
    actionLogger.info('Navigating to search', { query });
    navigateSPA(`/search?q=${encodeURIComponent(query)}`);
  } else {
    actionLogger.warn('Search action missing query and results', { payload });
  }
}

export function handlePlayAction(payload: PlayPayload) {
  const { content_id, content_type, timestamp } = payload;

  if (!content_id) {
    actionLogger.error('Play action missing content_id', { payload });
    return;
  }

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

  if (timestamp) {
    url += `?t=${timestamp}`;
  }

  actionLogger.info('Playing content', { content_id, content_type, url });
  navigateSPA(url);
}

export function handleScrollAction(payload: ScrollPayload) {
  const { direction, target } = payload;

  if (target) {
    if (!ALLOWED_SCROLL_SELECTORS.has(target)) {
      actionLogger.warn('Scroll target not in allowlist', { target });
      return;
    }

    const element = document.querySelector(target);
    if (element) {
      element.scrollIntoView({ behavior: 'smooth' });
      actionLogger.info('Scrolled to element', { target });
    } else {
      actionLogger.warn('Scroll target not found', { target });
    }
  } else if (direction) {
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

export function handleControlAction(payload: ControlPayload) {
  const { command, value } = payload;

  window.dispatchEvent(new CustomEvent('media:control', {
    detail: { command, value },
  }));

  actionLogger.info('Media control', { command, value });
}

export function handleKidsContentAction(payload: KidsContentPayload) {
  const { items } = payload;

  if (items && items.length > 0) {
    actionLogger.info('Showing kids content', { count: items.length });
    navigateSPA('/kids');
  } else {
    actionLogger.warn('Kids content action missing items', { payload });
  }
}

export function handleSubtitlesAction(payload: SubtitlesPayload) {
  const { language, enabled } = payload;

  window.dispatchEvent(new CustomEvent('media:subtitles', {
    detail: { language, enabled },
  }));

  actionLogger.info('Subtitles changed', { language, enabled });
}

export function handlePlaybackAction(payload: PlaybackPayload) {
  const { action, value } = payload;

  window.dispatchEvent(new CustomEvent('media:control', {
    detail: { command: action, value },
  }));

  actionLogger.info('Playback action', { action, value });
}
