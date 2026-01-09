/**
 * Voice Video Indicator Component
 * Shows request/response videos based on voice state
 * 200px high div displayed at hero section
 */

import React from 'react';
import { View, StyleSheet } from 'react-native';

interface VoiceVideoIndicatorProps {
  isListening: boolean;
  isProcessing: boolean;
  isSpeaking: boolean;
  requestVideoUrl?: string;
  responseVideoUrl?: string;
}

export function VoiceVideoIndicator({
  isListening,
  isProcessing,
  isSpeaking,
  requestVideoUrl = '/request.mp4',
  responseVideoUrl = '/response.mp4',
}: VoiceVideoIndicatorProps) {
  const isActive = isListening || isProcessing || isSpeaking;
  const isRequest = isListening;
  const isResponse = isProcessing || isSpeaking;

  if (!isActive) {
    return null;
  }

  return (
    <View style={styles.container as any}>
      <video
        autoPlay
        muted
        loop
        playsInline
        style={{
          width: '100%',
          height: '100%',
          objectFit: 'cover',
        } as any}
      >
        <source
          src={isRequest ? requestVideoUrl : responseVideoUrl}
          type="video/mp4"
        />
      </video>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    width: '100%',
    height: 200,
    backgroundColor: '#000',
    overflow: 'hidden',
    zIndex: 40,
  },
});

export default VoiceVideoIndicator;
