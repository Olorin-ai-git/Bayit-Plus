// Patch global sandbox.appContext.getEnvironment for all tests
if (typeof window !== 'undefined') {
  window.sandbox = window.sandbox || {};
  window.sandbox.appContext = window.sandbox.appContext || {};
  window.sandbox.appContext.getEnvironment = jest.fn(() => 'local');
}

global.sandbox = global.sandbox || {};
global.sandbox.appContext = global.sandbox.appContext || {};
global.sandbox.appContext.getEnvironment = jest.fn(() => 'local');
