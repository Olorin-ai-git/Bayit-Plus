/**
 * TV Voice Settings Component
 * Grid-based settings: language selection, wake word toggle, TTS rate slider
 */

import React, { useState } from 'react';
import { View, Text, Pressable, ScrollView, StyleSheet } from 'react-native';
import { useTranslation } from 'react-i18next';
import { voiceComponentStyles } from './voiceStyles';

interface TVVoiceSettingsProps {
  language: string;
  wakeWordEnabled: boolean;
  ttsRate: number;
  onLanguageChange?: (lang: string) => void;
  onWakeWordToggle?: (enabled: boolean) => void;
  onTTSRateChange?: (rate: number) => void;
}

export const TVVoiceSettings: React.FC<TVVoiceSettingsProps> = ({
  language,
  wakeWordEnabled,
  ttsRate,
  onLanguageChange,
  onWakeWordToggle,
  onTTSRateChange,
}) => {
  const { t, i18n } = useTranslation();
  const [focusedSetting, setFocusedSetting] = useState<string | null>(null);

  const languages = [{ code: 'he', name: 'עברית' }, { code: 'en', name: 'English' }, { code: 'es', name: 'Español' }, { code: 'fr', name: 'Français' }];

  const handleWakeWordToggle = () => {
    onWakeWordToggle?.(!wakeWordEnabled);
  };

  const handleTTSRateDecrease = () => {
    const newRate = Math.max(0.5, ttsRate - 0.1);
    onTTSRateChange?.(parseFloat(newRate.toFixed(1)));
  };

  const handleTTSRateIncrease = () => {
    const newRate = Math.min(2.0, ttsRate + 0.1);
    onTTSRateChange?.(parseFloat(newRate.toFixed(1)));
  };

  return (
    <ScrollView style={styles.container}>
      <Text style={styles.sectionTitle}>
        {t('voice.settings', 'Voice Settings')}
      </Text>

      {/* Language Selection */}
      <View style={styles.settingGroup}>
        <Text style={styles.settingLabel}>
          {t('voice.language', 'Language')}
        </Text>
        <View style={styles.languageGrid}>
          {languages.map((lang) => {
            const isSelected = language === lang.code;
            const isFocused = focusedSetting === `lang-${lang.code}`;

            return (
              <Pressable
                key={lang.code}
                onPress={() => onLanguageChange?.(lang.code)}
                onFocus={() => setFocusedSetting(`lang-${lang.code}`)}
                onBlur={() => setFocusedSetting(null)}
                accessible
                accessibilityLabel={lang.name}
                style={[
                  styles.languageButton,
                  {
                    backgroundColor: isSelected
                      ? 'rgba(168, 85, 247, 0.5)'
                      : isFocused
                      ? 'rgba(168, 85, 247, 0.3)'
                      : 'rgba(0, 0, 0, 0.2)',
                    borderColor: isFocused ? '#A855F7' : isSelected ? '#A855F7' : 'transparent',
                    transform: [{ scale: isFocused ? 1.05 : 1 }],
                  },
                ]}
              >
                <Text style={[styles.languageButtonText, { fontWeight: isSelected ? '700' : '600' }]}>
                  {lang.name}
                </Text>
              </Pressable>
            );
          })}
        </View>
      </View>

      {/* Wake Word Toggle */}
      <View style={styles.settingGroup}>
        <Text style={styles.settingLabel}>
          {t('voice.wake_word', 'Wake Word Detection')}
        </Text>
        <Pressable
          onPress={handleWakeWordToggle}
          onFocus={() => setFocusedSetting('wakeword')}
          onBlur={() => setFocusedSetting(null)}
          accessible
          accessibilityLabel={t('voice.wake_word', 'Wake Word Detection')}
          accessibilityState={{ checked: wakeWordEnabled }}
          style={[
            styles.toggleButton,
            {
              backgroundColor: wakeWordEnabled
                ? 'rgba(16, 185, 129, 0.3)'
                : 'rgba(0, 0, 0, 0.2)',
              borderColor: focusedSetting === 'wakeword'
                ? '#A855F7'
                : wakeWordEnabled
                ? '#10B981'
                : 'transparent',
              transform: [{ scale: focusedSetting === 'wakeword' ? 1.05 : 1 }],
            },
          ]}
        >
          <Text style={[styles.toggleIcon, { fontSize: 36 }]}>
            {wakeWordEnabled ? '✓' : '○'}
          </Text>
          <Text style={styles.toggleLabel}>
            {wakeWordEnabled
              ? t('voice.enabled', 'Enabled')
              : t('voice.disabled', 'Disabled')}
          </Text>
        </Pressable>
      </View>

      {/* TTS Rate Control */}
      <View style={styles.settingGroup}>
        <Text style={styles.settingLabel}>
          {t('voice.tts_rate', 'Speech Rate')} ({ttsRate.toFixed(1)}x)
        </Text>
        <View style={styles.rateControlContainer}>
          <Pressable
            onPress={handleTTSRateDecrease}
            onFocus={() => setFocusedSetting('rate-decrease')}
            onBlur={() => setFocusedSetting(null)}
            accessible
            accessibilityLabel={t('voice.decrease', 'Decrease')}
            style={[
              styles.rateButton,
              {
                borderColor: focusedSetting === 'rate-decrease' ? '#A855F7' : 'transparent',
                transform: [{ scale: focusedSetting === 'rate-decrease' ? 1.05 : 1 }],
              },
            ]}
          >
            <Text style={styles.rateButtonText}>−</Text>
          </Pressable>

          <View style={styles.rateDisplay}>
            <Text style={styles.rateValue}>{ttsRate.toFixed(1)}x</Text>
          </View>

          <Pressable
            onPress={handleTTSRateIncrease}
            onFocus={() => setFocusedSetting('rate-increase')}
            onBlur={() => setFocusedSetting(null)}
            accessible
            accessibilityLabel={t('voice.increase', 'Increase')}
            style={[
              styles.rateButton,
              {
                borderColor: focusedSetting === 'rate-increase' ? '#A855F7' : 'transparent',
                transform: [{ scale: focusedSetting === 'rate-increase' ? 1.05 : 1 }],
              },
            ]}
          >
            <Text style={styles.rateButtonText}>+</Text>
          </Pressable>
        </View>
      </View>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, paddingHorizontal: 60, paddingVertical: 40, backgroundColor: '#000000' },
  sectionTitle: { fontSize: 48, fontWeight: '700', color: '#FFFFFF', marginBottom: 40 },
  settingGroup: { marginBottom: 48 },
  settingLabel: { fontSize: 28, fontWeight: '600', color: '#A855F7', marginBottom: 16 },
  languageGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 12 },
  languageButton: { paddingHorizontal: 24, paddingVertical: 16, borderRadius: 12, borderWidth: 4, minHeight: 80, minWidth: 140, justifyContent: 'center', alignItems: 'center' },
  languageButtonText: { fontSize: 24, color: '#FFFFFF', textAlign: 'center' },
  toggleButton: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 32, paddingVertical: 20, borderRadius: 12, borderWidth: 4, minHeight: 100, gap: 20 },
  toggleIcon: { color: '#FFFFFF' },
  toggleLabel: { fontSize: 28, fontWeight: '600', color: '#FFFFFF' },
  rateControlContainer: { flexDirection: 'row', alignItems: 'center', gap: 20 },
  rateButton: { width: 100, height: 100, borderRadius: 12, borderWidth: 4, backgroundColor: 'rgba(168, 85, 247, 0.2)', justifyContent: 'center', alignItems: 'center' },
  rateButtonText: { fontSize: 40, fontWeight: '700', color: '#A855F7' },
  rateDisplay: { flex: 1, alignItems: 'center', paddingVertical: 20 },
  rateValue: { fontSize: 32, fontWeight: '700', color: '#A855F7' },
});

export default TVVoiceSettings;
