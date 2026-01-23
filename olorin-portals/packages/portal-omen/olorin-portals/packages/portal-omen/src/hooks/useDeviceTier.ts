import { useEffect, useState } from 'react';

type DeviceTier = 'high' | 'medium' | 'low';

export const useDeviceTier = (): DeviceTier => {
  const [tier, setTier] = useState<DeviceTier>('high');

  useEffect(() => {
    const memory = (navigator as any).deviceMemory || 4;
    const cores = navigator.hardwareConcurrency || 4;
    const connection = (navigator as any).connection;

    // Low-end detection
    if (memory < 4 || cores < 4 || connection?.effectiveType === '3g') {
      setTier('low');
    }
    // Medium-end detection
    else if (memory < 8 || cores < 6) {
      setTier('medium');
    }
    // High-end
    else {
      setTier('high');
    }
  }, []);

  return tier;
};
