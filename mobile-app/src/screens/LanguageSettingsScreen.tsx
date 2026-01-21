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
      ReactNativeHapticFeedback.trigger('selection');
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
      ReactNativeHapticFeedback.trigger('selection');
    }
    setSelectedSubtitleLanguage(languageCode);
  };

  const handleAudioLanguageChange = (languageCode: string) => {
    if (Platform.OS === 'ios') {
      ReactNativeHapticFeedback.trigger('selection');
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
      className="active:opacity-70"
    >
      <GlassView className={`flex-row items-center justify-between py-3.5 px-4 rounded-xl mb-2 min-h-[48px] ${isSelected ? 'border-2 border-[#7e22ce]' : ''}`}>
        <View className="flex-1">
          <Text className="text-lg text-white font-semibold mb-0.5">{language.nativeName}</Text>
          <Text className="text-[13px] text-white/70">{language.name}</Text>
        </View>
        {isSelected && (
          <View className="w-7 h-7 rounded-full bg-[#7e22ce] justify-center items-center">
            <Text className="text-base text-white font-bold">✓</Text>
          </View>
        )}
      </GlassView>
    </Pressable>
  );

  return (
    <ScrollView className="flex-1 bg-[#0f0a1a]" contentContainerClassName="px-4 pt-6 pb-24">
      {/* Header */}
      <View className="mb-6">
        <Text className="text-3xl font-bold text-white mb-1">{t('settings.language')}</Text>
        <Text className="text-base text-white/70">{t('settings.languageDescription')}</Text>
      </View>

      {/* App Language Section */}
      <View className="mb-6">
        <Text className="text-[13px] text-white/70 uppercase font-semibold mb-2 px-1">
          {t('settings.appLanguage')}
        </Text>
        {LANGUAGES.map((language) =>
          renderLanguageOption(
            language,
            selectedLanguage === language.code,
            handleLanguageChange
          )
        )}
      </View>

      {/* Subtitle Language Section */}
      <View className="mb-6">
        <Text className="text-[13px] text-white/70 uppercase font-semibold mb-2 px-1">
          {t('settings.subtitleLanguage')}
        </Text>
        <Text className="text-[13px] text-white/50 mb-3 px-1">
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
      <View className="mb-6">
        <Text className="text-[13px] text-white/70 uppercase font-semibold mb-2 px-1">
          {t('settings.audioLanguage')}
        </Text>
        <Text className="text-[13px] text-white/50 mb-3 px-1">
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

export default LanguageSettingsScreen;
