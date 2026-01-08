import { useEffect, useState } from 'react';
import { View, Text, StyleSheet, Pressable, ActivityIndicator } from 'react-native';
import { useTranslation } from 'react-i18next';
import { Mic, Eye, Type, Radio, ShieldCheck, Volume2, Zap } from 'lucide-react';
import { useVoiceSettingsStore, TextSize, VADSensitivity } from '@/stores/voiceSettingsStore';
import { colors, spacing, borderRadius } from '@bayit/shared/theme';
import { GlassView } from '@bayit/shared/ui';

const TEXT_SIZES: { value: TextSize; label: string }[] = [
  { value: 'small', label: 'Small' },
  { value: 'medium', label: 'Medium' },
  { value: 'large', label: 'Large' },
];

const VAD_SENSITIVITIES: { value: VADSensitivity; labelKey: string }[] = [
  { value: 'low', labelKey: 'sensitivityLow' },
  { value: 'medium', labelKey: 'sensitivityMedium' },
  { value: 'high', labelKey: 'sensitivityHigh' },
];

const WAKE_WORD_SENSITIVITIES = [
  { value: 0.5, labelKey: 'sensitivityLow' },
  { value: 0.7, labelKey: 'sensitivityMedium' },
  { value: 0.9, labelKey: 'sensitivityHigh' },
];

export default function VoiceSettings() {
  const { t, i18n } = useTranslation();
  const isRTL = i18n.language === 'he' || i18n.language === 'ar';
  const {
    preferences,
    loading,
    saving,
    loadPreferences,
    toggleSetting,
    setTextSize,
    setVADSensitivity,
    setWakeWordEnabled,
    setWakeWordSensitivity,
  } = useVoiceSettingsStore();
  const [testingWakeWord, setTestingWakeWord] = useState(false);

  useEffect(() => {
    loadPreferences();
  }, []);

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="small" color={colors.primary} />
      </View>
    );
  }

  const Toggle = ({
    value,
    onToggle,
    disabled,
  }: {
    value: boolean;
    onToggle: () => void;
    disabled?: boolean;
  }) => (
    <Pressable
      onPress={onToggle}
      disabled={disabled}
      style={[styles.toggle, value && styles.toggleActive, disabled && styles.toggleDisabled]}
    >
      <View style={[styles.toggleKnob, value && styles.toggleKnobActive]} />
    </Pressable>
  );

  const SettingRow = ({
    label,
    description,
    value,
    onToggle,
    disabled,
  }: {
    label: string;
    description: string;
    value: boolean;
    onToggle: () => void;
    disabled?: boolean;
  }) => (
    <Pressable
      onPress={onToggle}
      disabled={disabled}
      style={[styles.settingRow, isRTL && styles.settingRowRTL, disabled && styles.settingRowDisabled]}
    >
      <View style={styles.settingInfo}>
        <Text style={[styles.settingLabel, isRTL && styles.textRTL, disabled && styles.textDisabled]}>
          {label}
        </Text>
        <Text style={[styles.settingDesc, isRTL && styles.textRTL, disabled && styles.textDisabled]}>
          {description}
        </Text>
      </View>
      <Toggle value={value} onToggle={onToggle} disabled={disabled} />
    </Pressable>
  );

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={[styles.header, isRTL && styles.headerRTL]}>
        <View style={styles.headerIcon}>
          <Mic size={24} color="#06B6D4" />
        </View>
        <View style={styles.headerContent}>
          <Text style={[styles.headerTitle, isRTL && styles.textRTL]}>
            {t('profile.voice.title', 'Voice & Accessibility')}
          </Text>
          <Text style={[styles.headerSubtitle, isRTL && styles.textRTL]}>
            {t('profile.voice.description', 'Configure voice and accessibility features')}
          </Text>
        </View>
      </View>

      {/* Voice Search Settings */}
      <GlassView style={styles.section}>
        <Text style={[styles.sectionTitle, isRTL && styles.textRTL]}>
          {t('profile.voice.voiceSearch', 'Voice Search')}
        </Text>

        <SettingRow
          label={t('profile.voice.voiceSearchEnabled', 'Enable voice search')}
          description={t('profile.voice.voiceSearchEnabledDesc', 'Search for content using your voice')}
          value={preferences.voice_search_enabled}
          onToggle={() => toggleSetting('voice_search_enabled')}
        />
      </GlassView>

      {/* Constant Listening Settings (TV/tvOS) */}
      <GlassView style={styles.section}>
        <View style={[styles.sectionHeader, isRTL && styles.sectionHeaderRTL]}>
          <Radio size={16} color={colors.primary} />
          <Text style={[styles.sectionTitle, { marginBottom: 0 }]}>
            {t('profile.voice.constantListening', 'Always Listening Mode')}
          </Text>
        </View>

        <SettingRow
          label={t('profile.voice.constantListening', 'Always Listening Mode')}
          description={t('profile.voice.constantListeningDesc', 'Continuously listen for voice commands without pressing a button')}
          value={preferences.constant_listening_enabled}
          onToggle={() => toggleSetting('constant_listening_enabled')}
        />

        <SettingRow
          label={t('profile.voice.holdButtonMode', 'Hold Button to Talk')}
          description={t('profile.voice.holdButtonModeDesc', 'Press and hold the microphone button instead of always listening')}
          value={preferences.hold_button_mode}
          onToggle={() => toggleSetting('hold_button_mode')}
          disabled={!preferences.constant_listening_enabled}
        />

        {/* VAD Sensitivity Selection */}
        {preferences.constant_listening_enabled && !preferences.hold_button_mode && (
          <View style={styles.sensitivitySection}>
            <Text style={[styles.sensitivityLabel, isRTL && styles.textRTL]}>
              {t('profile.voice.sensitivity', 'Voice Detection Sensitivity')}
            </Text>
            <Text style={[styles.sensitivityDesc, isRTL && styles.textRTL]}>
              {t('profile.voice.sensitivityDesc', 'Adjust how responsive the voice detection is')}
            </Text>
            <View style={[styles.sensitivityOptions, isRTL && styles.sensitivityOptionsRTL]}>
              {VAD_SENSITIVITIES.map((sensitivity) => {
                const isSelected = preferences.vad_sensitivity === sensitivity.value;
                return (
                  <Pressable
                    key={sensitivity.value}
                    onPress={() => setVADSensitivity(sensitivity.value)}
                    style={({ hovered }: any) => [
                      styles.sensitivityOption,
                      isSelected && styles.sensitivityOptionSelected,
                      hovered && styles.sensitivityOptionHovered,
                    ]}
                  >
                    <Text
                      style={[
                        styles.sensitivityText,
                        isSelected && styles.sensitivityTextSelected,
                      ]}
                    >
                      {t(`profile.voice.${sensitivity.labelKey}`, sensitivity.labelKey)}
                    </Text>
                  </Pressable>
                );
              })}
            </View>
          </View>
        )}

        {/* Privacy Notice */}
        <View style={[styles.privacyNotice, isRTL && styles.privacyNoticeRTL]}>
          <ShieldCheck size={14} color={colors.success} />
          <Text style={[styles.privacyText, isRTL && styles.textRTL]}>
            {t('profile.voice.constantListeningPrivacy', 'Audio is only sent to servers when speech is detected')}
          </Text>
        </View>
      </GlassView>

      {/* Wake Word Settings */}
      <GlassView style={styles.section}>
        <View style={[styles.sectionHeader, isRTL && styles.sectionHeaderRTL]}>
          <Zap size={16} color={colors.warning} />
          <Text style={[styles.sectionTitle, { marginBottom: 0 }]}>
            {t('profile.voice.wakeWord', '"Hi Bayit" Wake Word')}
          </Text>
        </View>

        <SettingRow
          label={t('profile.voice.wakeWordEnabled', 'Enable "Hi Bayit" wake word')}
          description={t('profile.voice.wakeWordEnabledDesc', 'Say "Hi Bayit" to activate voice commands without pressing a button')}
          value={preferences.wake_word_enabled}
          onToggle={() => setWakeWordEnabled(!preferences.wake_word_enabled)}
          disabled={!preferences.constant_listening_enabled}
        />

        {/* Wake Word Sensitivity */}
        {preferences.constant_listening_enabled && preferences.wake_word_enabled && (
          <View style={styles.sensitivitySection}>
            <Text style={[styles.sensitivityLabel, isRTL && styles.textRTL]}>
              {t('profile.voice.wakeWordSensitivity', 'Wake Word Sensitivity')}
            </Text>
            <Text style={[styles.sensitivityDesc, isRTL && styles.textRTL]}>
              {t('profile.voice.wakeWordSensitivityDesc', 'Higher sensitivity detects the wake word more easily but may cause false triggers')}
            </Text>
            <View style={[styles.sensitivityOptions, isRTL && styles.sensitivityOptionsRTL]}>
              {WAKE_WORD_SENSITIVITIES.map((sensitivity) => {
                const isSelected = Math.abs(preferences.wake_word_sensitivity - sensitivity.value) < 0.1;
                return (
                  <Pressable
                    key={sensitivity.value}
                    onPress={() => setWakeWordSensitivity(sensitivity.value)}
                    style={({ hovered }: any) => [
                      styles.sensitivityOption,
                      isSelected && styles.sensitivityOptionSelected,
                      hovered && styles.sensitivityOptionHovered,
                    ]}
                  >
                    <Text
                      style={[
                        styles.sensitivityText,
                        isSelected && styles.sensitivityTextSelected,
                      ]}
                    >
                      {t(`profile.voice.${sensitivity.labelKey}`, sensitivity.labelKey)}
                    </Text>
                  </Pressable>
                );
              })}
            </View>
          </View>
        )}

        {/* Wake Word Privacy Notice */}
        <View style={[styles.privacyNotice, isRTL && styles.privacyNoticeRTL]}>
          <ShieldCheck size={14} color={colors.success} />
          <Text style={[styles.privacyText, isRTL && styles.textRTL]}>
            {t('profile.voice.wakeWordPrivacy', 'Wake word detection is processed locally on your device - no audio is sent until after "Hi Bayit" is detected')}
          </Text>
        </View>

        {/* Test Wake Word Button */}
        {preferences.constant_listening_enabled && preferences.wake_word_enabled && (
          <Pressable
            style={[styles.testButton, testingWakeWord && styles.testButtonActive]}
            onPress={() => {
              setTestingWakeWord(true);
              // Simulate testing - in real app this would trigger a test
              setTimeout(() => setTestingWakeWord(false), 3000);
            }}
            disabled={testingWakeWord}
          >
            <Volume2 size={16} color={testingWakeWord ? colors.primary : colors.text} />
            <Text style={[styles.testButtonText, testingWakeWord && styles.testButtonTextActive]}>
              {testingWakeWord
                ? t('profile.voice.testingWakeWord', 'Say "Hi Bayit"...')
                : t('profile.voice.testWakeWord', 'Test Wake Word')}
            </Text>
          </Pressable>
        )}
      </GlassView>

      {/* Accessibility Settings */}
      <GlassView style={styles.section}>
        <View style={[styles.sectionHeader, isRTL && styles.sectionHeaderRTL]}>
          <Eye size={16} color={colors.textMuted} />
          <Text style={[styles.sectionTitle, { marginBottom: 0 }]}>
            {t('profile.voice.accessibility', 'Accessibility')}
          </Text>
        </View>

        <SettingRow
          label={t('profile.voice.autoSubtitle', 'Auto-enable subtitles')}
          description={t('profile.voice.autoSubtitleDesc', 'Automatically show subtitles when playing content')}
          value={preferences.auto_subtitle}
          onToggle={() => toggleSetting('auto_subtitle')}
        />

        <SettingRow
          label={t('profile.voice.highContrast', 'High contrast mode')}
          description={t('profile.voice.highContrastDesc', 'Increase contrast for better visibility')}
          value={preferences.high_contrast_mode}
          onToggle={() => toggleSetting('high_contrast_mode')}
        />

        {/* Text Size Selection */}
        <View style={styles.textSizeSection}>
          <View style={[styles.textSizeHeader, isRTL && styles.textSizeHeaderRTL]}>
            <Type size={16} color={colors.textMuted} />
            <Text style={styles.textSizeLabel}>
              {t('profile.voice.textSize', 'Text size')}
            </Text>
          </View>
          <View style={[styles.textSizeOptions, isRTL && styles.textSizeOptionsRTL]}>
            {TEXT_SIZES.map((size) => {
              const isSelected = preferences.text_size === size.value;
              return (
                <Pressable
                  key={size.value}
                  onPress={() => setTextSize(size.value)}
                  style={({ hovered }: any) => [
                    styles.textSizeOption,
                    isSelected && styles.textSizeOptionSelected,
                    hovered && styles.textSizeOptionHovered,
                  ]}
                >
                  <Text
                    style={[
                      styles.textSizeText,
                      isSelected && styles.textSizeTextSelected,
                      size.value === 'small' && { fontSize: 12 },
                      size.value === 'medium' && { fontSize: 14 },
                      size.value === 'large' && { fontSize: 16 },
                    ]}
                  >
                    {t(`profile.voice.textSize${size.label}`, size.label)}
                  </Text>
                </Pressable>
              );
            })}
          </View>
        </View>
      </GlassView>

      {/* Saving indicator */}
      {saving && (
        <View style={styles.savingIndicator}>
          <ActivityIndicator size="small" color={colors.primary} />
          <Text style={styles.savingText}>{t('common.saving', 'Saving...')}</Text>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    gap: spacing.lg,
  },
  loadingContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    padding: spacing.xl,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    marginBottom: spacing.sm,
  },
  headerRTL: {
    flexDirection: 'row-reverse',
  },
  headerIcon: {
    width: 48,
    height: 48,
    borderRadius: borderRadius.md,
    backgroundColor: 'rgba(6, 182, 212, 0.2)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerContent: {
    flex: 1,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: colors.text,
  },
  headerSubtitle: {
    fontSize: 14,
    color: colors.textMuted,
    marginTop: 2,
  },
  section: {
    padding: spacing.lg,
    gap: spacing.md,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    marginBottom: spacing.xs,
  },
  sectionHeaderRTL: {
    flexDirection: 'row-reverse',
  },
  sectionTitle: {
    fontSize: 13,
    fontWeight: '600',
    color: colors.textMuted,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: spacing.xs,
  },
  settingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: spacing.sm,
    gap: spacing.md,
  },
  settingRowRTL: {
    flexDirection: 'row-reverse',
  },
  settingRowDisabled: {
    opacity: 0.5,
  },
  settingInfo: {
    flex: 1,
  },
  settingLabel: {
    fontSize: 15,
    fontWeight: '500',
    color: colors.text,
  },
  settingDesc: {
    fontSize: 13,
    color: colors.textMuted,
    marginTop: 2,
    lineHeight: 18,
  },
  textRTL: {
    textAlign: 'right',
  },
  textDisabled: {
    color: colors.textMuted,
  },
  toggle: {
    width: 52,
    height: 28,
    borderRadius: 14,
    backgroundColor: colors.backgroundLighter,
    padding: 2,
    flexDirection: 'row',
    alignItems: 'center',
  },
  toggleActive: {
    backgroundColor: colors.primary,
    justifyContent: 'flex-end',
  },
  toggleDisabled: {
    opacity: 0.5,
  },
  toggleKnob: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: colors.text,
  },
  toggleKnobActive: {},
  textSizeSection: {
    paddingTop: spacing.sm,
  },
  textSizeHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    marginBottom: spacing.sm,
  },
  textSizeHeaderRTL: {
    flexDirection: 'row-reverse',
  },
  textSizeLabel: {
    fontSize: 14,
    fontWeight: '500',
    color: colors.text,
  },
  textSizeOptions: {
    flexDirection: 'row',
    gap: spacing.sm,
  },
  textSizeOptionsRTL: {
    flexDirection: 'row-reverse',
  },
  textSizeOption: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: spacing.md,
    borderRadius: borderRadius.md,
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
  },
  textSizeOptionSelected: {
    backgroundColor: 'rgba(0, 217, 255, 0.15)',
    borderWidth: 1,
    borderColor: 'rgba(0, 217, 255, 0.4)',
  },
  textSizeOptionHovered: {
    backgroundColor: 'rgba(255, 255, 255, 0.08)',
  },
  textSizeText: {
    color: colors.text,
  },
  textSizeTextSelected: {
    color: colors.primary,
    fontWeight: '500',
  },
  savingIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
    padding: spacing.md,
  },
  savingText: {
    fontSize: 14,
    color: colors.textMuted,
  },
  sensitivitySection: {
    paddingTop: spacing.sm,
    borderTopWidth: 1,
    borderTopColor: 'rgba(255, 255, 255, 0.05)',
    marginTop: spacing.sm,
  },
  sensitivityLabel: {
    fontSize: 14,
    fontWeight: '500',
    color: colors.text,
    marginBottom: 4,
  },
  sensitivityDesc: {
    fontSize: 13,
    color: colors.textMuted,
    marginBottom: spacing.md,
  },
  sensitivityOptions: {
    flexDirection: 'row',
    gap: spacing.sm,
  },
  sensitivityOptionsRTL: {
    flexDirection: 'row-reverse',
  },
  sensitivityOption: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: spacing.md,
    borderRadius: borderRadius.md,
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
  },
  sensitivityOptionSelected: {
    backgroundColor: 'rgba(0, 217, 255, 0.15)',
    borderWidth: 1,
    borderColor: 'rgba(0, 217, 255, 0.4)',
  },
  sensitivityOptionHovered: {
    backgroundColor: 'rgba(255, 255, 255, 0.08)',
  },
  sensitivityText: {
    fontSize: 13,
    color: colors.text,
  },
  sensitivityTextSelected: {
    color: colors.primary,
    fontWeight: '500',
  },
  privacyNotice: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    paddingTop: spacing.md,
    borderTopWidth: 1,
    borderTopColor: 'rgba(255, 255, 255, 0.05)',
    marginTop: spacing.sm,
  },
  privacyNoticeRTL: {
    flexDirection: 'row-reverse',
  },
  privacyText: {
    fontSize: 12,
    color: colors.textMuted,
    flex: 1,
  },
  testButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.lg,
    borderRadius: borderRadius.md,
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    marginTop: spacing.md,
  },
  testButtonActive: {
    backgroundColor: 'rgba(0, 217, 255, 0.15)',
    borderWidth: 1,
    borderColor: 'rgba(0, 217, 255, 0.4)',
  },
  testButtonText: {
    fontSize: 14,
    fontWeight: '500',
    color: colors.text,
  },
  testButtonTextActive: {
    color: colors.primary,
  },
});
