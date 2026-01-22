/**
 * Screen Reader Announcements Hook
 * WCAG 4.1.3 compliance for state change announcements
 */

import React, { useRef, useCallback } from 'react';

export const useScreenReaderAnnouncements = () => {
  const announceRef = useRef<HTMLDivElement>(null);

  const announce = useCallback((message: string, priority: 'polite' | 'assertive' = 'polite') => {
    if (!announceRef.current) return;

    announceRef.current.setAttribute('aria-live', priority);
    announceRef.current.textContent = message;

    // Clear after 1 second to allow re-announcement of same message
    setTimeout(() => {
      if (announceRef.current) announceRef.current.textContent = '';
    }, 1000);
  }, []);

  const AnnouncementRegion = () => (
    <div
      ref={announceRef}
      role="status"
      aria-live="polite"
      aria-atomic="true"
      className="sr-only"
    />
  );

  return { announce, AnnouncementRegion };
};

export default useScreenReaderAnnouncements;
