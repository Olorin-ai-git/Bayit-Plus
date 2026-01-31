/**
 * AI Enhanced Badge
 *
 * A glassmorphic badge indicating AI-enhanced content with features like
 * vocabulary, context, quiz, and translation. Shows on content cards for
 * educational channels like Kan Educational.
 */

import { useState } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { useTranslation } from 'react-i18next';
import { Sparkles } from 'lucide-react';
import { colors, spacing, borderRadius } from '@olorin/design-tokens';

interface AIEnhancedBadgeProps {
  features?: string[];
  size?: 'small' | 'medium';
  showTooltip?: boolean;
}

export default function AIEnhancedBadge({
  features = [],
  size = 'small',
  showTooltip = true,
}: AIEnhancedBadgeProps) {
  const { t } = useTranslation();
  const [isHovered, setIsHovered] = useState(false);

  const iconSize = size === 'small' ? 12 : 16;
  const fontSize = size === 'small' ? 10 : 12;

  const getFeatureLabel = (feature: string): string => {
    const featureLabels: Record<string, string> = {
      vocabulary: t('aiCompanion.vocabulary'),
      context: t('aiCompanion.context'),
      quiz: t('aiCompanion.quiz'),
      translation: t('player.translation'),
    };
    return featureLabels[feature] || feature;
  };

  const tooltipText = features.length > 0
    ? `${t('badges.aiEnhanced')}: ${features.map(getFeatureLabel).join(', ')}`
    : t('badges.aiEnhancedTooltip');

  return (
    <View
      style={[styles.container, size === 'medium' && styles.containerMedium]}
      // @ts-ignore - Web hover events
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      <Sparkles size={iconSize} color={colors.warning} />
      {size === 'medium' && (
        <Text style={[styles.label, { fontSize }]}>{t('badges.aiEnhanced')}</Text>
      )}

      {/* Tooltip on hover */}
      {showTooltip && isHovered && (
        <View style={styles.tooltip}>
          <Text style={styles.tooltipText}>{tooltipText}</Text>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: spacing.xs,
    paddingVertical: 3,
    borderRadius: borderRadius.sm,
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
    // @ts-ignore - Web backdrop-filter
    backdropFilter: 'blur(8px)',
  },
  containerMedium: {
    paddingHorizontal: spacing.sm,
    paddingVertical: 5,
  },
  label: {
    color: colors.warning,
    fontWeight: '600',
  },
  tooltip: {
    position: 'absolute',
    bottom: '100%',
    left: '50%',
    // @ts-ignore - Web transform
    transform: 'translateX(-50%)',
    marginBottom: spacing.xs,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    backgroundColor: 'rgba(0, 0, 0, 0.9)',
    borderRadius: borderRadius.sm,
    // @ts-ignore - Web backdrop-filter
    backdropFilter: 'blur(12px)',
    whiteSpace: 'nowrap',
    zIndex: 100,
  },
  tooltipText: {
    fontSize: 11,
    color: colors.text,
  },
});
