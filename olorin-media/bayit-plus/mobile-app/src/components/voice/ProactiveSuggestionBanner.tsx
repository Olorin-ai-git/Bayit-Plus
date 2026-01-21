/**
 * ProactiveSuggestionBanner
 * Displays proactive AI suggestions to the user
 *
 * Features:
 * - Glass morphism design
 * - Animated entrance/exit
 * - Action buttons
 * - Dismiss button
 */

import React, { useEffect } from 'react';
import { View, Text, Pressable, Animated } from 'react-native';
import { X, Check, Sparkles } from 'lucide-react-native';
import type { ProactiveSuggestion } from '../../hooks/useProactiveVoice';

interface ProactiveSuggestionBannerProps {
  suggestion: ProactiveSuggestion | null;
  onExecute: (suggestion: ProactiveSuggestion) => void;
  onDismiss: () => void;
}

export default function ProactiveSuggestionBanner({
  suggestion,
  onExecute,
  onDismiss,
}: ProactiveSuggestionBannerProps) {
  const slideAnim = React.useRef(new Animated.Value(-100)).current;
  const opacityAnim = React.useRef(new Animated.Value(0)).current;

  // Animate in when suggestion appears
  useEffect(() => {
    if (suggestion) {
      Animated.parallel([
        Animated.spring(slideAnim, {
          toValue: 0,
          useNativeDriver: true,
          tension: 65,
          friction: 8,
        }),
        Animated.timing(opacityAnim, {
          toValue: 1,
          duration: 300,
          useNativeDriver: true,
        }),
      ]).start();
    } else {
      // Animate out
      Animated.parallel([
        Animated.timing(slideAnim, {
          toValue: -100,
          duration: 200,
          useNativeDriver: true,
        }),
        Animated.timing(opacityAnim, {
          toValue: 0,
          duration: 200,
          useNativeDriver: true,
        }),
      ]).start();
    }
  }, [suggestion]);

  if (!suggestion) return null;

  const priorityColor = {
    low: '#00aaff',
    medium: '#ff9500',
    high: '#ff3b30',
  }[suggestion.priority];

  return (
    <Animated.View
      className="absolute top-[100px] left-5 right-5 z-[9990]"
      style={{
        transform: [{ translateY: slideAnim }],
        opacity: opacityAnim,
      }}
    >
      <View
        className="flex-row items-center bg-[rgba(20,20,40,0.98)] rounded-[20px] border-[1.5px] border-purple-500/60 border-l-[5px] py-4 px-4 shadow-lg shadow-purple-500/40"
        style={{ borderLeftColor: priorityColor }}
      >
        {/* Icon */}
        <View
          className="w-12 h-12 rounded-full justify-center items-center mr-3.5"
          style={{ backgroundColor: priorityColor + '20' }}
        >
          <Sparkles size={20} color={priorityColor} />
        </View>

        {/* Content */}
        <View className="flex-1 justify-center">
          <Text className="text-[15px] font-bold text-white leading-[22px] mb-1.5">{suggestion.message}</Text>

          {/* Type label */}
          <Text className="text-xs font-medium text-purple-500/90 uppercase tracking-wide">{suggestion.type.replace('-', ' ')}</Text>
        </View>

        {/* Actions */}
        <View className="flex-row gap-2.5 ml-2">
          {/* Execute button */}
          {suggestion.action && (
            <Pressable
              className="w-10 h-10 rounded-full justify-center items-center border border-purple-500 bg-purple-500"
              onPress={() => onExecute(suggestion)}
            >
              <Check size={18} color="#fff" />
            </Pressable>
          )}

          {/* Dismiss button */}
          <Pressable className="w-10 h-10 rounded-full justify-center items-center border border-white/20 bg-white/15" onPress={onDismiss}>
            <X size={18} color="rgba(255, 255, 255, 0.7)" />
          </Pressable>
        </View>
      </View>
    </Animated.View>
  );
}
