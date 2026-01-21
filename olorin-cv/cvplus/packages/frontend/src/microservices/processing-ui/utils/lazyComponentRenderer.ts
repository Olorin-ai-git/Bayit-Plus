/**
 * Lazy Component Renderer
 * Utilities for lazy-loading and rendering components
 */

import React from 'react';

export const createLazyComponent = <P extends object>(
  importFn: () => Promise<{ default: React.ComponentType<P> }>,
  fallback: React.ReactNode = null
): React.ComponentType<P> => {
  const LazyComponent = React.lazy(importFn);
  const defaultFallback = fallback || React.createElement('div', null, 'Loading...');
  
  return (props: P) => 
    React.createElement(
      React.Suspense,
      { fallback: defaultFallback },
      React.createElement(LazyComponent, props)
    );
};

export const withLazyBoundary = <P extends object>(
  Component: React.ComponentType<P>,
  fallback: React.ReactNode = null
): React.ComponentType<P> => {
  const defaultFallback = fallback || React.createElement('div', null, 'Loading...');
  return (props: P) =>
    React.createElement(
      React.Suspense,
      { fallback: defaultFallback },
      React.createElement(Component, props)
    );
};

export const renderLazyComponent = (
  Component: React.ComponentType<any>,
  props: any = {},
  fallback: React.ReactNode = null
): React.ReactElement => {
  const defaultFallback = fallback || React.createElement('div', null, 'Loading...');
  return React.createElement(
    React.Suspense,
    { fallback: defaultFallback },
    React.createElement(Component, props)
  );
};
