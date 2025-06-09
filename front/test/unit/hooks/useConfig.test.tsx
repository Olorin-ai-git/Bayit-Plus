import React from 'react';
import { renderHook } from '@testing-library/react-hooks';
import { SandboxContextProvider } from '@appfabric/providers';
import useConfig from 'src/js/hooks/useConfig';
import { mockSandbox } from 'test/utils/sandbox.helper';

describe('useConfig', () => {
  const mockConfig = {
    googleMapsApiKey: 'test-api-key',
    apiEndpoint: 'https://api.example.com',
    featureFlags: {
      enableNewUI: true,
      enableBetaFeatures: false,
    },
  };

  let localMockSandbox: typeof mockSandbox;
  beforeEach(() => {
    // Use a fresh copy for each test
    localMockSandbox = {
      ...mockSandbox,
      pluginConfig: { ...mockSandbox.pluginConfig, extendedProperties: {} },
    };
  });

  it('returns empty object when no extended properties are set', () => {
    const wrapper = ({ children }: { children: React.ReactNode }) => (
      <SandboxContextProvider sandbox={localMockSandbox}>
        {children}
      </SandboxContextProvider>
    );

    const { result } = renderHook(() => useConfig(), { wrapper });
    expect(result.current).toEqual({});
  });

  it('returns extended properties from sandbox config', () => {
    localMockSandbox.pluginConfig = {
      ...localMockSandbox.pluginConfig,
      extendedProperties: mockConfig,
    };

    const wrapper = ({ children }: { children: React.ReactNode }) => (
      <SandboxContextProvider sandbox={localMockSandbox}>
        {children}
      </SandboxContextProvider>
    );

    const { result } = renderHook(() => useConfig(), { wrapper });
    expect(result.current).toEqual(mockConfig);
  });

  it('returns undefined for non-existent properties', () => {
    localMockSandbox.pluginConfig = {
      ...localMockSandbox.pluginConfig,
      extendedProperties: mockConfig,
    };

    const wrapper = ({ children }: { children: React.ReactNode }) => (
      <SandboxContextProvider sandbox={localMockSandbox}>
        {children}
      </SandboxContextProvider>
    );

    const { result } = renderHook(() => useConfig(), { wrapper });
    expect(result.current.nonExistentProperty).toBeUndefined();
  });

  it('handles nested properties correctly', () => {
    localMockSandbox.pluginConfig = {
      ...localMockSandbox.pluginConfig,
      extendedProperties: mockConfig,
    };

    const wrapper = ({ children }: { children: React.ReactNode }) => (
      <SandboxContextProvider sandbox={localMockSandbox}>
        {children}
      </SandboxContextProvider>
    );

    const { result } = renderHook(() => useConfig(), { wrapper });
    expect(result.current.featureFlags.enableNewUI).toBe(true);
    expect(result.current.featureFlags.enableBetaFeatures).toBe(false);
  });

  it('updates when sandbox config changes', () => {
    const wrapper = ({ children }: { children: React.ReactNode }) => (
      <SandboxContextProvider sandbox={localMockSandbox}>
        {children}
      </SandboxContextProvider>
    );

    const { result, rerender } = renderHook(() => useConfig(), { wrapper });

    // Initial state should be empty
    expect(result.current).toEqual({});

    // Update the config
    localMockSandbox.pluginConfig = {
      ...localMockSandbox.pluginConfig,
      extendedProperties: mockConfig,
    };

    // Rerender with new config
    rerender();

    // Should now have the new config
    expect(result.current).toEqual(mockConfig);
  });

  it('handles null extended properties gracefully', () => {
    localMockSandbox.pluginConfig = {
      ...localMockSandbox.pluginConfig,
      extendedProperties: null as unknown as Record<string, unknown>,
    };

    const wrapper = ({ children }: { children: React.ReactNode }) => (
      <SandboxContextProvider sandbox={localMockSandbox}>
        {children}
      </SandboxContextProvider>
    );

    const { result } = renderHook(() => useConfig(), { wrapper });
    expect(result.current).toEqual({});
  });

  it('handles undefined extended properties gracefully', () => {
    localMockSandbox.pluginConfig = {
      ...localMockSandbox.pluginConfig,
      extendedProperties: undefined as unknown as Record<string, unknown>,
    };

    const wrapper = ({ children }: { children: React.ReactNode }) => (
      <SandboxContextProvider sandbox={localMockSandbox}>
        {children}
      </SandboxContextProvider>
    );

    const { result } = renderHook(() => useConfig(), { wrapper });
    expect(result.current).toEqual({});
  });

  it('preserves object references for unchanged values', () => {
    localMockSandbox.pluginConfig = {
      ...localMockSandbox.pluginConfig,
      extendedProperties: mockConfig,
    };

    const wrapper = ({ children }: { children: React.ReactNode }) => (
      <SandboxContextProvider sandbox={localMockSandbox}>
        {children}
      </SandboxContextProvider>
    );

    const { result, rerender } = renderHook(() => useConfig(), { wrapper });
    const firstResult = result.current;

    // Rerender without changing config
    rerender();

    // Should maintain the same reference
    expect(result.current).toBe(firstResult);
  });
});
