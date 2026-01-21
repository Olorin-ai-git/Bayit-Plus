import { useEffect, useRef } from 'react';

export const useAutoSave = (data: any, onSave: (data: any) => Promise<void>, interval: number = 5000) => {
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    const save = async () => {
      try {
        await onSave(data);
      } catch (error) {
        logger.error('Auto-save failed:', error);
      }
    };

    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }

    timeoutRef.current = setTimeout(() => {
      save();
    }, interval);

    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, [data, onSave, interval]);

  return null;
};
