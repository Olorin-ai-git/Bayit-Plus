/**
 * Voice Status Overlay Component
 * Minimal voice feedback UI for Voice Only mode
 * Shows: listening indicator, transcript preview, processing status
 * Auto-hides after response completes
 */

import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, Animated, Platform } from 'react-native';
import { Mic } from 'lucide-react';
import { SoundwaveVisualizer } from './SoundwaveVisualizer';
import { GlassView } from './ui';
import { colors, spacing, borderRadius } from '../theme';

interface VoiceStatusOverlayProps {
  isListening: boolean;
  isProcessing: boolean;
  isSpeaking: boolean;
  currentTranscript?: string;
  autoHideDuration?: number; // ms to auto-hide after speaking completes
  onAutoHide?: () => void;
}

export function VoiceStatusOverlay({
  isListening,
  isProcessing,
  isSpeaking,
  currentTranscript = '',
  autoHideDuration = 3000, // Default 3 seconds
  onAutoHide,
}: VoiceStatusOverlayProps) {
  const [fadeAnim] = useState(new Animated.Value(0));
  const isActive = isListening || isProcessing || isSpeaking;

  // Auto-hide after speaking completes
  useEffect(() => {
    if (isSpeaking) {
      const hideTimer = setTimeout(() => {
        Animated.timing(fadeAnim, {
          toValue: 0,
          duration: 300,
          useNativeDriver: true,
        }).start(() => {
          onAutoHide?.();
        });
      }, autoHideDuration);

      return () => clearTimeout(hideTimer);
    }
  }, [isSpeaking, autoHideDuration, fadeAnim, onAutoHide]);

  // Show/hide overlay based on active state
  useEffect(() => {
    Animated.timing(fadeAnim, {
      toValue: isActive ? 1 : 0,
      duration: 300,
      useNativeDriver: true,
    }).start();
  }, [isActive, fadeAnim]);

  if (!isActive) {
    return null;
  }

  return (
    <Animated.View
      style={[
        styles.container,
        {
          opacity: fadeAnim,
        },
      ]}
    >
      <GlassView intensity="high" style={styles.overlay}>
        {/* Visual Indicator Section */}
        <View
          style={[
            styles.indicatorSection,
            currentTranscript && { marginBottom: spacing.md },
          ]}
        >
          {isListening && (
            <>
              <View style={styles.visualizerContainer}>
                <SoundwaveVisualizer
                  audioLevel={0.6}
                  isListening={true}
                  isProcessing={false}
                  isSendingToServer={false}
                  compact={true}
                />
              </View>
              <Text style={styles.statusText}>Listening...</Text>
            </>
          )}

          {isProcessing && (
            <>
              <View style={styles.processingIndicator}>
                <Animated.View
                  style={[
                    styles.processingDot,
                    {
                      opacity: createPulseAnimation(),
                    },
                  ]}
                />
              </View>
              <Text style={styles.statusText}>Processing...</Text>
            </>
          )}

          {isSpeaking && (
            <>
              <View style={styles.visualizerContainer}>
                <SoundwaveVisualizer
                  audioLevel={0.7}
                  isListening={false}
                  isProcessing={false}
                  isSendingToServer={false}
                  compact={true}
                />
              </View>
              <Text style={styles.statusText}>Speaking...</Text>
            </>
          )}
        </View>

        {/* Transcript Section */}
        {currentTranscript && (
          <View style={styles.transcriptSection}>
            <Text style={styles.transcriptLabel}>You said:</Text>
            <Text style={styles.transcriptText} numberOfLines={2}>
              {currentTranscript}
            </Text>
          </View>
        )}
      </GlassView>
    </Animated.View>
  );
}

/**
 * Helper function to create pulse animation
 */
function createPulseAnimation(): Animated.Value {
  const anim = new Animated.Value(1);

  Animated.loop(
    Animated.sequence([
      Animated.timing(anim, {
        toValue: 0.3,
        duration: 600,
        useNativeDriver: true,
      }),
      Animated.timing(anim, {
        toValue: 1,
        duration: 600,
        useNativeDriver: true,
      }),
    ])
  ).start();

  return anim;
}

const styles = StyleSheet.create({
  container: {
    position: 'fixed' as any,
    bottom: spacing.lg,
    left: 0,
    right: 0,
    alignItems: 'center',
    zIndex: 40,
  },
  overlay: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: spacing.lg,
    paddingHorizontal: spacing.xl,
    minWidth: 280,
    maxWidth: '90%',
  },
  indicatorSection: {
    alignItems: 'center',
    gap: spacing.md,
  },
  visualizerContainer: {
    height: 60,
    justifyContent: 'center',
    alignItems: 'center',
  },
  processingIndicator: {
    width: 48,
    height: 48,
    alignItems: 'center',
    justifyContent: 'center',
  },
  processingDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: colors.primary,
  },
  statusText: {
    fontSize: 14,
    color: colors.textSecondary,
    fontWeight: '500',
    marginTop: spacing.sm,
  },
  transcriptSection: {
    borderTopWidth: 1,
    borderTopColor: 'rgba(255, 255, 255, 0.1)',
    paddingTop: spacing.md,
    width: '100%',
  },
  transcriptLabel: {
    fontSize: 12,
    color: colors.textMuted,
    marginBottom: spacing.xs,
    textTransform: 'uppercase',
  },
  transcriptText: {
    fontSize: 14,
    color: colors.text,
    lineHeight: 20,
  },
});

export default VoiceStatusOverlay;
