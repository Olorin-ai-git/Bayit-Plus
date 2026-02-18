/**
 * AccessibilitySettingsScreen - Accessibility preferences for tvOS
 *
 * Features:
 * - Visual: high contrast, reduce motion, color blind mode, large/bold text
 * - Audio: audio descriptions, mono audio, closed captions
 * - Navigation: VoiceOver hints, focus indicator size
 */

import React, { useEffect, useState } from 'react';
import { View, Text, ScrollView, ActivityIndicator } from 'react-native';
import { useTranslation } from 'react-i18next';
import {
  Eye, Ear, Hand, Contrast, ZapOff,
  Type, Bold, Captions, Volume2, Focus,
} from 'lucide-react-native';
import { TVHeader } from '../components/TVHeader';
import { SettingRow } from '../components/profile/SettingRow';
import { useAccessibilitySettingsStore } from '../stores/accessibilitySettingsStore';
import { settingsSharedStyles as styles } from './styles/settingsShared.styles';

const COLOR_BLIND_OPTIONS = [
  { label: 'None', value: 'none' },
  { label: 'Protanopia (Red)', value: 'protanopia' },
  { label: 'Deuteranopia (Green)', value: 'deuteranopia' },
  { label: 'Tritanopia (Blue)', value: 'tritanopia' },
];

const FOCUS_SIZE_OPTIONS = [
  { label: 'Standard', value: 'standard' },
  { label: 'Large', value: 'large' },
];

export const AccessibilitySettingsScreen: React.FC<{ navigation: any }> = ({ navigation }) => {
  const { t } = useTranslation();
  const [focusedItem, setFocusedItem] = useState<string | null>(null);
  const { settings, isLoading, error, loadSettings, updateSetting } =
    useAccessibilitySettingsStore();

  useEffect(() => { loadSettings(); }, [loadSettings]);

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
        <Text style={styles.screenTitle}>{t('tvos.accessibility.title', 'Accessibility')}</Text>

        <Text style={styles.sectionTitle}>{t('tvos.accessibility.visual', 'Visual')}</Text>
        <View style={styles.section}>
          <SettingRow icon={Contrast} label={t('tvos.accessibility.highContrast', 'High Contrast')}
            description={t('tvos.accessibility.highContrastDesc', 'Increase color contrast for visibility')}
            type="toggle" value={settings.highContrast}
            onChange={(val) => updateSetting('highContrast', val)}
            isFocused={focusedItem === 'highContrast'} onFocus={() => setFocusedItem('highContrast')}
            hasTVPreferredFocus={true} />
          <SettingRow icon={ZapOff} label={t('tvos.accessibility.reduceMotion', 'Reduce Motion')}
            description={t('tvos.accessibility.reduceMotionDesc', 'Minimize animations and transitions')}
            type="toggle" value={settings.reduceMotion}
            onChange={(val) => updateSetting('reduceMotion', val)}
            isFocused={focusedItem === 'reduceMotion'} onFocus={() => setFocusedItem('reduceMotion')} />
          <SettingRow icon={Type} label={t('tvos.accessibility.largeText', 'Large Text')}
            description={t('tvos.accessibility.largeTextDesc', 'Increase text size throughout the app')}
            type="toggle" value={settings.largeText}
            onChange={(val) => updateSetting('largeText', val)}
            isFocused={focusedItem === 'largeText'} onFocus={() => setFocusedItem('largeText')} />
          <SettingRow icon={Bold} label={t('tvos.accessibility.boldText', 'Bold Text')}
            description={t('tvos.accessibility.boldTextDesc', 'Use bold text for improved readability')}
            type="toggle" value={settings.boldText}
            onChange={(val) => updateSetting('boldText', val)}
            isFocused={focusedItem === 'boldText'} onFocus={() => setFocusedItem('boldText')} />
          <SettingRow icon={Eye} label={t('tvos.accessibility.colorBlind', 'Color Blind Mode')}
            description={t('tvos.accessibility.colorBlindDesc', 'Adjust colors for color vision deficiency')}
            type="select" value={settings.colorBlindMode} options={COLOR_BLIND_OPTIONS}
            onChange={(val) => updateSetting('colorBlindMode', val)}
            isFocused={focusedItem === 'colorBlind'} onFocus={() => setFocusedItem('colorBlind')} />
        </View>

        <Text style={styles.sectionTitle}>{t('tvos.accessibility.audio', 'Audio')}</Text>
        <View style={styles.section}>
          <SettingRow icon={Ear} label={t('tvos.accessibility.audioDesc', 'Audio Descriptions')}
            description={t('tvos.accessibility.audioDescDesc', 'Narrated descriptions of on-screen actions')}
            type="toggle" value={settings.audioDescriptions}
            onChange={(val) => updateSetting('audioDescriptions', val)}
            isFocused={focusedItem === 'audioDesc'} onFocus={() => setFocusedItem('audioDesc')} />
          <SettingRow icon={Captions} label={t('tvos.accessibility.closedCaptions', 'Closed Captions')}
            description={t('tvos.accessibility.closedCaptionsDesc', 'Show captions for hearing accessibility')}
            type="toggle" value={settings.closedCaptions}
            onChange={(val) => updateSetting('closedCaptions', val)}
            isFocused={focusedItem === 'closedCaptions'} onFocus={() => setFocusedItem('closedCaptions')} />
          <SettingRow icon={Volume2} label={t('tvos.accessibility.monoAudio', 'Mono Audio')}
            description={t('tvos.accessibility.monoAudioDesc', 'Combine stereo channels into one')}
            type="toggle" value={settings.monoAudio}
            onChange={(val) => updateSetting('monoAudio', val)}
            isFocused={focusedItem === 'monoAudio'} onFocus={() => setFocusedItem('monoAudio')} />
        </View>

        <Text style={styles.sectionTitle}>{t('tvos.accessibility.navigation', 'Navigation')}</Text>
        <View style={styles.section}>
          <SettingRow icon={Hand} label={t('tvos.accessibility.voiceOverHints', 'VoiceOver Hints')}
            description={t('tvos.accessibility.voiceOverDesc', 'Provide additional hints for VoiceOver')}
            type="toggle" value={settings.voiceOverHints}
            onChange={(val) => updateSetting('voiceOverHints', val)}
            isFocused={focusedItem === 'voiceOver'} onFocus={() => setFocusedItem('voiceOver')} />
          <SettingRow icon={Focus} label={t('tvos.accessibility.focusSize', 'Focus Indicator Size')}
            description={t('tvos.accessibility.focusSizeDesc', 'Size of the focus highlight ring')}
            type="select" value={settings.focusIndicatorSize} options={FOCUS_SIZE_OPTIONS}
            onChange={(val) => updateSetting('focusIndicatorSize', val)}
            isFocused={focusedItem === 'focusSize'} onFocus={() => setFocusedItem('focusSize')} />
        </View>
      </ScrollView>
    </View>
  );
};
