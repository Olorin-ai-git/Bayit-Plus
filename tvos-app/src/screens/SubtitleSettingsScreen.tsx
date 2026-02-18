/**
 * SubtitleSettingsScreen - Enhanced subtitle settings for tvOS
 *
 * Features:
 * - Subtitle enable/disable and language selection
 * - Text/background color picker, font size control
 * - AI subtitle translation toggle and language selector
 * - Hebrew mode selection (regular, nikud, shoresh, etc.)
 */

import React, { useEffect, useState } from 'react';
import { View, Text, ScrollView, ActivityIndicator } from 'react-native';
import { useTranslation } from 'react-i18next';
import { Subtitles, Palette, Type, Languages, Bot, Globe } from 'lucide-react-native';
import { TVHeader } from '../components/TVHeader';
import { SettingRow } from '../components/profile/SettingRow';
import { useSubtitleSettingsStore } from '../stores/subtitleSettingsStore';
import { settingsSharedStyles as styles } from './styles/settingsShared.styles';
import { SUBTITLE_LANGUAGES } from '@bayit/shared-types';

const TEXT_COLOR_OPTIONS = [
  { label: 'White', value: '#ffffff' },
  { label: 'Yellow', value: '#facc15' },
  { label: 'Cyan', value: '#22d3ee' },
  { label: 'Green', value: '#4ade80' },
];

const BG_COLOR_OPTIONS = [
  { label: 'Black', value: 'rgba(0,0,0,0.75)' },
  { label: 'Dark Gray', value: 'rgba(50,50,50,0.75)' },
  { label: 'Navy', value: 'rgba(0,0,80,0.75)' },
  { label: 'Transparent', value: 'rgba(0,0,0,0)' },
];

const FONT_SIZE_OPTIONS = [
  { label: 'Small', value: 'small' },
  { label: 'Medium', value: 'medium' },
  { label: 'Large', value: 'large' },
];

const HEBREW_MODE_OPTIONS = [
  { label: 'Standard', value: 'regular' },
  { label: 'Nikud', value: 'nikud' },
  { label: 'Shoresh', value: 'shoresh' },
  { label: 'Heblish', value: 'heblish' },
  { label: 'Grammar Flip', value: 'grammar_flip' },
  { label: 'Slang', value: 'slang' },
];

export const SubtitleSettingsScreen: React.FC<{ navigation: any }> = ({ navigation }) => {
  const { t } = useTranslation();
  const [focusedItem, setFocusedItem] = useState<string | null>(null);
  const { settings, isLoading, error, loadSettings, updateSetting, updateDisplaySetting } =
    useSubtitleSettingsStore();

  useEffect(() => { loadSettings(); }, [loadSettings]);

  const langOptions = SUBTITLE_LANGUAGES.map((l) => ({ label: l.nativeName, value: l.code }));

  if (isLoading) {
    return (
      <View style={styles.container}>
        <TVHeader currentScreen="profile" navigation={navigation} />
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#A855F7" />
          <Text style={styles.loadingText}>{t('common.loading', 'Loading...')}</Text>
        </View>
      </View>
    );
  }

  if (error) {
    return (
      <View style={styles.container}>
        <TVHeader currentScreen="profile" navigation={navigation} />
        <View style={styles.errorContainer}>
          <Text style={styles.errorText}>{error}</Text>
          <Text style={styles.errorHint}>{t('common.retry', 'Please try again')}</Text>
        </View>
      </View>
    );
  }

  if (!settings) return null;

  return (
    <View style={styles.container}>
      <TVHeader currentScreen="profile" navigation={navigation} />
      <ScrollView style={styles.content} contentContainerStyle={styles.contentInner}>
        <Text style={styles.screenTitle}>{t('tvos.subtitles.title', 'Subtitle Settings')}</Text>

        <Text style={styles.sectionTitle}>{t('tvos.subtitles.general', 'General')}</Text>
        <View style={styles.section}>
          <SettingRow icon={Subtitles} label={t('tvos.subtitles.enabled', 'Enable Subtitles')}
            description={t('tvos.subtitles.enabledDesc', 'Show subtitles during playback')}
            type="toggle" value={settings.enabled}
            onChange={(val) => updateSetting('enabled', val)}
            isFocused={focusedItem === 'enabled'} onFocus={() => setFocusedItem('enabled')}
            hasTVPreferredFocus={true} />
          <SettingRow icon={Globe} label={t('tvos.subtitles.language', 'Subtitle Language')}
            description={t('tvos.subtitles.languageDesc', 'Default subtitle language')}
            type="select" value={settings.language || 'he'} options={langOptions}
            onChange={(val) => updateSetting('language', val)}
            isFocused={focusedItem === 'language'} onFocus={() => setFocusedItem('language')} />
          <SettingRow icon={Languages} label={t('tvos.subtitles.hebrewMode', 'Hebrew Display Mode')}
            description={t('tvos.subtitles.hebrewModeDesc', 'Special Hebrew subtitle modes')}
            type="select" value={settings.hebrew_mode} options={HEBREW_MODE_OPTIONS}
            onChange={(val) => updateSetting('hebrew_mode', val)}
            isFocused={focusedItem === 'hebrewMode'} onFocus={() => setFocusedItem('hebrewMode')} />
        </View>

        <Text style={styles.sectionTitle}>{t('tvos.subtitles.appearance', 'Appearance')}</Text>
        <View style={styles.section}>
          <SettingRow icon={Type} label={t('tvos.subtitles.fontSize', 'Font Size')}
            description={t('tvos.subtitles.fontSizeDesc', 'Subtitle text size')}
            type="select" value={settings.settings.fontSize} options={FONT_SIZE_OPTIONS}
            onChange={(val) => updateDisplaySetting('fontSize', val)}
            isFocused={focusedItem === 'fontSize'} onFocus={() => setFocusedItem('fontSize')} />
          <SettingRow icon={Palette} label={t('tvos.subtitles.textColor', 'Text Color')}
            description={t('tvos.subtitles.textColorDesc', 'Subtitle text color')}
            type="select" value={settings.settings.textColor} options={TEXT_COLOR_OPTIONS}
            onChange={(val) => updateDisplaySetting('textColor', val)}
            isFocused={focusedItem === 'textColor'} onFocus={() => setFocusedItem('textColor')} />
          <SettingRow icon={Palette} label={t('tvos.subtitles.bgColor', 'Background Color')}
            description={t('tvos.subtitles.bgColorDesc', 'Subtitle background color')}
            type="select" value={settings.settings.backgroundColor} options={BG_COLOR_OPTIONS}
            onChange={(val) => updateDisplaySetting('backgroundColor', val)}
            isFocused={focusedItem === 'bgColor'} onFocus={() => setFocusedItem('bgColor')} />
        </View>

        <Text style={styles.sectionTitle}>{t('tvos.subtitles.aiTranslation', 'AI Translation')}</Text>
        <View style={styles.section}>
          <SettingRow icon={Bot} label={t('tvos.subtitles.aiEnabled', 'AI Subtitle Translation')}
            description={t('tvos.subtitles.aiEnabledDesc', 'Auto-translate subtitles with AI')}
            type="toggle" value={settings.ai_translation_enabled}
            onChange={(val) => updateSetting('ai_translation_enabled', val)}
            isFocused={focusedItem === 'aiTranslation'} onFocus={() => setFocusedItem('aiTranslation')} />
          <SettingRow icon={Languages} label={t('tvos.subtitles.transLang', 'Translation Language')}
            description={t('tvos.subtitles.transLangDesc', 'Target language for AI translation')}
            type="select" value={settings.translation_language} options={langOptions}
            onChange={(val) => updateSetting('translation_language', val)}
            isFocused={focusedItem === 'transLang'} onFocus={() => setFocusedItem('transLang')} />
        </View>
      </ScrollView>
    </View>
  );
};
