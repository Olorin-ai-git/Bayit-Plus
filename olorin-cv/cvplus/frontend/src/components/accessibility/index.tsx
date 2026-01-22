/**
 * Accessibility Utility Components
 * Screen reader announcements and visually hidden content
 */

import { useEffect, useState } from 'react';

interface AnnounceLiveProps {
  children: string;
  priority?: 'polite' | 'assertive';
  clearAfter?: number;
}

/**
 * AnnounceLive - Screen reader announcement component
 * Announces messages to screen readers using aria-live
 */
export function AnnounceLive({
  children,
  priority = 'polite',
  clearAfter = 5000,
}: AnnounceLiveProps) {
  const [message, setMessage] = useState(children);

  useEffect(() => {
    setMessage(children);

    if (clearAfter > 0) {
      const timer = setTimeout(() => setMessage(''), clearAfter);
      return () => clearTimeout(timer);
    }
  }, [children, clearAfter]);

  if (!message) return null;

  return (
    <div
      role={priority === 'assertive' ? 'alert' : 'status'}
      aria-live={priority}
      aria-atomic="true"
      className="sr-only"
    >
      {message}
    </div>
  );
}

interface VisuallyHiddenProps {
  children: React.ReactNode;
}

/**
 * VisuallyHidden - Screen reader only content
 * Hides content visually but keeps it accessible to screen readers
 */
export function VisuallyHidden({ children }: VisuallyHiddenProps) {
  return (
    <span className="sr-only">
      {children}
    </span>
  );
}
