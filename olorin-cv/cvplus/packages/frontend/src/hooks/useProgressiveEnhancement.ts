import { useEffect, useState } from 'react';

interface ProgressiveEnhancementFeatures {
  supportsWebWorkers: boolean;
  supportsServiceWorkers: boolean;
  supportsOffline: boolean;
  supportsIndexedDB: boolean;
  supportsSharedArrayBuffer: boolean;
}

export const useProgressiveEnhancement = (): ProgressiveEnhancementFeatures => {
  const [features, setFeatures] = useState<ProgressiveEnhancementFeatures>({
    supportsWebWorkers: false,
    supportsServiceWorkers: false,
    supportsOffline: false,
    supportsIndexedDB: false,
    supportsSharedArrayBuffer: false,
  });

  useEffect(() => {
    const checkFeatures = (): ProgressiveEnhancementFeatures => ({
      supportsWebWorkers: typeof Worker !== 'undefined',
      supportsServiceWorkers: 'serviceWorker' in navigator,
      supportsOffline: 'onLine' in navigator,
      supportsIndexedDB: !!window.indexedDB,
      supportsSharedArrayBuffer: typeof SharedArrayBuffer !== 'undefined',
    });

    setFeatures(checkFeatures());
  }, []);

  return features;
};
