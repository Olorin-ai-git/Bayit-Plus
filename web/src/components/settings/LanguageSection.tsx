/**
 * LanguageSection
 * Language and theme settings: app language, theme mode, text direction.
 */

import { View, Text, Pressable, StyleSheet } from 'react-native';
import { useTranslation } from 'react-i18next';
import { useDirection } from '@/hooks/useDirection';
import { Globe, Moon, Sun, Monitor } from 'lucide-react';
import { colors, spacing, fontSize } from '@olorin/design-tokens';
import { SettingSection } from './shared/SettingSection';
import { SettingSelect } from './shared/SettingSelect';
import logger from '@/utils/logger';

const LANGUAGES = [
  { label: 'English', value: 'en' },
  { label: 'Hebrew', value: 'he' },
  { label: 'Spanish', value: 'es' },
  { label: 'French', value: 'fr' },
  { label: 'Italian', value: 'it' },
  { label: 'Chinese', value: 'zh' },
  { label: 'Japanese', value: 'ja' },
  { label: 'Hindi', value: 'hi' },
  { label: 'Bengali', value: 'bn' },
  { label: 'Tamil', value: 'ta' },
];

const THEME_OPTIONS = [
  { label: 'Dark', value: 'dark' },
  { label: 'Light', value: 'light' },
  { label: 'System', value: 'system' },
];

export function LanguageSection() {
  const { t, i18n } = useTranslation();
  const { isRTL } = useDirection();

  const handleLanguageChange = (lang: string) => {
    i18n.changeLanguage(lang);
    logger.info('Language changed', 'LanguageSection', { language: lang });
  };

  return (
    <SettingSection title={t('settings.general', 'General')} isRTL={isRTL}>
      <SettingSelect
        icon={Globe}
        label={t('settings.appLanguage', 'App Language')}
        description={t('settings.appLanguageDesc', 'Changes the app interface language')}
        options={LANGUAGES}
        value={i18n.language}
        onValueChange={handleLanguageChange}
        isRTL={isRTL}
      />
      <SettingSelect
        icon={Moon}
        label={t('settings.theme', 'Theme')}
        options={THEME_OPTIONS}
        value="dark"
        onValueChange={() => {}}
        isRTL={isRTL}
      />
    </SettingSection>
  );
}
