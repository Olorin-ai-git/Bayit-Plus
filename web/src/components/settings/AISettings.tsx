import { useEffect } from 'react';
import { View, Text, Pressable, ActivityIndicator, StyleSheet } from 'react-native';
import { useTranslation } from 'react-i18next';
import { Sparkles, Shield } from 'lucide-react';
import { useAISettingsStore } from '@/stores/aiSettingsStore';
import { colors, spacing, borderRadius } from '@bayit/shared/theme';
import { GlassView } from '@bayit/shared/ui';

export default function AISettings() {
  const { t, i18n } = useTranslation();
  const isRTL = i18n.language === 'he' || i18n.language === 'ar';
  const {
    preferences,
    loading,
    saving,
    loadPreferences,
    toggleSetting,
  } = useAISettingsStore();

  useEffect(() => {
    loadPreferences();
  }, []);

  if (loading) {
    return (
      <View className="items-center justify-center p-8">
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
      style={[
        styles.toggleBase,
        value ? styles.toggleActive : styles.toggleInactive,
        disabled && styles.toggleDisabled,
      ]}
    >
      <View className="w-6 h-6 rounded-full bg-white" />
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
      style={[
        styles.settingRow,
        isRTL && styles.settingRowRTL,
        disabled && styles.settingRowDisabled,
      ]}
    >
      <View className="flex-1">
        <Text
          style={[
            styles.settingLabel,
            isRTL && styles.textRight,
            disabled && styles.textDisabled,
          ]}
        >
          {label}
        </Text>
        <Text
          style={[
            styles.settingDescription,
            isRTL && styles.textRight,
            disabled && styles.textDisabledSecondary,
          ]}
        >
          {description}
        </Text>
      </View>
      <Toggle value={value} onToggle={onToggle} disabled={disabled} />
    </Pressable>
  );

  return (
    <View className="gap-4">
      {/* Header */}
      <View style={[styles.header, isRTL && styles.headerRTL]}>
        <View className="w-12 h-12 rounded-md bg-purple-500/20 justify-center items-center">
          <Sparkles size={24} color="#A855F7" />
        </View>
        <View className="flex-1">
          <Text style={[styles.headerTitle, isRTL && styles.textRight]}>
            {t('profile.ai.title', 'AI & Personalization')}
          </Text>
          <Text style={[styles.headerSubtitle, isRTL && styles.textRight]}>
            {t('profile.ai.description', 'Configure AI-powered features')}
          </Text>
        </View>
      </View>

      {/* Chatbot Settings */}
      <GlassView className="p-4 gap-4">
        <Text style={[styles.sectionTitle, isRTL && styles.textRight]}>
          {t('profile.ai.chatbot', 'AI Assistant')}
        </Text>

        <SettingRow
          label={t('profile.ai.chatbotEnabled', 'Enable AI Assistant')}
          description={t('profile.ai.chatbotEnabledDesc', 'Get help navigating content and personalized recommendations')}
          value={preferences.chatbot_enabled}
          onToggle={() => toggleSetting('chatbot_enabled')}
        />

        <SettingRow
          label={t('profile.ai.saveHistory', 'Save conversation history')}
          description={t('profile.ai.saveHistoryDesc', 'Remember previous conversations for better context')}
          value={preferences.save_conversation_history}
          onToggle={() => toggleSetting('save_conversation_history')}
          disabled={!preferences.chatbot_enabled}
        />
      </GlassView>

      {/* Recommendations */}
      <GlassView className="p-4 gap-4">
        <Text style={[styles.sectionTitle, isRTL && styles.textRight]}>
          {t('profile.ai.recommendations', 'Recommendations')}
        </Text>

        <SettingRow
          label={t('profile.ai.personalizedRecs', 'Personalized recommendations')}
          description={t('profile.ai.personalizedRecsDesc', 'Get content suggestions based on your viewing history')}
          value={preferences.personalized_recommendations}
          onToggle={() => toggleSetting('personalized_recommendations')}
        />
      </GlassView>

      {/* Privacy */}
      <GlassView className="p-4 gap-4">
        <Text style={[styles.sectionTitle, isRTL && styles.textRight]}>
          {t('profile.ai.privacy', 'Privacy & Data')}
        </Text>

        <SettingRow
          label={t('profile.ai.dataConsent', 'Allow data collection for improvements')}
          description={t('profile.ai.dataConsentDesc', 'Help improve AI features by sharing anonymous usage data')}
          value={preferences.data_collection_consent}
          onToggle={() => toggleSetting('data_collection_consent')}
        />

        <View style={[styles.privacyNote, isRTL && styles.privacyNoteRTL]}>
          <Shield size={16} color={colors.success} />
          <Text className="text-[13px] text-green-500">
            {t('profile.ai.privacyNote', 'Your data is encrypted and secure')}
          </Text>
        </View>
      </GlassView>

      {/* Saving indicator */}
      {saving && (
        <View className="flex-row items-center justify-center gap-2 p-4">
          <ActivityIndicator size="small" color={colors.primary} />
          <Text className="text-[14px] text-gray-400">{t('common.saving', 'Saving...')}</Text>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  // Toggle styles
  toggleBase: {
    width: 52,
    height: 28,
    borderRadius: 9999,
    padding: 2,
    flexDirection: 'row',
    alignItems: 'center',
  },
  toggleActive: {
    backgroundColor: colors.primary,
    justifyContent: 'flex-end',
  },
  toggleInactive: {
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
  },
  toggleDisabled: {
    opacity: 0.5,
  },

  // SettingRow styles
  settingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 8,
    gap: 16,
  },
  settingRowRTL: {
    flexDirection: 'row-reverse',
  },
  settingRowDisabled: {
    opacity: 0.5,
  },

  // Text styles
  settingLabel: {
    fontSize: 15,
    fontWeight: '500',
    color: '#FFFFFF',
  },
  settingDescription: {
    fontSize: 13,
    color: '#9CA3AF',
    marginTop: 2,
    lineHeight: 18,
  },
  textRight: {
    textAlign: 'right',
  },
  textDisabled: {
    color: '#9CA3AF',
  },
  textDisabledSecondary: {
    color: '#6B7280',
  },

  // Header styles
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
    marginBottom: 8,
  },
  headerRTL: {
    flexDirection: 'row-reverse',
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#FFFFFF',
  },
  headerSubtitle: {
    fontSize: 14,
    color: '#9CA3AF',
    marginTop: 2,
  },

  // Section title
  sectionTitle: {
    fontSize: 13,
    fontWeight: '600',
    color: '#9CA3AF',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 4,
  },

  // Privacy note
  privacyNote: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingVertical: 8,
    paddingHorizontal: 16,
    backgroundColor: 'rgba(34, 197, 94, 0.1)',
    borderRadius: 6,
    marginTop: 8,
  },
  privacyNoteRTL: {
    flexDirection: 'row-reverse',
  },
});
