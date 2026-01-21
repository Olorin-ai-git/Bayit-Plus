/**
 * User Interaction Observer
 * Monitors user interactions (clicks, inputs, scrolls, navigation)
 * Feature: Performance monitoring and optimization
 */

import type { UserInteractionMetric } from '../types/performance-types';
import { generateMetricId } from '../utils/metric-helpers';

/**
 * Track click interaction
 */
export function trackClick(target: EventTarget | null): UserInteractionMetric {
  const element = target as HTMLElement;
  return {
    type: 'click',
    target: getElementSelector(element),
    timestamp: Date.now(),
    metadata: {
      tagName: element?.tagName,
      id: element?.id,
      className: element?.className,
    },
  };
}

/**
 * Track input interaction
 */
export function trackInput(target: EventTarget | null, duration?: number): UserInteractionMetric {
  const element = target as HTMLInputElement;
  return {
    type: 'input',
    target: getElementSelector(element),
    timestamp: Date.now(),
    duration,
    metadata: {
      tagName: element?.tagName,
      type: element?.type,
      name: element?.name,
    },
  };
}

/**
 * Track scroll interaction
 */
export function trackScroll(): UserInteractionMetric {
  return {
    type: 'scroll',
    target: 'window',
    timestamp: Date.now(),
    metadata: {
      scrollY: window.scrollY,
      scrollX: window.scrollX,
    },
  };
}

/**
 * Track navigation interaction
 */
export function trackNavigation(url: string): UserInteractionMetric {
  return {
    type: 'navigation',
    target: url,
    timestamp: Date.now(),
    metadata: {
      url,
      referrer: document.referrer,
    },
  };
}

/**
 * Get CSS selector for element
 */
function getElementSelector(element: HTMLElement | null): string {
  if (!element) return 'unknown';

  if (element.id) {
    return `#${element.id}`;
  }

  if (element.className && typeof element.className === 'string') {
    const classes = element.className.trim().split(/\s+/).join('.');
    return `${element.tagName.toLowerCase()}.${classes}`;
  }

  return element.tagName.toLowerCase();
}

/**
 * Observe user interactions with event listeners
 */
export function observeUserInteractions(
  callback: (metric: UserInteractionMetric) => void
): () => void {
  const clickHandler = (event: MouseEvent) => {
    callback(trackClick(event.target));
  };

  const inputHandler = (event: Event) => {
    callback(trackInput(event.target));
  };

  let scrollTimeout: ReturnType<typeof setTimeout> | null = null;
  const scrollHandler = () => {
    if (scrollTimeout) {
      clearTimeout(scrollTimeout);
    }
    scrollTimeout = setTimeout(() => {
      callback(trackScroll());
    }, 150); // Debounce scroll events
  };

  // Add event listeners
  document.addEventListener('click', clickHandler);
  document.addEventListener('input', inputHandler);
  window.addEventListener('scroll', scrollHandler, { passive: true });

  // Return cleanup function
  return () => {
    document.removeEventListener('click', clickHandler);
    document.removeEventListener('input', inputHandler);
    window.removeEventListener('scroll', scrollHandler);
    if (scrollTimeout) {
      clearTimeout(scrollTimeout);
    }
  };
}

/**
 * Check if user interaction tracking is supported
 */
export function isInteractionTrackingSupported(): boolean {
  return typeof document !== 'undefined' && typeof window !== 'undefined';
}
