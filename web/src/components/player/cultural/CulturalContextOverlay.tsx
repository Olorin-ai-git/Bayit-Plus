import React, { useState, useEffect, useCallback, useRef } from 'react';
import { View, Text, Pressable, StyleSheet } from 'react-native';
import { colors, spacing, fontSize, borderRadius } from '@olorin/design-tokens';
import { logger } from '@bayit/shared-utils/logger';
import { api } from '@/services/api';

interface CulturalReference {
  reference_id: string;
  text: string;
  start_offset: number;
  end_offset: number;
  category: string;
  confidence: number;
}

interface DetectionResponse {
  references: CulturalReference[];
  text: string;
  language: string;
}

interface CulturalContextOverlayProps {
  currentTime: number;
  subtitleText: string;
  language: string;
  enabled: boolean;
  onReferenceSelect: (referenceId: string) => void;
}

const CulturalContextOverlay: React.FC<CulturalContextOverlayProps> = ({
  currentTime,
  subtitleText,
  language,
  enabled,
  onReferenceSelect,
}) => {
  const [references, setReferences] = useState<CulturalReference[]>([]);
  const [loading, setLoading] = useState(false);
  const detectionCache = useRef<Map<string, CulturalReference[]>>(new Map());
  const debounceTimer = useRef<NodeJS.Timeout | null>(null);
  const lastDetectedText = useRef<string>('');

  const detectReferences = useCallback(
    async (text: string) => {
      if (!text || !enabled || text === lastDetectedText.current) {
        return;
      }

      const cacheKey = `${language}:${text}`;
      if (detectionCache.current.has(cacheKey)) {
        setReferences(detectionCache.current.get(cacheKey) || []);
        lastDetectedText.current = text;
        return;
      }

      try {
        setLoading(true);
        const response = await api.post<DetectionResponse>('/cultural/detect', {
          text,
          language,
        });

        const detectedRefs = response.references || [];
        detectionCache.current.set(cacheKey, detectedRefs);
        setReferences(detectedRefs);
        lastDetectedText.current = text;

        logger.debug('Cultural references detected', {
          count: detectedRefs.length,
          language,
        });
      } catch (error) {
        logger.error('Failed to detect cultural references', { error });
        setReferences([]);
      } finally {
        setLoading(false);
      }
    },
    [language, enabled]
  );

  useEffect(() => {
    if (!enabled || !subtitleText) {
      setReferences([]);
      return;
    }

    if (debounceTimer.current) {
      clearTimeout(debounceTimer.current);
    }

    debounceTimer.current = setTimeout(() => {
      detectReferences(subtitleText);
    }, 300);

    return () => {
      if (debounceTimer.current) {
        clearTimeout(debounceTimer.current);
      }
    };
  }, [subtitleText, enabled, detectReferences]);

  const handleBadgePress = useCallback(
    (referenceId: string) => {
      onReferenceSelect(referenceId);
      logger.debug('Cultural reference selected', { referenceId });
    },
    [onReferenceSelect]
  );

  if (!enabled || references.length === 0) {
    return null;
  }

  return (
    <View style={styles.container}>
      <View style={styles.badgeContainer}>
        {references.map((ref, index) => (
          <Pressable
            key={`${ref.reference_id}-${index}`}
            style={({ pressed }) => [
              styles.badge,
              pressed && styles.badgePressed,
            ]}
            onPress={() => handleBadgePress(ref.reference_id)}
          >
            <View
              style={[
                styles.badgeDot,
                { backgroundColor: getCategoryColor(ref.category) },
              ]}
            />
          </Pressable>
        ))}
      </View>
    </View>
  );
};

const getCategoryColor = (category: string): string => {
  const categoryColors: Record<string, string> = {
    religious: colors.primary,
    historical: colors.secondary,
    slang: colors.accent,
    food: colors.success,
    holiday: colors.warning,
  };

  return categoryColors[category] || colors.info;
};

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    bottom: spacing.xl,
    left: 0,
    right: 0,
    alignItems: 'center',
    pointerEvents: 'box-none',
  },
  badgeContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
    justifyContent: 'center',
    maxWidth: 600,
    paddingHorizontal: spacing.md,
  },
  badge: {
    padding: spacing.xs,
    cursor: 'pointer',
  },
  badgePressed: {
    opacity: 0.7,
  },
  badgeDot: {
    width: 8,
    height: 8,
    borderRadius: borderRadius.full,
    shadowColor: colors.textPrimary,
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.3,
    shadowRadius: 2,
  },
});

export default CulturalContextOverlay;
