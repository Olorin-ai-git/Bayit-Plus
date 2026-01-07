/**
 * Bayit+ Web App Entry Point
 *
 * This entry point uses React Native's AppRegistry for compatibility
 * with React Native Web. During the migration, we keep BrowserRouter
 * for existing pages while gradually migrating to React Navigation.
 */
import { AppRegistry } from 'react-native';
import React from 'react';
import { BrowserRouter } from 'react-router-dom';
import App from './src/App';
import '../shared/styles/globals.css';
import '@bayit/shared-i18n';

// Wrapper component that provides routing context
const BayitWebApp = () => (
  <React.StrictMode>
    <BrowserRouter>
      <App />
    </BrowserRouter>
  </React.StrictMode>
);

// Register the app with React Native's AppRegistry
AppRegistry.registerComponent('BayitWeb', () => BayitWebApp);

// Run the application
AppRegistry.runApplication('BayitWeb', {
  rootTag: document.getElementById('root'),
});
