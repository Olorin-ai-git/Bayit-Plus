/**
 * App Content Component
 * Wraps components that need navigation context
 */

import React, { useCallback } from 'react';
import { View, StyleSheet, StatusBar } from 'react-native';
import { RootNavigator } from '../navigation/RootNavigator';
import VoiceCommandButton from './voice/VoiceCommandButton';
import ProactiveSuggestionBanner from './voice/ProactiveSuggestionBanner';
import { useVoiceMobile, useProactiveVoice } from '../hooks';
import { VoiceAvatarFAB, VoiceChatModal } from '@bayit/shared/components/support';
import { useVoiceSupport } from '@bayit/shared-hooks';
import { supportConfig } from '@bayit/shared-config/supportConfig';

export const AppContent: React.FC = () => {
  // Voice integration (now inside NavigationContainer)
  const {
    isListening,
    isProcessing,
    startListening,
    stopListening,
    hasPermissions,
    requestPermissions,
  } = useVoiceMobile();

  // Proactive voice suggestions
  const {
    currentSuggestion,
    executeSuggestion,
    dismissSuggestion,
  } = useProactiveVoice({
    enabled: true,
    speakSuggestions: true,
    minInterval: 300000, // 5 minutes
  });

  // Voice Support for floating wizard hat FAB
  const {
    isVoiceModalOpen,
    isSupported: voiceSupported,
    closeVoiceModal,
    startListening: startSupportListening,
    stopListening: stopSupportListening,
    interrupt,
    activateVoiceAssistant,
  } = useVoiceSupport();

  const handleVoiceAvatarPress = useCallback(() => {
    // Activate voice assistant (handles intro + modal + listening)
    activateVoiceAssistant();
  }, [activateVoiceAssistant]);

  const handleVoicePress = async () => {
    if (isListening) {
      await stopListening();
    } else {
      if (!hasPermissions) {
        const granted = await requestPermissions();
        if (!granted) return;
      }
      await startListening();
    }
  };

  const handleVoiceLongPress = async () => {
    if (!hasPermissions) {
      await requestPermissions();
    }
  };

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor="#0d0d1a" />

      {/* Main Navigation */}
      <RootNavigator />

      {/* Proactive Voice Suggestion Banner */}
      <ProactiveSuggestionBanner
        suggestion={currentSuggestion}
        onExecute={executeSuggestion}
        onDismiss={dismissSuggestion}
      />

      {/* Floating Voice Command Button */}
      <VoiceCommandButton
        onPress={handleVoicePress}
        onLongPress={handleVoiceLongPress}
        isListening={isListening || isProcessing}
        isDisabled={!hasPermissions && !isListening}
      />

      {/* Voice Avatar FAB - Floating wizard hat for voice support */}
      {voiceSupported && supportConfig.voiceAssistant.enabled && (
        <VoiceAvatarFAB
          onPress={handleVoiceAvatarPress}
          visible={!isVoiceModalOpen}
        />
      )}

      {/* Voice Chat Modal - Full-screen voice interaction */}
      <VoiceChatModal
        visible={isVoiceModalOpen}
        onClose={closeVoiceModal}
        onStartListening={startSupportListening}
        onStopListening={stopSupportListening}
        onInterrupt={interrupt}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0d0d1a',
  },
});
