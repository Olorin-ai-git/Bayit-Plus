/**
 * Content Types Section Component
 * Select content types for morning ritual
 */

import { View, Text, Pressable, StyleSheet } from 'react-native';
import { useTranslation } from 'react-i18next';
import { Check } from 'lucide-react';
import { GlassView } from '@bayit/shared/ui';
import { colors } from '@bayit/shared/theme';
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
    <GlassView className="p-4 gap-4" style={!enabled && styles.disabled}>
      <Text className="text-[13px] font-semibold text-gray-400 uppercase tracking-wide" style={isRTL && styles.textRight}>
        {t('settings.ritual.contentTypes')}
      </Text>

      <View className="gap-2">
        {contentOptions.map((content) => {
          const isSelected = selectedContent.includes(content.id);
          return (
            <Pressable
              key={content.id}
              onPress={() => enabled && onToggle(content.id)}
              className="flex-row items-center gap-3 p-3 rounded-lg"
              style={[
                isSelected ? styles.contentSelected : styles.contentUnselected,
                isRTL && styles.rowReverse,
              ]}
            >
              <Text className="text-[20px]">{content.icon}</Text>
              <Text className="flex-1 text-[14px] text-white" style={isRTL && styles.textRight}>
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
  disabled: {
    opacity: 0.5,
  },
  rowReverse: {
    flexDirection: 'row-reverse',
  },
  textRight: {
    textAlign: 'right',
  },
  contentSelected: {
    backgroundColor: 'rgba(126, 34, 206, 0.3)',
    borderWidth: 1,
    borderColor: 'rgba(168, 85, 247, 0.6)',
  },
  contentUnselected: {
    backgroundColor: 'rgba(255, 255, 255, 0.03)',
  },
});
