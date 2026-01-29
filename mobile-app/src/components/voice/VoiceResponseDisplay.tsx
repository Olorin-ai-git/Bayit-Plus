/**
 * Voice Response Display Component
 *
 * Shows the voice command response with:
 * - Command type badge
 * - Response text
 * - Action details
 * - Confidence indicator
 */

import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  Animated,
  TouchableOpacity,
} from 'react-native';
import { VoiceCommandResponse } from '../../services/backendProxyService';

interface VoiceResponseDisplayProps {
  response: VoiceCommandResponse | null;
  isVisible?: boolean;
  onDismiss?: () => void;
  duration?: number; // Auto-dismiss after duration (ms), null to disable
}

export const VoiceResponseDisplay: React.FC<VoiceResponseDisplayProps> = ({
  response,
  isVisible = true,
  onDismiss,
  duration = 5000,
}) => {
  const [fadeAnimation] = useState(new Animated.Value(0));
  const [shouldShow, setShouldShow] = useState(isVisible && response !== null);

  useEffect(() => {
    if (isVisible && response) {
      setShouldShow(true);
      Animated.timing(fadeAnimation, {
        toValue: 1,
        duration: 300,
        useNativeDriver: true,
      }).start();

      if (duration) {
        const timer = setTimeout(() => {
          handleDismiss();
        }, duration);

        return () => clearTimeout(timer);
      }
    }
  }, [isVisible, response, duration, fadeAnimation]);

  const handleDismiss = () => {
    Animated.timing(fadeAnimation, {
      toValue: 0,
      duration: 300,
      useNativeDriver: true,
    }).start(() => {
      setShouldShow(false);
      onDismiss?.();
    });
  };

  if (!shouldShow || !response) {
    return null;
  }

  const commandTypeColor = getCommandTypeColor(response.commandType);
  const statusIcon = response.success ? '✓' : '✗';
  const statusColor = response.success ? '#10B981' : '#EF4444';

  return (
    <Animated.View
      className="bg-slate-800 rounded-lg mx-4 my-2 border border-slate-700 overflow-hidden"
      style={{
        opacity: fadeAnimation,
      }}
    >
      <View className="p-3">
        {/* Status and Command Type */}
        <View className="flex-row items-start gap-3 mb-3">
          <View
            className="w-7 h-7 rounded-full justify-center items-center mt-0.5"
            style={{ backgroundColor: statusColor }}
          >
            <Text
              className="text-base font-bold text-white"
              allowFontScaling={true}
              maxFontSizeMultiplier={1.3}
            >
              {statusIcon}
            </Text>
          </View>
          <View className="flex-1">
            <Text
              className="text-sm font-semibold text-slate-100 mb-1"
              allowFontScaling={true}
              maxFontSizeMultiplier={1.3}
            >
              {response.success ? 'Command Recognized' : 'Command Failed'}
            </Text>
            <View className="flex-row items-center gap-2">
              <View
                className="px-2 py-0.5 rounded"
                style={{ backgroundColor: commandTypeColor }}
              >
                <Text
                  className="text-xs font-semibold text-white capitalize"
                  allowFontScaling={true}
                  maxFontSizeMultiplier={1.3}
                >
                  {response.commandType}
                </Text>
              </View>
              {response.confidence && (
                <Text
                  className="text-xs text-slate-400"
                  allowFontScaling={true}
                  maxFontSizeMultiplier={1.3}
                >
                  {(response.confidence * 100).toFixed(0)}% confident
                </Text>
              )}
            </View>
          </View>
          <TouchableOpacity
            onPress={handleDismiss}
            className="p-1"
          >
            <Text
              className="text-lg text-slate-600"
              allowFontScaling={true}
              maxFontSizeMultiplier={1.3}
            >
              ✕
            </Text>
          </TouchableOpacity>
        </View>

        {/* Response Text */}
        <Text
          className="text-xs text-slate-200 leading-tight mb-3"
          allowFontScaling={true}
          maxFontSizeMultiplier={1.3}
        >
          {response.responseText}
        </Text>

        {/* Action Details */}
        {response.action && (
          <View className="bg-slate-900 rounded p-2 mb-2 border-l-4 border-blue-600">
            <Text
              className="text-xs text-slate-400 mb-1"
              allowFontScaling={true}
              maxFontSizeMultiplier={1.3}
            >
              Action:
            </Text>
            <Text
              className="text-xs text-slate-100"
              allowFontScaling={true}
              maxFontSizeMultiplier={1.3}
            >
              {response.action}
            </Text>
          </View>
        )}

        {/* Action Data */}
        {response.actionData && (
          <View className="bg-slate-900 rounded p-2 border-l-4 border-purple-600">
            <Text
              className="text-xs text-slate-400 mb-1.5"
              allowFontScaling={true}
              maxFontSizeMultiplier={1.3}
            >
              Details:
            </Text>
            <View className="gap-1">
              {Object.entries(response.actionData).map(([key, value]) => (
                <View key={key} className="flex-row justify-between items-center">
                  <Text
                    className="text-xs text-slate-600 font-medium"
                    allowFontScaling={true}
                    maxFontSizeMultiplier={1.3}
                  >
                    {key}:
                  </Text>
                  <Text
                    className="text-xs text-slate-300"
                    allowFontScaling={true}
                    maxFontSizeMultiplier={1.3}
                  >
                    {typeof value === 'string' ? value : JSON.stringify(value)}
                  </Text>
                </View>
              ))}
            </View>
          </View>
        )}
      </View>
    </Animated.View>
  );
};

// ============================================
// Helper Functions
// ============================================

const getCommandTypeColor = (commandType: string): string => {
  const colors: Record<string, string> = {
    search: '#3B82F6',    // Blue
    play: '#10B981',      // Green
    control: '#F59E0B',   // Amber
    navigate: '#8B5CF6',  // Purple
    settings: '#6B7280',  // Gray
  };
  return colors[commandType] || '#6B7280';
};
