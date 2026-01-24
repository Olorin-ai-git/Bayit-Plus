import { useState } from 'react';
import { View, Text, Pressable, Platform, StyleSheet } from 'react-native';
import { getLanguageInfo } from '../types/subtitle';
import { colors, spacing, borderRadius } from '../theme';

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

  // Calculate position style based on props
  const getPositionStyle = () => {
    if (position === 'bottom-left') {
      return isRTL ? styles.positionBottomRight : styles.positionBottomLeft;
    }
    return isRTL ? styles.positionBottomLeft : styles.positionBottomRight;
  };

  return (
    <Pressable
      onHoverIn={() => setTooltipVisible(true)}
      onHoverOut={() => setTooltipVisible(false)}
      onPress={() => setTooltipVisible(!tooltipVisible)}
      style={[styles.container, getPositionStyle()]}
    >
      {/* Flags Row */}
      <View
        style={[
          styles.flagsContainer,
          Platform.OS === 'web' && { backdropFilter: 'blur(8px)' } as any,
        ]}
      >
        <View style={styles.flagsRow}>
          {displayLanguages.map((lang, i) => (
            <Text
              key={lang.code}
              style={[styles.flagText, { fontSize: flagSize, lineHeight: flagSize * 1.2 }]}
            >
              {lang.flag}
            </Text>
          ))}
          {remainingCount > 0 && (
            <Text style={[styles.remainingText, { fontSize: fontSize - 2 }]}>
              +{remainingCount}
            </Text>
          )}
        </View>
      </View>

      {/* Tooltip */}
      {showTooltip && tooltipVisible && (
        <View style={styles.tooltipContainer} pointerEvents="none">
          <View style={styles.tooltipCard}>
            <Text style={styles.tooltipText}>
              {languageData.map(lang => lang.nativeName).join(', ')}
            </Text>
          </View>
        </View>
      )}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    bottom: 24,
    zIndex: 50,
  },
  positionBottomLeft: {
    left: 24,
  },
  positionBottomRight: {
    right: 24,
  },
  flagsContainer: {
    borderRadius: borderRadius.sm,
    paddingHorizontal: 6,
    paddingVertical: 2,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    alignSelf: 'flex-start',
  },
  flagsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  flagText: {
    color: '#fff',
  },
  remainingText: {
    color: 'rgba(255, 255, 255, 0.4)',
    fontWeight: '600',
    marginLeft: 2,
  },
  tooltipContainer: {
    position: 'absolute',
    bottom: '100%',
    left: 0,
    marginBottom: 4,
  },
  tooltipCard: {
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    minWidth: 100,
    maxWidth: 200,
    backgroundColor: 'rgba(0, 0, 0, 0.85)',
    borderRadius: borderRadius.md,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
  },
  tooltipText: {
    fontSize: 12,
    color: '#fff',
    textAlign: 'left',
  },
});
