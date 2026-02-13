/**
 * SubtitleFlagsTV - Subtitle language flags for tvOS content cards
 *
 * Features:
 * - Emoji flag indicators for available subtitle languages
 * - Compact display optimized for 10-foot viewing
 * - Max 5 flags with +N overflow indicator
 * - Glassmorphic background with blur
 * - Positioned absolutely for overlay on content cards
 */

import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { getLanguageInfo } from '@bayit/shared/types/subtitle';
import { config } from '../config/appConfig';

interface SubtitleFlagsTVProps {
  languages: string[];
  maxDisplay?: number;
  size?: 'small' | 'medium';
  position?: 'bottom-left' | 'bottom-right';
  isRTL?: boolean;
}

export const SubtitleFlagsTV: React.FC<SubtitleFlagsTVProps> = ({
  languages,
  maxDisplay = 5,
  size = 'small',
  position = 'bottom-right',
  isRTL = false,
}) => {
  // Deduplicate and get language info
  const uniqueLanguages = [...new Set(languages)];
  const languageData = uniqueLanguages
    .map(code => getLanguageInfo(code))
    .filter(Boolean) as NonNullable<ReturnType<typeof getLanguageInfo>>[];

  const displayLanguages = languageData.slice(0, maxDisplay);
  const remainingCount = Math.max(0, languageData.length - maxDisplay);

  // Don't render if no languages
  if (languageData.length === 0) return null;

  const flagSize = size === 'medium' ? 20 : 16;
  const fontSize = size === 'medium' ? 18 : 16;

  // Calculate position style
  const getPositionStyle = () => {
    const base = { position: 'absolute' as const, bottom: 12, zIndex: 10 };
    if (position === 'bottom-left') {
      return { ...base, ...(isRTL ? { right: 12 } : { left: 12 }) };
    }
    return { ...base, ...(isRTL ? { left: 12 } : { right: 12 }) };
  };

  return (
    <View style={[styles.container, getPositionStyle()]}>
      <View style={styles.flagsContainer}>
        <View style={styles.flagsRow}>
          {displayLanguages.map((lang) => (
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
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
  },
  flagsContainer: {
    borderRadius: 6,
    paddingHorizontal: 8,
    paddingVertical: 4,
    backgroundColor: 'rgba(0, 0, 0, 0.75)',
    alignSelf: 'flex-start',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
  },
  flagsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  flagText: {
    color: '#fff',
  },
  remainingText: {
    color: 'rgba(255, 255, 255, 0.5)',
    fontWeight: '600',
    marginLeft: 2,
  },
});
