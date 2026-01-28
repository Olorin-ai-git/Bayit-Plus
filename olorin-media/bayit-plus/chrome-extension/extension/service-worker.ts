/**
 * Background Service Worker (Manifest v3)
 *
 * Handles:
 * - Auth state coordination
 * - Usage tracking and sync
 * - Keep-alive management
 * - State coordination across contexts
 *
 * NOTE: NO WebSocket connection here (Manifest v3 limitation)
 * WebSocket is in offscreen document for persistence
 */

import { createLogger } from './lib/logger';
import { loadRuntimeConfig } from './config/constants';
import { onAuthStateChanged } from './background/auth-manager';
import { startPeriodicSync } from './background/usage-tracker';

const logger = createLogger('ServiceWorker');

// Keep-alive timer to prevent service worker termination
let keepAliveTimer: NodeJS.Timeout | null = null;

/**
 * Initialize service worker
 */
async function initialize(): Promise<void> {
  try {
    logger.info('Service worker initializing', {
      version: chrome.runtime.getManifest().version,
    });

    // Load runtime configuration from backend
    await loadRuntimeConfig();

    // Start periodic usage sync
    startPeriodicSync();

    // Setup keep-alive
    startKeepAlive();

    // Listen for auth state changes
    onAuthStateChanged((authenticated) => {
      logger.info('Auth state changed', { authenticated });

      // Notify all contexts
      broadcastMessage({
        type: 'AUTH_STATE_CHANGED',
        authenticated,
      });
    });

    logger.info('Service worker initialized successfully');
  } catch (error) {
    logger.error('Service worker initialization failed', { error: String(error) });
  }
}

/**
 * Start keep-alive mechanism to prevent service worker termination
 * Service workers terminate after ~30s of inactivity in Manifest v3
 */
function startKeepAlive(): void {
  if (keepAliveTimer) {
    clearInterval(keepAliveTimer);
  }

  // Send message to self every 20 seconds
  keepAliveTimer = setInterval(() => {
    chrome.runtime.sendMessage({ type: 'KEEP_ALIVE' }).catch(() => {
      // Ignore errors (expected when no listeners)
    });
  }, 20000);

  logger.info('Keep-alive mechanism started');
}

/**
 * Broadcast message to all extension contexts
 */
function broadcastMessage(message: Record<string, unknown>): void {
  // Broadcast to all tabs with content scripts
  chrome.tabs.query({}, (tabs) => {
    tabs.forEach((tab) => {
      if (tab.id) {
        chrome.tabs.sendMessage(tab.id, message).catch(() => {
          // Ignore errors (tab may not have content script)
        });
      }
    });
  });

  // Broadcast to popup (if open)
  chrome.runtime.sendMessage(message).catch(() => {
    // Ignore errors (popup may not be open)
  });
}

/**
 * Handle messages from other extension contexts
 */
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  logger.debug('Message received', { type: message.type, sender: sender.id });

  switch (message.type) {
    case 'KEEP_ALIVE':
      // Keep-alive ping, respond immediately
      sendResponse({ status: 'alive' });
      break;

    case 'GET_AUTH_STATUS':
      // Return auth status
      handleGetAuthStatus().then(sendResponse);
      return true; // Async response

    case 'GET_USAGE_DATA':
      // Return usage data
      handleGetUsageData().then(sendResponse);
      return true; // Async response

    case 'START_DUBBING_SESSION':
      // Start dubbing session
      handleStartDubbingSession(message.sessionId).then(sendResponse);
      return true; // Async response

    case 'END_DUBBING_SESSION':
      // End dubbing session
      handleEndDubbingSession().then(sendResponse);
      return true; // Async response

    default:
      logger.warn('Unknown message type', { type: message.type });
      sendResponse({ error: 'Unknown message type' });
  }
});

/**
 * Handle get auth status request
 */
async function handleGetAuthStatus(): Promise<{ authenticated: boolean; user: unknown | null }> {
  const { isAuthenticated, getCurrentUser } = await import('./background/auth-manager');

  const authenticated = await isAuthenticated();
  const user = authenticated ? await getCurrentUser() : null;

  return { authenticated, user };
}

/**
 * Handle get usage data request
 */
async function handleGetUsageData(): Promise<{ usage: unknown }> {
  const { getUsageData } = await import('./background/usage-tracker');

  const usage = await getUsageData();

  return { usage };
}

/**
 * Handle start dubbing session request
 */
async function handleStartDubbingSession(sessionId: string): Promise<{ success: boolean }> {
  try {
    const { startSession } = await import('./background/usage-tracker');
    await startSession(sessionId);

    logger.info('Dubbing session started', { sessionId });

    return { success: true };
  } catch (error) {
    logger.error('Failed to start dubbing session', { error: String(error) });
    return { success: false };
  }
}

/**
 * Handle end dubbing session request
 */
async function handleEndDubbingSession(): Promise<{ success: boolean; duration: number }> {
  try {
    const { endSession } = await import('./background/usage-tracker');
    const duration = await endSession();

    logger.info('Dubbing session ended', { durationMinutes: duration.toFixed(2) });

    return { success: true, duration };
  } catch (error) {
    logger.error('Failed to end dubbing session', { error: String(error) });
    return { success: false, duration: 0 };
  }
}

/**
 * Handle extension installation
 */
chrome.runtime.onInstalled.addListener((details) => {
  logger.info('Extension installed', {
    reason: details.reason,
    version: chrome.runtime.getManifest().version,
  });

  if (details.reason === 'install') {
    // First install - open onboarding
    chrome.tabs.create({
      url: chrome.runtime.getURL('popup.html?onboarding=true'),
    });
  } else if (details.reason === 'update') {
    // Extension updated
    logger.info('Extension updated', {
      previousVersion: details.previousVersion,
    });
  }
});

/**
 * Handle extension startup
 */
chrome.runtime.onStartup.addListener(() => {
  logger.info('Extension started');
  initialize();
});

// Initialize on first load
initialize();
