import React from 'react';
import ReactDOM from 'react-dom/client';
import { RTLProvider } from '@olorin/shared';
import './index.css';
import './i18n/config';
import App from './App';

const root = ReactDOM.createRoot(
  document.getElementById('root') as HTMLElement
);

root.render(
  <React.StrictMode>
    <RTLProvider>
      <App />
    </RTLProvider>
  </React.StrictMode>
);
