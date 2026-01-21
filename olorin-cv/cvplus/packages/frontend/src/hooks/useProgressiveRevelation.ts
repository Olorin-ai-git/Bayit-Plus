import { useState, useCallback } from 'react';

export interface RevealedFeature {
  id: string;
  revealed: boolean;
  revealedAt?: Date;
}

export const useProgressiveRevelation = () => {
  const [revealedFeatures, setRevealedFeatures] = useState<Map<string, RevealedFeature>>(new Map());

  const revealFeature = useCallback((featureId: string) => {
    setRevealedFeatures(prev => {
      const updated = new Map(prev);
      updated.set(featureId, {
        id: featureId,
        revealed: true,
        revealedAt: new Date(),
      });
      return updated;
    });
  }, []);

  const isFeatureRevealed = useCallback((featureId: string): boolean => {
    return revealedFeatures.get(featureId)?.revealed ?? false;
  }, [revealedFeatures]);

  return {
    revealedFeatures,
    revealFeature,
    isFeatureRevealed,
  };
};
