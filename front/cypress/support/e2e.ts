/*
 * ***********************************************************
 * This example support/index.js is processed and
 * loaded automatically before your test files.
 *
 * This is a great place to put global configuration and
 * behavior that modifies Cypress.
 *
 * You can change the location of this file or turn off
 * automatically serving support files with the
 * 'supportFile' configuration option.
 *
 * You can read more here:
 * https://on.cypress.io/configuration
 * ***********************************************************
 */

// Import commands.js using ES2015 syntax:
import './commands';

/*
 * Alternatively you can use CommonJS syntax:
 * require('./commands')
 */

/**
 * Returning false here prevents Cypress from failing the test
 * when some uncaught exception are thrown in QBO web app
 */
Cypress.on('uncaught:exception', (e) => {
  if (e.message.includes('ChunkLoadError')) {
    cy.log('Widget failed to load, reloading...');
    cy.reload();
  }
  return false;
});
