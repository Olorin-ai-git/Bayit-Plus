/**
 * Support Screen
 * Main support screen integrating the full support portal
 * Replaces HelpScreen with enterprise support features
 */

import React from 'react';
import {
  View,
  StyleSheet,
} from 'react-native';
import { colors } from '../theme';
import { SupportPortal } from '../components/support';
import { VoiceAvatarFAB } from '../components/support/VoiceAvatarFAB';
import { VoiceChatModal } from '../components/support/VoiceChatModal';
import { useVoiceSupport } from '../hooks/useVoiceSupport';
import { useWakeWordSupport } from '../hooks/useWakeWordSupport';
import { supportConfig } from '../config/supportConfig';

export default function SupportScreen() {
  const {
    voiceState,
    isVoiceModalOpen,
    isSupported: voiceSupported,
    openVoiceModal,
    closeVoiceModal,
    startListening,
    stopListening,
    interrupt,
  } = useVoiceSupport();

  // Initialize wake word detection
  useWakeWordSupport({
    enabled: supportConfig.voiceAssistant.wakeWordEnabled,
    onWakeWordDetected: () => {
      console.log('[SupportScreen] Wake word detected');
    },
  });

  const handleVoiceAvatarPress = () => {
    openVoiceModal();
    // Start listening after a brief delay for modal animation
    setTimeout(() => {
      startListening();
    }, 300);
  };

  return (
    <View style={styles.container}>
      {/* Main Support Portal */}
      <SupportPortal />

      {/* Voice Avatar FAB */}
      {voiceSupported && supportConfig.voiceAssistant.enabled && (
        <VoiceAvatarFAB
          onPress={handleVoiceAvatarPress}
          visible={!isVoiceModalOpen}
        />
      )}

      {/* Voice Chat Modal */}
      <VoiceChatModal
        visible={isVoiceModalOpen}
        onClose={closeVoiceModal}
        onStartListening={startListening}
        onStopListening={stopListening}
        onInterrupt={interrupt}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
});
