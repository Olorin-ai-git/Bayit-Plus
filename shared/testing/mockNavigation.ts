/**
 * Mock navigation utilities for testing
 * Provides mock implementations of React Navigation hooks and functions
 */

/**
 * Mock navigation object
 */
export const mockNavigation = {
  navigate: jest.fn(),
  goBack: jest.fn(),
  reset: jest.fn(),
  setOptions: jest.fn(),
  addListener: jest.fn(() => jest.fn()),
  removeListener: jest.fn(),
  canGoBack: jest.fn().mockReturnValue(true),
  isFocused: jest.fn().mockReturnValue(true),
  dispatch: jest.fn(),
  setParams: jest.fn(),
  getId: jest.fn().mockReturnValue('screen-id'),
  getParent: jest.fn(),
  getState: jest.fn(() => ({
    index: 0,
    routes: [{ key: 'test-route', name: 'Test' }],
  })),
};

/**
 * Mock route object
 */
export const mockRoute = {
  key: 'test-route-key',
  name: 'TestScreen',
  params: {},
  path: undefined,
};

/**
 * Creates a mock navigation prop with custom params
 */
export function createMockNavigation(overrides?: Partial<typeof mockNavigation>) {
  return {
    ...mockNavigation,
    ...overrides,
  };
}

/**
 * Creates a mock route prop with custom params
 */
export function createMockRoute<T = any>(params?: T) {
  return {
    ...mockRoute,
    params: params || {},
  };
}

/**
 * Mock useNavigation hook
 */
export function mockUseNavigation(overrides?: Partial<typeof mockNavigation>) {
  return jest.fn(() => createMockNavigation(overrides));
}

/**
 * Mock useRoute hook
 */
export function mockUseRoute<T = any>(params?: T) {
  return jest.fn(() => createMockRoute(params));
}

/**
 * Mock useFocusEffect hook
 */
export const mockUseFocusEffect = jest.fn((callback) => {
  callback();
});

/**
 * Mock useIsFocused hook
 */
export const mockUseIsFocused = jest.fn(() => true);
