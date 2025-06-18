// / <reference types="Cypress" />

context('OlorinWidget.tsx', () => {
  // If cypress intends to run against a remote shell - invoke a simple test and eject early
  const { USE_REMOTE, PLUGIN_URL } = Cypress.env();
  if (USE_REMOTE) {
    it('if using remote shell configuration, cypress can visit the local build ', () => {
      cy.request('GET', PLUGIN_URL).then((resp) => {
        expect(resp.headers).to.have.property(
          'content-type',
          'application/json; charset=utf-8',
        );
        expect(resp.body).to.have.property('id', 'olorin-webplugin');
      });
    });
    return;
  }

  /**
   * Each test leverages the `data-cy` attribute. This is so we don't leverage CSS selectors when using things like styled-components (which are hashed)
   * https://docs.cypress.io/guides/references/best-practices.html#Selecting-Elements
   */
  it('Widget contains "Hello Intuit Application Fabric!"', () => {
    // Navigate to the local server that webpack serves the route from
    cy.visit(`${PLUGIN_URL}/generic/olorin100`);

    cy.get('[data-cy=olorin-header]').should(
      'have.html',
      'Hello Olorin Application!',
    );
  });

  it('Widget contains Olorin Logo', () => {
    // Navigate to the local server that webpack serves the route from
    cy.visit(`${PLUGIN_URL}/generic/olorin100`);

    // eslint-disable-next-line no-unused-expressions
    expect(cy.get('[data-cy=olorin-logo-banner]')).to.exist;
  });
});
