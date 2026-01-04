/**
 * useUrlState Hook - Manage state via URL query string
 * Enables shareable URLs with filter state
 */

import { useSearchParams } from 'react-router-dom';
import { useCallback, useMemo } from 'react';

export function useUrlState<T extends Record<string, string | string[] | undefined>>(
  defaultState: T
): [T, (updates: Partial<T>) => void, () => void] {
  const [searchParams, setSearchParams] = useSearchParams();

  const state = useMemo(() => {
    const result = { ...defaultState };
    for (const [key, defaultValue] of Object.entries(defaultState)) {
      const param = searchParams.get(key);
      if (param !== null) {
        if (Array.isArray(defaultValue)) {
          result[key as keyof T] = param.split(',') as T[keyof T];
        } else {
          result[key as keyof T] = param as T[keyof T];
        }
      }
    }
    return result;
  }, [searchParams]); // Removed defaultState from deps to prevent infinite loops

  const updateState = useCallback(
    (updates: Partial<T>) => {
      setSearchParams((prev) => {
        const newParams = new URLSearchParams(prev);
        for (const [key, value] of Object.entries(updates)) {
          if (value === undefined || value === null || value === '') {
            newParams.delete(key);
          } else if (Array.isArray(value)) {
            newParams.set(key, value.join(','));
          } else {
            newParams.set(key, String(value));
          }
        }
        return newParams;
      });
    },
    [setSearchParams]
  );

  const resetState = useCallback(() => {
    setSearchParams({});
  }, [setSearchParams]);

  return [state, updateState, resetState];
}

