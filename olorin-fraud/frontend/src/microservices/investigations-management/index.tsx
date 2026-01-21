/**
 * Investigations Management Microservice Entry Point
 */

import React from 'react';
import ReactDOM from 'react-dom/client';
import InvestigationsManagementApp from './InvestigationsManagementApp';

const root = ReactDOM.createRoot(
  document.getElementById('root') as HTMLElement
);

root.render(
  <React.StrictMode>
    <InvestigationsManagementApp />
  </React.StrictMode>
);

