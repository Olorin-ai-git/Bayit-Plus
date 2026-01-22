import React from 'react';
import ReactDOM from 'react-dom/client';
import './index.css';
import { initI18n } from '@olorin/shared';
import App from './App';

// Initialize i18n before rendering app
initI18n();

const root = ReactDOM.createRoot(
  document.getElementById('root') as HTMLElement
);

root.render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
