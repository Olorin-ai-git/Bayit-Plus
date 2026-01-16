import { useState } from 'react';
import { View, Text, Pressable, StyleSheet } from 'react-native';
import { useTranslation } from 'react-i18next';
import { getLanguageInfo } from '@bayit/shared/types/subtitle';
import { colors, spacing, borderRadius } from '@bayit/shared/theme';
import { GlassCard } from '@bayit/shared/ui';

interface ClickableSubtitleFlagsProps {
  languages: string[];
  selectedLanguage?: string;
  onLanguageSelect: (languageCode: string) => void;
  size?: 'medium' | 'large';
}

export function ClickableSubtitleFlags({
  languages,
  selectedLanguage,
  onLanguageSelect,
  size = 'large',
}: ClickableSubtitleFlagsProps) {
  const { t } = useTranslation();
  const [hoveredLanguage, setHoveredLanguage] = useState<string | null>(null);

  // Filter out null/undefined and get language info
  const languageData = languages
    .map(code => ({ code, info: getLanguageInfo(code) }))
    .filter(({ info }) => info);

  // Don't render if no languages
  if (languageData.length === 0) return null;

  const flagSize = size === 'large' ? 32 : 24;
  const fontSize = size === 'large' ? 14 : 12;

  return (
    <View style={styles.container}>
      <Text style={styles.title}>{t('content.availableSubtitles', 'Available Subtitles')}</Text>
      <View style={styles.flagsContainer}>
        {languageData.map(({ code, info }) => {
          const isSelected = selectedLanguage === code;
          const isHovered = hoveredLanguage === code;

          return (
            <Pressable
              key={code}
              onPress={() => onLanguageSelect(code)}
              onHoverIn={() => setHoveredLanguage(code)}
              onHoverOut={() => setHoveredLanguage(null)}
              style={[
                styles.flagButton,
                isSelected && styles.flagButtonSelected,
                isHovered && styles.flagButtonHovered,
              ]}
            >
              <Text style={[styles.flagEmoji, { fontSize: flagSize }]}>
                {info!.flag}
              </Text>
              <Text style={[
                styles.flagLabel,
                { fontSize },
                isSelected && styles.flagLabelSelected,
              ]}>
                {info!.nativeName}
              </Text>
              {isSelected && (
                <View style={styles.selectedIndicator}>
                  <Text style={styles.checkmark}>✓</Text>
                </View>
              )}
            </Pressable>
          );
        })}
      </View>
      {selectedLanguage && (
        <Text style={styles.selectedText}>
          {t('content.subtitleSelected', 'Selected: {{language}}', {
            language: getLanguageInfo(selectedLanguage)?.nativeName,
          })}
        </Text>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginBottom: spacing.lg,
  },
  title: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.text,
    marginBottom: spacing.md,
  },
  flagsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
  },
  flagButton: {
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    borderWidth: 2,
    borderColor: 'rgba(255, 255, 255, 0.1)',
    borderRadius: borderRadius.md,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
    alignItems: 'center',
    minWidth: 100,
    position: 'relative',
    // @ts-ignore - web-only
    cursor: 'pointer',
    transition: 'all 0.2s ease',
  },
  flagButtonSelected: {
    backgroundColor: 'rgba(168, 85, 247, 0.2)',
    borderColor: '#a855f7',
    // @ts-ignore - web-only
    boxShadow: '0 0 20px rgba(168, 85, 247, 0.3)',
  },
  flagButtonHovered: {
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    borderColor: 'rgba(255, 255, 255, 0.3)',
    // @ts-ignore - web-only
    transform: [{ scale: 1.05 }],
  },
  flagEmoji: {
    marginBottom: spacing.xs,
    lineHeight: 36,
  },
  flagLabel: {
    color: colors.textSecondary,
    textAlign: 'center',
    fontWeight: '500',
  },
  flagLabelSelected: {
    color: '#a855f7',
    fontWeight: '600',
  },
  selectedIndicator: {
    position: 'absolute',
    top: 4,
    right: 4,
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: '#a855f7',
    justifyContent: 'center',
    alignItems: 'center',
  },
  checkmark: {
    color: '#fff',
    fontSize: 12,
    fontWeight: 'bold',
  },
  selectedText: {
    marginTop: spacing.sm,
    fontSize: 13,
    color: '#a855f7',
    fontWeight: '500',
  },
});
