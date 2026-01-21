/**
 * LLMSearchButton Component
 *
 * Triggers natural language search modal (premium feature).
 * Shows premium badge for non-premium users.
 */

import React from 'react';
import { TouchableOpacity, Text, View } from 'react-native';

interface LLMSearchButtonProps {
  onPress: () => void;
  isPremium?: boolean;
  disabled?: boolean;
}

export function LLMSearchButton({
  onPress,
  isPremium = false,
  disabled = false
}: LLMSearchButtonProps) {
  return (
    <TouchableOpacity
      onPress={onPress}
      disabled={disabled}
      className={`
        flex-row items-center gap-2 px-4 py-3
        bg-gradient-to-r from-purple-500/30 to-blue-500/30
        backdrop-blur-xl rounded-full
        border ${isPremium ? 'border-purple-400/50' : 'border-yellow-400/50'}
        ${disabled ? 'opacity-50' : ''}
      `}
      activeOpacity={0.7}
    >
      {/* AI Icon */}
      <Text className="text-xl">🤖</Text>

      {/* Label */}
      <Text className="text-white font-semibold">Smart Search</Text>

      {/* Premium Badge */}
      {!isPremium && (
        <View className="px-2 py-1 bg-yellow-500/30 rounded-full">
          <Text className="text-yellow-300 text-xs font-bold">PREMIUM</Text>
        </View>
      )}
    </TouchableOpacity>
  );
}

export default LLMSearchButton;
