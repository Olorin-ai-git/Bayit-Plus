import { View, Text } from 'react-native';
import { useTranslation } from 'react-i18next';
import {
  MessageSquare,
  Clock,
  Sparkles,
  Mic,
  Volume2,
  Bell,
  Shield,
  Brain,
} from 'lucide-react';
import { GlassView } from '@bayit/shared/ui';
import { useAISettingsStore } from '@/stores/aiSettingsStore';
import { useVoiceSettingsStore } from '@/stores/voiceSettingsStore';
import { SettingRow } from '../components/SettingRow';

interface AIVoiceTabProps {
  isRTL: boolean;
}

export function AIVoiceTab({ isRTL }: AIVoiceTabProps) {
  const { t } = useTranslation();

  const {
    preferences: aiPreferences,
    loading: aiLoading,
    toggleSetting: toggleAISetting,
  } = useAISettingsStore();

  const {
    preferences: voicePreferences,
    loading: voiceLoading,
    toggleSetting: toggleVoiceSetting,
  } = useVoiceSettingsStore();

  return (
    <View className="gap-6">
      <GlassView className="p-6 gap-4">
        <View className={`items-center gap-4 mb-2 ${isRTL ? 'flex-row-reverse' : 'flex-row'}`}>
          {isRTL ? (
            <>
              <View className="flex-1">
                <Text className="text-[13px] font-semibold text-white/60 uppercase tracking-wide text-right">
                  {t('profile.ai.assistant', 'AI Assistant')}
                </Text>
                <Text className="text-[13px] text-white/60 mt-0.5 text-right">
                  {t('profile.ai.assistantDesc', 'Personalized recommendations and help')}
                </Text>
              </View>
              <View className="w-12 h-12 rounded-lg bg-[#8B5CF6]/15 justify-center items-center">
                <Brain size={24} color="#8B5CF6" />
              </View>
            </>
          ) : (
            <>
              <View className="w-12 h-12 rounded-lg bg-[#8B5CF6]/15 justify-center items-center">
                <Brain size={24} color="#8B5CF6" />
              </View>
              <View className="flex-1">
                <Text className="text-[13px] font-semibold text-white/60 uppercase tracking-wide text-left">
                  {t('profile.ai.assistant', 'AI Assistant')}
                </Text>
                <Text className="text-[13px] text-white/60 mt-0.5 text-left">
                  {t('profile.ai.assistantDesc', 'Personalized recommendations and help')}
                </Text>
              </View>
            </>
          )}
        </View>

        <SettingRow
          icon={MessageSquare}
          iconColor="#6B21A8"
          label={t('profile.ai.chatbotEnabled', 'Enable AI Assistant')}
          description={t('profile.ai.chatbotEnabledDesc', 'Get help navigating content')}
          value={aiPreferences.chatbot_enabled}
          onToggle={() => toggleAISetting('chatbot_enabled')}
          disabled={aiLoading}
          isRTL={isRTL}
        />
        <SettingRow
          icon={Clock}
          iconColor="#8B5CF6"
          label={t('profile.ai.saveHistory', 'Save Conversation History')}
          description={t('profile.ai.saveHistoryDesc', 'Remember previous conversations')}
          value={aiPreferences.save_conversation_history}
          onToggle={() => toggleAISetting('save_conversation_history')}
          disabled={aiLoading || !aiPreferences.chatbot_enabled}
          isRTL={isRTL}
        />
        <SettingRow
          icon={Sparkles}
          iconColor="#F59E0B"
          label={t('profile.ai.personalizedRecs', 'Personalized Recommendations')}
          description={t('profile.ai.personalizedRecsDesc', 'Content suggestions based on history')}
          value={aiPreferences.personalized_recommendations}
          onToggle={() => toggleAISetting('personalized_recommendations')}
          disabled={aiLoading}
          isRTL={isRTL}
        />
      </GlassView>

      <GlassView className="p-6 gap-4">
        <View className={`items-center gap-4 mb-2 ${isRTL ? 'flex-row-reverse' : 'flex-row'}`}>
          {isRTL ? (
            <>
              <View className="flex-1">
                <Text className="text-[13px] font-semibold text-white/60 uppercase tracking-wide text-right">
                  {t('profile.voice.title', 'Voice Control')}
                </Text>
                <Text className="text-[13px] text-white/60 mt-0.5 text-right">
                  {t('profile.voice.description', 'Hands-free navigation')}
                </Text>
              </View>
              <View className="w-12 h-12 rounded-lg bg-[#6B21A8]/30 justify-center items-center">
                <Mic size={24} color="#6B21A8" />
              </View>
            </>
          ) : (
            <>
              <View className="w-12 h-12 rounded-lg bg-[#6B21A8]/30 justify-center items-center">
                <Mic size={24} color="#6B21A8" />
              </View>
              <View className="flex-1">
                <Text className="text-[13px] font-semibold text-white/60 uppercase tracking-wide text-left">
                  {t('profile.voice.title', 'Voice Control')}
                </Text>
                <Text className="text-[13px] text-white/60 mt-0.5 text-left">
                  {t('profile.voice.description', 'Hands-free navigation')}
                </Text>
              </View>
            </>
          )}
        </View>

        <SettingRow
          icon={Mic}
          iconColor="#6B21A8"
          label={t('profile.voice.enabled', 'Voice Commands')}
          description={t('profile.voice.enabledDesc', 'Control the app with your voice')}
          value={voicePreferences.voice_search_enabled}
          onToggle={() => toggleVoiceSetting('voice_search_enabled')}
          disabled={voiceLoading}
          isRTL={isRTL}
        />
        <SettingRow
          icon={Volume2}
          iconColor="#22C55E"
          label={t('profile.voice.tts', 'Text-to-Speech')}
          description={t('profile.voice.ttsDesc', 'AI responses read aloud')}
          value={voicePreferences.tts_enabled}
          onToggle={() => toggleVoiceSetting('tts_enabled')}
          disabled={voiceLoading}
          isRTL={isRTL}
        />
        <SettingRow
          icon={Bell}
          iconColor="#F59E0B"
          label={t('profile.voice.wakeWord', 'Wake Word Detection')}
          description={t('profile.voice.wakeWordDesc', 'Say "Buyit" to activate')}
          value={voicePreferences.wake_word_enabled}
          onToggle={() => toggleVoiceSetting('wake_word_enabled')}
          disabled={voiceLoading}
          isRTL={isRTL}
        />
      </GlassView>

      <GlassView className="p-6 gap-4">
        <View className={`items-center gap-4 mb-2 ${isRTL ? 'flex-row-reverse' : 'flex-row'}`}>
          {isRTL ? (
            <>
              <View className="flex-1">
                <Text className="text-[13px] font-semibold text-white/60 uppercase tracking-wide text-right">
                  {t('profile.ai.privacy', 'Privacy & Data')}
                </Text>
                <Text className="text-[13px] text-white/60 mt-0.5 text-right">
                  {t('profile.ai.privacyDesc', 'Your data is encrypted and secure')}
                </Text>
              </View>
              <View className="w-12 h-12 rounded-lg bg-[#22C55E]/15 justify-center items-center">
                <Shield size={24} color="#22C55E" />
              </View>
            </>
          ) : (
            <>
              <View className="w-12 h-12 rounded-lg bg-[#22C55E]/15 justify-center items-center">
                <Shield size={24} color="#22C55E" />
              </View>
              <View className="flex-1">
                <Text className="text-[13px] font-semibold text-white/60 uppercase tracking-wide text-left">
                  {t('profile.ai.privacy', 'Privacy & Data')}
                </Text>
                <Text className="text-[13px] text-white/60 mt-0.5 text-left">
                  {t('profile.ai.privacyDesc', 'Your data is encrypted and secure')}
                </Text>
              </View>
            </>
          )}
        </View>

        <SettingRow
          icon={Shield}
          iconColor="#22C55E"
          label={t('profile.ai.dataConsent', 'Usage Analytics')}
          description={t('profile.ai.dataConsentDesc', 'Help improve AI features')}
          value={aiPreferences.data_collection_consent}
          onToggle={() => toggleAISetting('data_collection_consent')}
          disabled={aiLoading}
          isRTL={isRTL}
        />
      </GlassView>
    </View>
  );
}
