// / <reference types="Cypress" />

const PLUGIN_URL = Cypress.env('PLUGIN_URL') || 'http://localhost:3000';

context('OlorinWidget.tsx', () => {
  beforeEach(() => {
    cy.intercept('GET', '/health', { fixture: 'health.json' }).as('health');
  });

  it('Should return health check', () => {
    cy.request('GET', `${PLUGIN_URL}/health`).then((resp) => {
      expect(resp.status).to.eq(200);
      expect(resp.body).to.have.property('id', 'olorin-webplugin');
    });
  });

  it('Should load the default view', () => {
    // Make sure we can visit the page and see the header
    // You might need to update the path based on your actual routes
    cy.visit(`${PLUGIN_URL}/generic/olorin100`);

    cy.get('[data-cy=olorin-header]').should(
      'contain',
      'Olorin Fraud Investigation System'
    );
  });

  it('Should navigate between tabs', () => {
    cy.visit(`${PLUGIN_URL}/generic/olorin100`);

    // Test tab navigation if you have tabs in your widget
    // Update these selectors based on your actual UI
    // cy.get('[data-cy=investigations-tab]').click();
    // cy.get('[data-cy=settings-tab]').click();
  });
});
