/**
 * AIVoiceSettingsScreen - AI assistant and voice preferences
 *
 * Features:
 * - AI assistant settings (chatbot, history, recommendations)
 * - Voice & accessibility settings (voice search, subtitles, contrast)
 * - Text-to-speech settings (TTS enabled, speed, volume)
 * - Real backend integration with optimistic updates
 */

import React, { useEffect, useState } from 'react';
import { View, Text, ScrollView, StyleSheet, ActivityIndicator } from 'react-native';
import { useTranslation } from 'react-i18next';
import { Bot, Mic, Volume2, Type, Eye, MessageSquare, Database, Sparkles, Subtitles } from 'lucide-react-native';
import { TVHeader } from '../components/TVHeader';
import { SettingRow } from '../components/profile/SettingRow';
import { useAIVoiceSettingsStore } from '../stores/aiVoiceSettingsStore';
import { config } from '../config/appConfig';

export const AIVoiceSettingsScreen: React.FC<{ navigation: any }> = ({ navigation }) => {
  const { t } = useTranslation();
  const [focusedItem, setFocusedItem] = useState<string | null>(null);

  const {
    aiPreferences,
    voicePreferences,
    isLoading,
    error,
    loadPreferences,
    updateAISetting,
    updateVoiceSetting,
  } = useAIVoiceSettingsStore();

  useEffect(() => {
    loadPreferences();
  }, [loadPreferences]);

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

  if (!aiPreferences || !voicePreferences) {
    return null;
  }

  const textSizeOptions = [
    { label: t('tvos.aiVoice.textSizeSmall', 'Small'), value: 'small' },
    { label: t('tvos.aiVoice.textSizeMedium', 'Medium'), value: 'medium' },
    { label: t('tvos.aiVoice.textSizeLarge', 'Large'), value: 'large' },
  ];

  return (
    <View style={styles.container}>
      <TVHeader currentScreen="profile" navigation={navigation} />

      <ScrollView style={styles.content} contentContainerStyle={styles.contentInner}>
        <Text style={styles.screenTitle}>
          {t('tvos.profile.aiVoiceSettings', 'AI & Voice Settings')}
        </Text>

        {/* AI Assistant Section */}
        <Text style={styles.sectionTitle}>
          {t('tvos.aiVoice.aiAssistant', 'AI Assistant')}
        </Text>
        <View style={styles.section}>
          <SettingRow
            icon={Bot}
            label={t('tvos.aiVoice.enableAI', 'Enable AI Assistant')}
            description={t('tvos.aiVoice.enableAIDesc', 'Use AI chatbot for content discovery')}
            type="toggle"
            value={aiPreferences.chatbot_enabled}
            onChange={(val) => updateAISetting('chatbot_enabled', val)}
            isFocused={focusedItem === 'chatbot_enabled'}
            onFocus={() => setFocusedItem('chatbot_enabled')}
            hasTVPreferredFocus={true}
          />
          <SettingRow
            icon={Database}
            label={t('tvos.aiVoice.saveHistory', 'Save Conversation History')}
            description={t('tvos.aiVoice.saveHistoryDesc', 'Store AI conversations for context')}
            type="toggle"
            value={aiPreferences.save_conversation_history}
            onChange={(val) => updateAISetting('save_conversation_history', val)}
            isFocused={focusedItem === 'save_conversation_history'}
            onFocus={() => setFocusedItem('save_conversation_history')}
          />
          <SettingRow
            icon={Sparkles}
            label={t('tvos.aiVoice.personalizedRecs', 'Personalized Recommendations')}
            description={t('tvos.aiVoice.personalizedRecsDesc', 'AI-powered content suggestions')}
            type="toggle"
            value={aiPreferences.personalized_recommendations}
            onChange={(val) => updateAISetting('personalized_recommendations', val)}
            isFocused={focusedItem === 'personalized_recommendations'}
            onFocus={() => setFocusedItem('personalized_recommendations')}
          />
          <SettingRow
            icon={MessageSquare}
            label={t('tvos.aiVoice.dataConsent', 'Data Collection Consent')}
            description={t('tvos.aiVoice.dataConsentDesc', 'Allow data collection for improvement')}
            type="toggle"
            value={aiPreferences.data_collection_consent}
            onChange={(val) => updateAISetting('data_collection_consent', val)}
            isFocused={focusedItem === 'data_collection_consent'}
            onFocus={() => setFocusedItem('data_collection_consent')}
          />
        </View>

        {/* Voice & Accessibility Section */}
        <Text style={styles.sectionTitle}>
          {t('tvos.aiVoice.voiceAccessibility', 'Voice & Accessibility')}
        </Text>
        <View style={styles.section}>
          <SettingRow
            icon={Mic}
            label={t('tvos.aiVoice.voiceSearch', 'Voice Search')}
            description={t('tvos.aiVoice.voiceSearchDesc', 'Enable voice search functionality')}
            type="toggle"
            value={voicePreferences.voice_search_enabled}
            onChange={(val) => updateVoiceSetting('voice_search_enabled', val)}
            isFocused={focusedItem === 'voice_search_enabled'}
            onFocus={() => setFocusedItem('voice_search_enabled')}
          />
          <SettingRow
            icon={Subtitles}
            label={t('tvos.aiVoice.autoSubtitle', 'Auto Subtitle')}
            description={t('tvos.aiVoice.autoSubtitleDesc', 'Automatically enable subtitles')}
            type="toggle"
            value={voicePreferences.auto_subtitle}
            onChange={(val) => updateVoiceSetting('auto_subtitle', val)}
            isFocused={focusedItem === 'auto_subtitle'}
            onFocus={() => setFocusedItem('auto_subtitle')}
          />
          <SettingRow
            icon={Eye}
            label={t('tvos.aiVoice.highContrast', 'High Contrast Mode')}
            description={t('tvos.aiVoice.highContrastDesc', 'Increase visibility for accessibility')}
            type="toggle"
            value={voicePreferences.high_contrast_mode}
            onChange={(val) => updateVoiceSetting('high_contrast_mode', val)}
            isFocused={focusedItem === 'high_contrast_mode'}
            onFocus={() => setFocusedItem('high_contrast_mode')}
          />
          <SettingRow
            icon={Type}
            label={t('tvos.aiVoice.textSize', 'Text Size')}
            description={t('tvos.aiVoice.textSizeDesc', 'Adjust text size for readability')}
            type="select"
            value={voicePreferences.text_size}
            options={textSizeOptions}
            onChange={(val) => updateVoiceSetting('text_size', val)}
            isFocused={focusedItem === 'text_size'}
            onFocus={() => setFocusedItem('text_size')}
          />
        </View>

        {/* Text-to-Speech Section */}
        <Text style={styles.sectionTitle}>
          {t('tvos.aiVoice.textToSpeech', 'Text-to-Speech')}
        </Text>
        <View style={styles.section}>
          <SettingRow
            icon={Volume2}
            label={t('tvos.aiVoice.ttsEnabled', 'Enable TTS')}
            description={t('tvos.aiVoice.ttsEnabledDesc', 'Text-to-speech narration')}
            type="toggle"
            value={voicePreferences.tts_enabled}
            onChange={(val) => updateVoiceSetting('tts_enabled', val)}
            isFocused={focusedItem === 'tts_enabled'}
            onFocus={() => setFocusedItem('tts_enabled')}
          />
        </View>
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000000',
  },
  content: {
    flex: 1,
  },
  contentInner: {
    paddingHorizontal: config.tv.safeZoneMarginPt,
    paddingBottom: config.tv.safeZoneMarginPt,
  },
  screenTitle: {
    fontSize: 48,
    fontWeight: '700',
    color: '#ffffff',
    marginTop: 24,
    marginBottom: 32,
  },
  sectionTitle: {
    fontSize: 32,
    fontWeight: '700',
    color: '#ffffff',
    marginTop: 24,
    marginBottom: 16,
  },
  section: {
    gap: 12,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    gap: 16,
  },
  loadingText: {
    fontSize: config.tv.minBodyTextSizePt,
    color: 'rgba(255,255,255,0.7)',
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    gap: 12,
    paddingHorizontal: config.tv.safeZoneMarginPt,
  },
  errorText: {
    fontSize: 28,
    fontWeight: '600',
    color: '#EF4444',
    textAlign: 'center',
  },
  errorHint: {
    fontSize: 24,
    color: 'rgba(255,255,255,0.6)',
    textAlign: 'center',
  },
});
