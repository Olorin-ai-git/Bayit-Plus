import { useEffect } from 'react';
import { View, Text, Pressable, ActivityIndicator } from 'react-native';
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
      className={`w-13 h-7 rounded-full p-0.5 flex-row items-center ${
        value ? 'bg-primary justify-end' : 'bg-white/10'
      } ${disabled ? 'opacity-50' : ''}`}
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
      className={`flex-row items-center justify-between py-2 gap-4 ${
        isRTL ? 'flex-row-reverse' : ''
      } ${disabled ? 'opacity-50' : ''}`}
    >
      <View className="flex-1">
        <Text className={`text-[15px] font-medium text-white ${isRTL ? 'text-right' : ''} ${disabled ? 'text-gray-400' : ''}`}>
          {label}
        </Text>
        <Text className={`text-[13px] text-gray-400 mt-0.5 leading-[18px] ${isRTL ? 'text-right' : ''} ${disabled ? 'text-gray-500' : ''}`}>
          {description}
        </Text>
      </View>
      <Toggle value={value} onToggle={onToggle} disabled={disabled} />
    </Pressable>
  );

  return (
    <View className="gap-4">
      {/* Header */}
      <View className={`flex-row items-center gap-4 mb-2 ${isRTL ? 'flex-row-reverse' : ''}`}>
        <View className="w-12 h-12 rounded-md bg-purple-500/20 justify-center items-center">
          <Sparkles size={24} color="#A855F7" />
        </View>
        <View className="flex-1">
          <Text className={`text-[20px] font-bold text-white ${isRTL ? 'text-right' : ''}`}>
            {t('profile.ai.title', 'AI & Personalization')}
          </Text>
          <Text className={`text-[14px] text-gray-400 mt-0.5 ${isRTL ? 'text-right' : ''}`}>
            {t('profile.ai.description', 'Configure AI-powered features')}
          </Text>
        </View>
      </View>

      {/* Chatbot Settings */}
      <GlassView className="p-4 gap-4">
        <Text className={`text-[13px] font-semibold text-gray-400 uppercase tracking-wide mb-1 ${isRTL ? 'text-right' : ''}`}>
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
        <Text className={`text-[13px] font-semibold text-gray-400 uppercase tracking-wide mb-1 ${isRTL ? 'text-right' : ''}`}>
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
        <Text className={`text-[13px] font-semibold text-gray-400 uppercase tracking-wide mb-1 ${isRTL ? 'text-right' : ''}`}>
          {t('profile.ai.privacy', 'Privacy & Data')}
        </Text>

        <SettingRow
          label={t('profile.ai.dataConsent', 'Allow data collection for improvements')}
          description={t('profile.ai.dataConsentDesc', 'Help improve AI features by sharing anonymous usage data')}
          value={preferences.data_collection_consent}
          onToggle={() => toggleSetting('data_collection_consent')}
        />

        <View className={`flex-row items-center gap-2 py-2 px-4 bg-green-500/10 rounded-md mt-2 ${isRTL ? 'flex-row-reverse' : ''}`}>
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
