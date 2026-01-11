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
import { View, Text, StyleSheet, Pressable, Animated } from 'react-native';
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
      style={[
        styles.container,
        {
          transform: [{ translateY: slideAnim }],
          opacity: opacityAnim,
        },
      ]}
    >
      <View style={[styles.banner, { borderLeftColor: priorityColor }]}>
        {/* Icon */}
        <View style={[styles.iconContainer, { backgroundColor: priorityColor + '20' }]}>
          <Sparkles size={20} color={priorityColor} />
        </View>

        {/* Content */}
        <View style={styles.content}>
          <Text style={styles.message}>{suggestion.message}</Text>

          {/* Type label */}
          <Text style={styles.typeLabel}>{suggestion.type.replace('-', ' ')}</Text>
        </View>

        {/* Actions */}
        <View style={styles.actions}>
          {/* Execute button */}
          {suggestion.action && (
            <Pressable
              style={[styles.actionButton, styles.executeButton]}
              onPress={() => onExecute(suggestion)}
            >
              <Check size={18} color="#fff" />
            </Pressable>
          )}

          {/* Dismiss button */}
          <Pressable style={[styles.actionButton, styles.dismissButton]} onPress={onDismiss}>
            <X size={18} color="rgba(255, 255, 255, 0.7)" />
          </Pressable>
        </View>
      </View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    top: 60, // Below status bar
    left: 16,
    right: 16,
    zIndex: 9990, // Below voice button
  },
  banner: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(20, 20, 35, 0.95)',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
    borderLeftWidth: 4,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 12,
    elevation: 8,
  },
  iconContainer: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  content: {
    flex: 1,
  },
  message: {
    fontSize: 14,
    fontWeight: '600',
    color: '#fff',
    lineHeight: 20,
    marginBottom: 4,
  },
  typeLabel: {
    fontSize: 11,
    color: 'rgba(255, 255, 255, 0.5)',
    textTransform: 'capitalize',
  },
  actions: {
    flexDirection: 'row',
    gap: 8,
  },
  actionButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    justifyContent: 'center',
    alignItems: 'center',
  },
  executeButton: {
    backgroundColor: '#00aaff',
  },
  dismissButton: {
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
  },
});
