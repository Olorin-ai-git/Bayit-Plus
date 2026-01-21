/**
 * useDebounce Hook
 *
 * Debounces value changes to reduce callback frequency.
 */

import { useEffect, useState } from 'react';

export function useDebounce<T>(callback: (value: T) => void, delay: number) {
  const [debounceTimer, setDebounceTimer] = useState<NodeJS.Timeout | null>(null);

  useEffect(() => {
    return () => {
      if (debounceTimer) {
        clearTimeout(debounceTimer);
      }
    };
  }, [debounceTimer]);

  return (value: T) => {
    if (debounceTimer) {
      clearTimeout(debounceTimer);
    }
    const timer = setTimeout(() => {
      callback(value);
    }, delay);
    setDebounceTimer(timer);
  };
}

