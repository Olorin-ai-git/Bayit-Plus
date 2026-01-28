/**
 * Popup Entry Point
 *
 * Initializes i18n and renders the main React app
 */

import React from 'react';
import { createRoot } from 'react-dom/client';
import { initializeI18n } from '../config/i18n';
import { App } from './App';
import { logger } from '../lib/logger';

/**
 * Initialize and render popup
 */
async function main() {
  try {
    // Initialize i18n before rendering
    await initializeI18n();

    logger.info('Popup initialized successfully');

    // Render React app
    const container = document.getElementById('root');
    if (!container) {
      throw new Error('Root element not found');
    }

    const root = createRoot(container);
    root.render(
      <React.StrictMode>
        <App />
      </React.StrictMode>
    );
  } catch (error) {
    logger.error('Failed to initialize popup', { error: String(error) });

    // Show error message in UI
    const container = document.getElementById('root');
    if (container) {
      container.innerHTML = `
        <div style="padding: 20px; color: #fff; text-align: center;">
          <h2 style="color: #ff4757; margin-bottom: 10px;">Failed to Initialize</h2>
          <p style="color: #ddd; font-size: 14px;">${String(error)}</p>
          <button
            onclick="window.location.reload()"
            style="
              margin-top: 20px;
              padding: 10px 20px;
              background: rgba(255,255,255,0.1);
              backdrop-filter: blur(10px);
              border: 1px solid rgba(255,255,255,0.2);
              border-radius: 12px;
              color: #fff;
              cursor: pointer;
              font-size: 14px;
            "
          >
            Reload
          </button>
        </div>
      `;
    }
  }
}

// Initialize on load
main();
