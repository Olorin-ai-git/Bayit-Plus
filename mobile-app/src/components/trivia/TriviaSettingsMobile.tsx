/**
 * TriviaSettingsMobile - Settings panel for trivia preferences
 *
 * Features:
 * - Difficulty selection (easy/medium/hard)
 * - Category toggles
 * - Language preference
 * - RTL support, accessibility
 */

import React, { useCallback } from 'react';
import { View, Text, Pressable } from 'react-native';
import { useTranslation } from 'react-i18next';
import { useDirection } from '@bayit/shared-hooks';
import { NativeIcon } from '@olorin/shared-icons/native';
import {
  TRIVIA_CATEGORIES,
  type TriviaCategory,
  type TriviaFrequency,
} from '@bayit/shared/types/trivia';
import { Colors } from '../../theme/colors';
import { styles } from './TriviaSettingsMobile.styles';
import logger from '@/utils/logger';

const settingsLogger = logger.scope('TriviaSettingsMobile');

interface TriviaSettingsData {
  difficulty: 'easy' | 'medium' | 'hard';
  categories: TriviaCategory[];
  language: string;
  frequency: TriviaFrequency;
}

interface TriviaSettingsMobileProps {
  settings: TriviaSettingsData;
  onSettingsChange: (updated: TriviaSettingsData) => void;
}

const DIFFICULTY_OPTIONS: Array<{ id: 'easy' | 'medium' | 'hard'; icon: string }> = [
  { id: 'easy', icon: 'star' },
  { id: 'medium', icon: 'zap' },
  { id: 'hard', icon: 'flame' },
];

const AVAILABLE_LANGUAGES = [
  { code: 'he', labelKey: 'trivia.languages.hebrew' },
  { code: 'en', labelKey: 'trivia.languages.english' },
  { code: 'es', labelKey: 'trivia.languages.spanish' },
];

export const TriviaSettingsMobile: React.FC<TriviaSettingsMobileProps> = ({
  settings, onSettingsChange,
}) => {
  const { t, i18n } = useTranslation();
  const { isRTL, textAlign } = useDirection();

  const handleDifficultyChange = useCallback((difficulty: 'easy' | 'medium' | 'hard') => {
    onSettingsChange({ ...settings, difficulty });
    settingsLogger.info('Difficulty changed', { difficulty });
  }, [settings, onSettingsChange]);

  const handleCategoryToggle = useCallback((categoryId: TriviaCategory) => {
    const current = settings.categories;
    const updated = current.includes(categoryId)
      ? current.filter((c) => c !== categoryId) : [...current, categoryId];
    if (updated.length > 0) {
      onSettingsChange({ ...settings, categories: updated });
      settingsLogger.info('Category toggled', { categoryId, enabled: !current.includes(categoryId) });
    }
  }, [settings, onSettingsChange]);

  const handleLanguageToggle = useCallback((lang: string) => {
    onSettingsChange({ ...settings, language: lang });
    settingsLogger.info('Language changed', { language: lang });
  }, [settings, onSettingsChange]);

  return (
    <View style={styles.container} accessibilityRole="summary"
      accessibilityLabel={t('trivia.settings.title')}>
      <Text style={[styles.title, { textAlign }]}>{t('trivia.settings.title')}</Text>

      <Text style={[styles.sectionLabel, { textAlign }]}>{t('trivia.settings.difficulty')}</Text>
      <View style={[styles.optionsRow, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}>
        {DIFFICULTY_OPTIONS.map((opt) => {
          const isSelected = settings.difficulty === opt.id;
          return (
            <Pressable key={opt.id}
              style={[styles.optionChip, isSelected && styles.optionChipActive]}
              onPress={() => handleDifficultyChange(opt.id)}
              accessibilityRole="button" accessibilityLabel={t(`trivia.difficulty.${opt.id}`)}
              accessibilityHint={t('trivia.settings.selectDifficultyHint')}
              accessibilityState={{ selected: isSelected }}>
              <NativeIcon name={opt.icon} size="sm"
                color={isSelected ? Colors.Text.primary : Colors.Text.muted} />
              <Text style={[styles.optionText, isSelected && styles.optionTextActive]}>
                {t(`trivia.difficulty.${opt.id}`)}
              </Text>
            </Pressable>
          );
        })}
      </View>

      <Text style={[styles.sectionLabel, { textAlign }]}>{t('trivia.settings.categories')}</Text>
      <View style={styles.categoriesWrap}>
        {TRIVIA_CATEGORIES.map((cat) => {
          const isActive = settings.categories.includes(cat.id);
          return (
            <Pressable key={cat.id}
              style={[styles.categoryChip, isActive && styles.categoryChipActive]}
              onPress={() => handleCategoryToggle(cat.id)}
              accessibilityRole="checkbox"
              accessibilityLabel={i18n.language === 'he' ? cat.label_he : cat.label_en}
              accessibilityHint={t('trivia.settings.toggleCategoryHint')}
              accessibilityState={{ checked: isActive }}>
              <NativeIcon name={cat.icon} size="xs"
                color={isActive ? Colors.Text.primary : Colors.Text.muted} />
              <Text style={[styles.categoryChipText, isActive && styles.categoryChipTextActive]}>
                {i18n.language === 'he' ? cat.label_he : cat.label_en}
              </Text>
            </Pressable>
          );
        })}
      </View>

      <Text style={[styles.sectionLabel, { textAlign }]}>{t('trivia.settings.language')}</Text>
      <View style={[styles.optionsRow, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}>
        {AVAILABLE_LANGUAGES.map((lang) => {
          const isSelected = settings.language === lang.code;
          return (
            <Pressable key={lang.code}
              style={[styles.optionChip, isSelected && styles.optionChipActive]}
              onPress={() => handleLanguageToggle(lang.code)}
              accessibilityRole="button" accessibilityLabel={t(lang.labelKey)}
              accessibilityHint={t('trivia.settings.selectLanguageHint')}
              accessibilityState={{ selected: isSelected }}>
              <Text style={[styles.optionText, isSelected && styles.optionTextActive]}>
                {t(lang.labelKey)}
              </Text>
            </Pressable>
          );
        })}
      </View>
    </View>
  );
};

export default TriviaSettingsMobile;
