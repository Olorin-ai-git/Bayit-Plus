import React from 'react';
import ReactDOM from 'react-dom/client';
import './index.css';
import './i18n/config';
import App from './App';

import { initWebI18n, setupWebDirectionListener } from '@olorin/shared-i18n/web';

(async () => {
  await initWebI18n();
  await setupWebDirectionListener();

  const root = ReactDOM.createRoot(
    document.getElementById('root') as HTMLElement
  );

  root.render(
    <React.StrictMode>
      <App />
    </React.StrictMode>
  );
})();
