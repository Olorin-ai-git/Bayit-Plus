// Mock for @testing-library/react-native
const testingLib = require('@testing-library/react');

// Custom queries that map testID to data-testid
const customQueries = {
  ...testingLib,
  render: (component, options) => {
    const result = testingLib.render(component, options);

    // Override getByTestId to work with both testID and data-testid
    const originalGetByTestId = result.getByTestId;
    result.getByTestId = (testId) => {
      try {
        return originalGetByTestId(testId);
      } catch (e) {
        // Fallback: find by testid attribute (React Native lowercase)
        const element = result.container.querySelector(`[testid="${testId}"]`);
        if (element) return element;
        throw e;
      }
    };

    return result;
  },
};

const fireEvent = {
  press: (element) => {
    testingLib.fireEvent.click(element);
  },
  changeText: (element, text) => {
    testingLib.fireEvent.change(element, { target: { value: text } });
  },
};

module.exports = {
  ...customQueries,
  renderHook: testingLib.renderHook,
  fireEvent,
  waitFor: testingLib.waitFor,
  act: testingLib.act,
  screen: testingLib.screen,
};
