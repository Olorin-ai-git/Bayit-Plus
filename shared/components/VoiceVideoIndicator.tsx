/**
 * Voice Video Indicator Component
 * Shows request/response videos based on voice state
 * 200px high div displayed at hero section
 */

import React from 'react';
import { View } from 'react-native';

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
  requestVideoUrl = '/assets/video/voice/request.mp4',
  responseVideoUrl = '/assets/video/voice/response.mp4',
}: VoiceVideoIndicatorProps) {
  const isActive = isListening || isProcessing || isSpeaking;
  const isRequest = isListening;
  const isResponse = isProcessing || isSpeaking;

  if (!isActive) {
    return null;
  }

  return (
    <View className="w-full h-[200px] bg-black overflow-hidden z-40">
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

export default VoiceVideoIndicator;
