/**
 * Content Types Section Component
 * Select content types for morning ritual
 */

import { View, Text, Pressable, StyleSheet } from 'react-native';
import { useTranslation } from 'react-i18next';
import { Check } from 'lucide-react';
import { GlassView } from '@bayit/shared/ui';
import { colors, spacing, borderRadius } from '@olorin/design-tokens';
import { ContentTypesSectionProps, ContentOption, ContentType } from '../types';

export function ContentTypesSection({
  selectedContent,
  enabled,
  onToggle,
  isRTL,
}: ContentTypesSectionProps) {
  const { t } = useTranslation();

  const contentOptions: ContentOption[] = [
    { id: 'news' as ContentType, label: t('settings.ritual.news'), icon: '📰' },
    { id: 'radio' as ContentType, label: t('settings.ritual.radio'), icon: '📻' },
    { id: 'vod' as ContentType, label: t('settings.ritual.videos'), icon: '🎬' },
  ];

  return (
    <GlassView style={[styles.container, !enabled && styles.disabled]}>
      <Text style={[styles.sectionTitle, isRTL && styles.textRight]}>
        {t('settings.ritual.contentTypes')}
      </Text>

      <View style={styles.optionsContainer}>
        {contentOptions.map((content) => {
          const isSelected = selectedContent.includes(content.id);
          return (
            <Pressable
              key={content.id}
              onPress={() => enabled && onToggle(content.id)}
              style={[
                styles.contentOption,
                isSelected ? styles.contentSelected : styles.contentUnselected,
                isRTL && styles.rowReverse,
              ]}
            >
              <Text style={styles.contentIcon}>{content.icon}</Text>
              <Text style={[styles.contentLabel, isRTL && styles.textRight]}>
                {content.label}
              </Text>
              {isSelected && <Check size={18} color={colors.primary} />}
            </Pressable>
          );
        })}
      </View>
    </GlassView>
  );
}

const styles = StyleSheet.create({
  container: {
    padding: spacing.md,
    gap: spacing.md,
  },
  sectionTitle: {
    fontSize: 13,
    fontWeight: '600',
    color: colors.textSecondary,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  optionsContainer: {
    gap: spacing.sm,
  },
  contentOption: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    padding: 12,
    borderRadius: borderRadius.lg,
  },
  contentSelected: {
    backgroundColor: colors.glassPurple,
    borderWidth: 1,
    borderColor: colors.glassBorderFocus,
  },
  contentUnselected: {
    backgroundColor: 'rgba(255, 255, 255, 0.03)',
  },
  contentIcon: {
    fontSize: 20,
  },
  contentLabel: {
    flex: 1,
    fontSize: 14,
    color: colors.text,
  },
  disabled: {
    opacity: 0.5,
  },
  rowReverse: {
    flexDirection: 'row-reverse',
  },
  textRight: {
    textAlign: 'right',
  },
});
