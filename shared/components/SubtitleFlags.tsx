import { useState } from 'react';
import { View, Text, Pressable, StyleSheet, Platform } from 'react-native';
import { getLanguageInfo } from '../../web/src/types/subtitle';
import { colors, spacing, borderRadius } from '../theme';
import { GlassCard } from '../ui';

interface SubtitleFlagsProps {
  languages: string[];
  maxDisplay?: number;
  size?: 'small' | 'medium';
  showTooltip?: boolean;
  position?: 'bottom-left' | 'bottom-right';
  isRTL?: boolean;
}

export function SubtitleFlags({
  languages,
  maxDisplay = 5,
  size = 'small',
  showTooltip = true,
  position = 'bottom-right',
  isRTL = false,
}: SubtitleFlagsProps) {
  const [tooltipVisible, setTooltipVisible] = useState(false);

  // Filter out null/undefined and get language info
  const languageData = languages
    .map(code => getLanguageInfo(code))
    .filter(Boolean) as NonNullable<ReturnType<typeof getLanguageInfo>>[];

  const displayLanguages = languageData.slice(0, maxDisplay);
  const remainingCount = Math.max(0, languageData.length - maxDisplay);

  // Don't render if no languages
  if (languageData.length === 0) return null;

  const flagSize = size === 'medium' ? 16 : 14;
  const fontSize = size === 'medium' ? 16 : 14;

  return (
    <Pressable
      onHoverIn={() => setTooltipVisible(true)}
      onHoverOut={() => setTooltipVisible(false)}
      onPress={() => setTooltipVisible(!tooltipVisible)}
      style={[
        styles.container,
        position === 'bottom-left'
          ? (isRTL ? styles.bottomRight : styles.bottomLeft)
          : (isRTL ? styles.bottomLeft : styles.bottomRight)
      ]}
    >
      {/* Flags Row */}
      <View style={[styles.flagsContainer, { backgroundColor: 'rgba(0, 0, 0, 0.7)' }]}>
        <View style={styles.flagsRow}>
          {displayLanguages.map((lang, i) => (
            <Text key={lang.code} style={[styles.flagEmoji, { fontSize: flagSize, lineHeight: flagSize * 1.2 }]}>
              {lang.flag}
            </Text>
          ))}
          {remainingCount > 0 && (
            <Text style={[styles.moreCount, { fontSize: fontSize - 2 }]}>+{remainingCount}</Text>
          )}
        </View>
      </View>

      {/* Tooltip */}
      {showTooltip && tooltipVisible && (
        <View style={styles.tooltipContainer} pointerEvents="none">
          <GlassCard style={styles.tooltip}>
            <Text style={styles.tooltipText}>
              {languageData.map(lang => lang.nativeName).join(', ')}
            </Text>
          </GlassCard>
        </View>
      )}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    bottom: spacing.sm,
    zIndex: 5,
  },
  bottomLeft: {
    left: spacing.sm,
  },
  bottomRight: {
    right: spacing.sm,
  },
  flagsContainer: {
    borderRadius: 4,
    paddingHorizontal: 6,
    paddingVertical: 2,
    // @ts-ignore - web-only backdropFilter
    backdropFilter: Platform.OS === 'web' ? 'blur(8px)' : undefined,
  },
  flagsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  flagEmoji: {
    color: colors.text,
  },
  moreCount: {
    color: colors.textMuted,
    fontWeight: '600',
    marginLeft: 2,
  },
  tooltipContainer: {
    position: 'absolute',
    bottom: '100%',
    left: 0,
    marginBottom: 4,
  },
  tooltip: {
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    minWidth: 100,
    maxWidth: 200,
  },
  tooltipText: {
    fontSize: 12,
    color: colors.text,
    textAlign: 'left',
  },
});
