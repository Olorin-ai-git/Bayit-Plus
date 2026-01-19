/**
 * LanguageSettingsScreen
 *
 * Language selection and preferences
 * Features:
 * - Select app language (Hebrew, English, Spanish)
 * - Subtitle language preferences
 * - Audio language preferences
 * - RTL support
 */

import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Pressable,
  Platform,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { useTranslation } from 'react-i18next';
import ReactNativeHapticFeedback from 'react-native-haptic-feedback';
import { GlassView } from '@bayit/shared';
import { useDirection } from '@bayit/shared-hooks';
import { languages as sharedLanguages } from '@bayit/shared-i18n';
import { spacing, colors, typography, touchTarget } from '../theme';

type Language = {
  code: string;
  name: string;
  nativeName: string;
};

// Map shared languages to our format
const LANGUAGES: Language[] = sharedLanguages.map(lang => ({
  code: lang.code,
  name: getLanguageEnglishName(lang.code),
  nativeName: lang.name,
}));

// Get English name for language code
function getLanguageEnglishName(code: string): string {
  const names: Record<string, string> = {
    he: 'Hebrew',
    en: 'English',
    es: 'Spanish',
    zh: 'Chinese',
    fr: 'French',
    it: 'Italian',
    hi: 'Hindi',
    ta: 'Tamil',
    bn: 'Bengali',
    ja: 'Japanese',
  };
  return names[code] || code;
}

export const LanguageSettingsScreen: React.FC = () => {
  const { t, i18n } = useTranslation();
  const navigation = useNavigation();
  const { isRTL } = useDirection();

  const [selectedLanguage, setSelectedLanguage] = useState(i18n.language);
  const [selectedSubtitleLanguage, setSelectedSubtitleLanguage] = useState(i18n.language);
  const [selectedAudioLanguage, setSelectedAudioLanguage] = useState(i18n.language);

  const handleLanguageChange = async (languageCode: string) => {
    if (Platform.OS === 'ios') {
      ReactNativeHapticFeedback.trigger('selectionClick');
    }

    setSelectedLanguage(languageCode);
    await i18n.changeLanguage(languageCode);

    // Navigate back after a short delay to show selection
    setTimeout(() => {
      navigation.goBack();
    }, 300);
  };

  const handleSubtitleLanguageChange = (languageCode: string) => {
    if (Platform.OS === 'ios') {
      ReactNativeHapticFeedback.trigger('selectionClick');
    }
    setSelectedSubtitleLanguage(languageCode);
  };

  const handleAudioLanguageChange = (languageCode: string) => {
    if (Platform.OS === 'ios') {
      ReactNativeHapticFeedback.trigger('selectionClick');
    }
    setSelectedAudioLanguage(languageCode);
  };

  const renderLanguageOption = (
    language: Language,
    isSelected: boolean,
    onPress: (code: string) => void
  ) => (
    <Pressable
      key={language.code}
      onPress={() => onPress(language.code)}
      style={({ pressed }) => [pressed && styles.itemPressed]}
    >
      <GlassView style={[styles.item, isSelected && styles.itemSelected]}>
        <View style={styles.itemLeft}>
          <Text style={styles.itemTitle}>{language.nativeName}</Text>
          <Text style={styles.itemSubtitle}>{language.name}</Text>
        </View>
        {isSelected && (
          <View style={styles.checkmark}>
            <Text style={styles.checkmarkIcon}>✓</Text>
          </View>
        )}
      </GlassView>
    </Pressable>
  );

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.title}>{t('settings.language')}</Text>
        <Text style={styles.subtitle}>{t('settings.languageDescription')}</Text>
      </View>

      {/* App Language Section */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>{t('settings.appLanguage')}</Text>
        {LANGUAGES.map((language) =>
          renderLanguageOption(
            language,
            selectedLanguage === language.code,
            handleLanguageChange
          )
        )}
      </View>

      {/* Subtitle Language Section */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>{t('settings.subtitleLanguage')}</Text>
        <Text style={styles.sectionDescription}>
          {t('settings.subtitleLanguageDescription')}
        </Text>
        {LANGUAGES.map((language) =>
          renderLanguageOption(
            language,
            selectedSubtitleLanguage === language.code,
            handleSubtitleLanguageChange
          )
        )}
      </View>

      {/* Audio Language Section */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>{t('settings.audioLanguage')}</Text>
        <Text style={styles.sectionDescription}>
          {t('settings.audioLanguageDescription')}
        </Text>
        {LANGUAGES.map((language) =>
          renderLanguageOption(
            language,
            selectedAudioLanguage === language.code,
            handleAudioLanguageChange
          )
        )}
      </View>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  content: {
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.xl,
    paddingBottom: spacing.xxxl * 2,
  },
  header: {
    marginBottom: spacing.xl,
  },
  title: {
    ...typography.h1,
    color: colors.text,
    marginBottom: spacing.xs,
  },
  subtitle: {
    ...typography.body,
    color: colors.textSecondary,
  },
  section: {
    marginBottom: spacing.xl,
  },
  sectionTitle: {
    ...typography.bodySmall,
    fontSize: 13,
    color: colors.textSecondary,
    textTransform: 'uppercase',
    fontWeight: '600',
    marginBottom: spacing.sm,
    paddingHorizontal: spacing.xs,
  },
  sectionDescription: {
    ...typography.caption,
    fontSize: 13,
    color: colors.textTertiary,
    marginBottom: spacing.md,
    paddingHorizontal: spacing.xs,
  },
  item: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.lg,
    borderRadius: 12,
    marginBottom: spacing.sm,
    minHeight: touchTarget.minHeight,
  },
  itemSelected: {
    borderWidth: 2,
    borderColor: colors.primary,
  },
  itemPressed: {
    opacity: 0.7,
  },
  itemLeft: {
    flex: 1,
  },
  itemTitle: {
    ...typography.body,
    fontSize: 18,
    color: colors.text,
    fontWeight: '600',
    marginBottom: 2,
  },
  itemSubtitle: {
    ...typography.caption,
    fontSize: 13,
    color: colors.textSecondary,
  },
  checkmark: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: colors.primary,
    justifyContent: 'center',
    alignItems: 'center',
  },
  checkmarkIcon: {
    fontSize: 16,
    color: colors.text,
    fontWeight: '700',
  },
});

export default LanguageSettingsScreen;
