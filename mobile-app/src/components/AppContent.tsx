/**
 * App Content Component
 * Wraps components that need navigation context
 */

import React from 'react';
import { View, StyleSheet, StatusBar } from 'react-native';
import { RootNavigator } from '../navigation/RootNavigator';
import VoiceCommandButton from './voice/VoiceCommandButton';
import ProactiveSuggestionBanner from './voice/ProactiveSuggestionBanner';
import { useVoiceMobile, useProactiveVoice } from '../hooks';

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
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0d0d1a',
  },
});
