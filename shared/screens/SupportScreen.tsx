/**
 * Support Screen
 * Main support screen integrating the full support portal
 * Replaces HelpScreen with enterprise support features
 */

import React from 'react';
import {
  View,
} from 'react-native';
import { SupportPortal } from '../components/support';
import { VoiceAvatarFAB } from '../components/support/VoiceAvatarFAB';
import { VoiceChatModal } from '../components/support/VoiceChatModal';
import { useVoiceSupport } from '../hooks/useVoiceSupport';
import { useWakeWordSupport } from '../hooks/useWakeWordSupport';
import { supportConfig } from '../config/supportConfig';

export default function SupportScreen() {
  const {
    isVoiceModalOpen,
    isSupported: voiceSupported,
    closeVoiceModal,
    startListening,
    stopListening,
    interrupt,
    activateVoiceAssistant,
  } = useVoiceSupport();

  // Initialize wake word detection
  useWakeWordSupport({
    enabled: supportConfig.voiceAssistant.wakeWordEnabled,
    onWakeWordDetected: () => {
      console.log('[SupportScreen] Wake word detected');
      // Activate voice assistant when wake word is detected
      activateVoiceAssistant();
    },
  });

  const handleVoiceAvatarPress = () => {
    // Activate voice assistant (handles intro + modal + listening)
    activateVoiceAssistant();
  };

  return (
    <View className="flex-1 bg-[#0a0a0f]">
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
