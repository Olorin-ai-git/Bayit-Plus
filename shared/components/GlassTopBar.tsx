import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { useTranslation } from 'react-i18next';
import { GlassView } from './ui';
import { LanguageSelector } from './LanguageSelector';
import { UserAccountMenu } from './UserAccountMenu';
import { VoiceSearchButton } from './VoiceSearchButton';
import { SoundwaveVisualizer } from './SoundwaveVisualizer';
import { UpgradeButton } from './UpgradeButton';
import { colors, spacing, borderRadius } from '@olorin/design-tokens';
import { isWeb, isTV } from '../utils/platform';
import { useDirection } from '../hooks/useDirection';
import { useConstantListening } from '../hooks/useConstantListening';
import { useVoiceSettingsStore } from '../stores/voiceSettingsStore';
import { useTVFocus } from './hooks/useTVFocus';

interface GlassTopBarProps {
  onMenuPress?: () => void;
  sidebarExpanded?: boolean;
  transcribeAudio?: (audioBlob: Blob) => Promise<{ text: string }>;
  onVoiceCommand?: (text: string) => void;
}

export const GlassTopBar: React.FC<GlassTopBarProps> = ({
  onMenuPress,
  sidebarExpanded = false,
  transcribeAudio,
  onVoiceCommand,
}) => {
  const navigation = useNavigation<any>();
  const { i18n } = useTranslation();
  const { isRTL } = useDirection();
  const isHebrew = i18n.language === 'he';

  // TV focus for search button
  const { handleFocus: handleSearchFocus, handleBlur: handleSearchBlur, focusStyle: searchFocusStyle } = useTVFocus({
    styleType: 'button',
    animated: false,
  });

  // Voice settings
  const { preferences } = useVoiceSettingsStore();
  const wakeWordActive = preferences.wake_word_enabled && (isTV || isWeb);
  const holdButtonModeEnabled = preferences.hold_button_mode;

  // Handle voice transcript - send to chatbot or custom handler
  const handleTranscript = useCallback((text: string) => {
    if (onVoiceCommand) {
      onVoiceCommand(text);
    } else {
      // Default: navigate to search with the voice query
      navigation.navigate('Search', { query: text });
    }
  }, [navigation, onVoiceCommand]);

  // Handle voice errors
  const handleVoiceError = useCallback((error: Error) => {
    console.warn('[GlassTopBar] Voice error:', error.message);
  }, []);

  // Wake word listening hook
  const {
    isListening,
    isProcessing,
    isSendingToServer,
    audioLevel,
    isSupported: wakeWordSupported,
  } = useConstantListening({
    enabled: wakeWordActive && !holdButtonModeEnabled,
    onTranscript: handleTranscript,
    onError: handleVoiceError,
    silenceThresholdMs: preferences.silence_threshold_ms,
    vadSensitivity: preferences.vad_sensitivity,
    transcribeAudio,
  });

  const handleSearchPress = () => {
    navigation.navigate('Search');
  };

  const sidebarWidth = sidebarExpanded ? 280 : 80;
  const sidebarPadding = sidebarWidth + spacing.lg;

  // Show soundwave if wake word is enabled and supported
  const showSoundwave = wakeWordActive && wakeWordSupported && !holdButtonModeEnabled;

  // Show voice button if hold button mode is enabled OR wake word not supported
  const showVoiceButton = holdButtonModeEnabled || !wakeWordSupported;

  return (
    <GlassView intensity="medium" className="h-16 flex-row items-center justify-between px-4 border-b border-white/10" style={[
      { flexDirection: isRTL ? 'row-reverse' : 'row' },
      isRTL ? { paddingRight: sidebarPadding } : { paddingLeft: sidebarPadding },
    ]}>
      {/* Actions side */}
      <View className="items-center justify-end h-full gap-3" style={{ flexDirection: isRTL ? 'row-reverse' : 'row' }}>
        {/* Soundwave Visualizer - for wake word listening mode */}
        {showSoundwave && (
          <View className="h-11 justify-center items-center px-3 bg-white/10 rounded-lg border border-purple-300/30">
            <SoundwaveVisualizer
              audioLevel={audioLevel}
              isListening={isListening}
              isProcessing={isProcessing}
              isSendingToServer={isSendingToServer}
              compact
            />
          </View>
        )}

        {/* Voice Search Button - for hold-to-talk mode or fallback */}
        {showVoiceButton && (
          <VoiceSearchButton
            onResult={handleTranscript}
            transcribeAudio={transcribeAudio}
          />
        )}

        {/* Search Button */}
        <TouchableOpacity
          onPress={handleSearchPress}
          onFocus={handleSearchFocus}
          onBlur={handleSearchBlur}
          className="w-11 h-11 justify-center items-center rounded-lg bg-white/10 border border-transparent"
          style={searchFocusStyle}
        >
          <Text className="text-lg">🔍</Text>
        </TouchableOpacity>

        {/* Upgrade Button - for non-admin, non-premium users */}
        <UpgradeButton compact size="sm" />

        {/* Language Selector */}
        <LanguageSelector />

        {/* User Account Menu */}
        <UserAccountMenu />
      </View>

      {/* Right side (RTL) - Menu button (hidden on web) */}
      {!isWeb && (
        <TouchableOpacity
          onPress={onMenuPress}
          className="w-11 h-11 justify-center items-center rounded-md bg-transparent"
          onFocus={() => {}}
          onBlur={() => {}}
        >
          <Text className="text-2xl text-white">☰</Text>
        </TouchableOpacity>
      )}
    </GlassView>
  );
};

export default GlassTopBar;
