/** TV Voice Settings - language selection, wake word toggle, TTS rate slider, avatar display */
import React, { useState } from 'react';
import { View, Text, Pressable, ScrollView } from 'react-native';
import { useTranslation } from 'react-i18next';
import { TVAvatarPreferences } from './TVAvatarPreferences';
import { styles } from './styles/TVVoiceSettings.styles';

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
      <Text style={styles.sectionTitle}>{t('voice.settings', 'Voice Settings')}</Text>

      {/* Language Selection */}
      <View style={styles.settingGroup}>
        <Text style={styles.settingLabel}>{t('voice.language', 'Language')}</Text>
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
                accessibilityLabel={`${lang.name} language`}
                accessibilityRole="button"
                accessibilityState={{ selected: isSelected }}
                accessibilityHint={`Select ${lang.name} as voice language`}
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
        <Text style={styles.settingLabel}>{t('voice.wake_word', 'Wake Word Detection')}</Text>
        <Pressable
          onPress={handleWakeWordToggle}
          onFocus={() => setFocusedSetting('wakeword')}
          onBlur={() => setFocusedSetting(null)}
          accessible
          accessibilityLabel={t('voice.wake_word', 'Wake Word Detection')}
          accessibilityRole="switch"
          accessibilityState={{ checked: wakeWordEnabled }}
          accessibilityHint={`Toggle wake word detection ${wakeWordEnabled ? 'off' : 'on'}`}
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
            accessibilityLabel={t('voice.decrease', 'Decrease speech rate')}
            accessibilityRole="button"
            accessibilityHint={`Decrease speech rate from ${ttsRate.toFixed(1)}x to ${Math.max(0.5, ttsRate - 0.1).toFixed(1)}x`}
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

          <View
            style={styles.rateDisplay}
            accessible
            accessibilityLabel={`Current speech rate ${ttsRate.toFixed(1)}x`}
            accessibilityRole="text"
          >
            <Text style={styles.rateValue}>{ttsRate.toFixed(1)}x</Text>
          </View>

          <Pressable
            onPress={handleTTSRateIncrease}
            onFocus={() => setFocusedSetting('rate-increase')}
            onBlur={() => setFocusedSetting(null)}
            accessible
            accessibilityLabel={t('voice.increase', 'Increase speech rate')}
            accessibilityRole="button"
            accessibilityHint={`Increase speech rate from ${ttsRate.toFixed(1)}x to ${Math.min(2.0, ttsRate + 0.1).toFixed(1)}x`}
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

      {/* Avatar Display Preferences */}
      <View style={styles.settingGroup}>
        <Text style={styles.settingLabel}>
          {t('voice.avatar_display', 'Avatar Display')}
        </Text>
        <TVAvatarPreferences />
      </View>
    </ScrollView>
  );
};

export default TVVoiceSettings;
