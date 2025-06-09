module.exports = {
  e2e: {
    specPattern: 'cypress/integration/**/*.spec.{js,jsx,ts,tsx}',
    // We've imported your old cypress plugins here.
    // You may want to clean this up later by importing these.
    setupNodeEvents(on, config) {
      return require('./cypress/plugins/index')(on, config);
    },
  },
};
