/**
 * Popup Entry Point
 *
 * Initializes i18n and renders the main React app
 */

import React from 'react';
import { createRoot } from 'react-dom/client';
import i18next from 'i18next';
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

    // Show error message in UI (DOM API, no innerHTML for XSS safety)
    const container = document.getElementById('root');
    if (container) {
      while (container.firstChild) container.removeChild(container.firstChild);

      const wrapper = document.createElement('div');
      Object.assign(wrapper.style, { padding: '20px', color: '#fff', textAlign: 'center' });

      const heading = document.createElement('h2');
      heading.textContent = i18next.t('errors.initializationFailed', 'Failed to Initialize');
      Object.assign(heading.style, { color: '#ff4757', marginBottom: '10px' });

      const message = document.createElement('p');
      message.textContent = String(error);
      Object.assign(message.style, { color: '#ddd', fontSize: '14px' });

      const reloadBtn = document.createElement('button');
      reloadBtn.textContent = i18next.t('errors.reloadButton', 'Reload');
      reloadBtn.addEventListener('click', () => window.location.reload());
      Object.assign(reloadBtn.style, {
        marginTop: '20px', padding: '10px 20px',
        background: 'rgba(255,255,255,0.1)', backdropFilter: 'blur(10px)',
        border: '1px solid rgba(255,255,255,0.2)', borderRadius: '12px',
        color: '#fff', cursor: 'pointer', fontSize: '14px',
      });

      wrapper.appendChild(heading);
      wrapper.appendChild(message);
      wrapper.appendChild(reloadBtn);
      container.appendChild(wrapper);
    }
  }
}

// Initialize on load
main();
