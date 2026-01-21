/**
 * Voice Search Modal Component
 *
 * Provides a full-screen modal interface for voice search with:
 * - Real-time voice state visualization
 * - Transcription display
 * - Command suggestions
 * - Voice metrics display
 * - Error handling and recovery
 */

import React, { useCallback, useEffect, useState } from 'react';
import {
  View,
  Modal,
  Text,
  TouchableOpacity,
  ActivityIndicator,
  ScrollView,
  Animated,
  StyleSheet,
  SafeAreaView,
} from 'react-native';
import { useVoiceFeatures } from '../../hooks/useVoiceFeatures';
import { useNavigation } from '@react-navigation/native';

interface VoiceSearchModalProps {
  isVisible: boolean;
  onClose: () => void;
  onCommandExecuted?: (command: string, action: string) => void;
}

export const VoiceSearchModal: React.FC<VoiceSearchModalProps> = ({
  isVisible,
  onClose,
  onCommandExecuted,
}) => {
  const navigation = useNavigation();
  const [isModalVisible, setIsModalVisible] = useState(isVisible);

  const {
    stage,
    isListening,
    isIdle,
    isProcessing,
    isResponding,
    error,
    startListening,
    stopListening,
    startManualListening,
    suggestions,
    metrics,
    totalTime,
    confidence,
    executeCommand,
    lastCommandResponse,
  } = useVoiceFeatures({
    language: 'en',
    onStateChange: (newStage) => {
      console.log('[VoiceSearchModal] Stage changed:', newStage);
    },
    onError: (err) => {
      console.error('[VoiceSearchModal] Voice error:', err);
    }
  });

  // Update visibility
  useEffect(() => {
    setIsModalVisible(isVisible);
    if (isVisible && isIdle) {
      startManualListening();
    }
  }, [isVisible, isIdle, startManualListening]);

  const handleClose = useCallback(() => {
    stopListening();
    setIsModalVisible(false);
    onClose();
  }, [stopListening, onClose]);

  const handleCommandExecute = useCallback(async (suggestion: string) => {
    try {
      const response = await executeCommand(suggestion, confidence);
      if (response.success) {
        onCommandExecuted?.(suggestion, response.action || '');
        // Navigate to search with query if it's a search command
        if (response.commandType === 'search' && response.actionData?.query) {
          handleClose();
          (navigation as any).navigate('Search', {
            query: response.actionData.query
          });
        }
      }
    } catch (err) {
      console.error('[VoiceSearchModal] Error executing command:', err);
    }
  }, [executeCommand, confidence, navigation, onCommandExecuted, handleClose]);

  const getStageText = () => {
    switch (stage) {
      case 'idle':
        return 'Ready to listen';
      case 'wake-word':
        return 'Waiting for wake word...';
      case 'listening':
        return 'Listening...';
      case 'processing':
        return 'Processing...';
      case 'responding':
        return 'Responding...';
      case 'error':
        return 'Error occurred';
      case 'timeout':
        return 'Timed out';
      default:
        return 'Unknown state';
    }
  };

  const getStageColor = () => {
    switch (stage) {
      case 'listening':
        return '#EF4444'; // Red
      case 'processing':
        return '#F59E0B'; // Amber
      case 'responding':
        return '#10B981'; // Green
      case 'error':
      case 'timeout':
        return '#DC2626'; // Dark red
      default:
        return '#6B7280'; // Gray
    }
  };

  return (
    <Modal
      visible={isModalVisible}
      animationType="slide"
      transparent={false}
      onRequestClose={handleClose}
      statusBarTranslucent
    >
      <SafeAreaView style={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity onPress={handleClose}>
            <Text style={styles.closeButton}>✕</Text>
          </TouchableOpacity>
          <Text style={styles.title}>Voice Search</Text>
          <View style={styles.placeholder} />
        </View>

        <ScrollView
          style={styles.content}
          contentContainerStyle={styles.contentContainer}
          keyboardShouldPersistTaps="handled"
        >
          {/* Voice State Indicator */}
          <View style={styles.stateIndicator}>
            <View
              style={[
                styles.stateCircle,
                { backgroundColor: getStageColor() }
              ]}
            >
              {isProcessing && (
                <ActivityIndicator color="#FFFFFF" size="large" />
              )}
              {isListening && (
                <PulsingDot
                  color={getStageColor()}
                  size={60}
                  intensity={0.8}
                />
              )}
              {!isProcessing && !isListening && (
                <Text style={styles.stateEmoji}>
                  {stage === 'idle' ? '🎤' : '✓'}
                </Text>
              )}
            </View>
            <Text style={styles.stateText}>{getStageText()}</Text>
          </View>

          {/* Transcription Display */}
          {metrics?.transcription && (
            <View style={styles.transcriptionBox}>
              <Text style={styles.transcriptionLabel}>Transcription</Text>
              <Text style={styles.transcriptionText}>
                {metrics.transcription}
              </Text>
              <Text style={styles.confidenceText}>
                Confidence: {(metrics.confidence * 100).toFixed(0)}%
              </Text>
            </View>
          )}

          {/* Command Response */}
          {lastCommandResponse && (
            <View style={[
              styles.responseBox,
              {
                borderLeftColor: lastCommandResponse.success ? '#10B981' : '#EF4444'
              }
            ]}>
              <Text style={styles.responseLabel}>
                {lastCommandResponse.success ? '✓ Command' : '✗ Error'}
              </Text>
              <Text style={styles.responseText}>
                {lastCommandResponse.responseText}
              </Text>
              {lastCommandResponse.commandType && (
                <Text style={styles.commandTypeText}>
                  Type: {lastCommandResponse.commandType}
                </Text>
              )}
            </View>
          )}

          {/* Metrics Display */}
          {metrics && (
            <View style={styles.metricsBox}>
              <Text style={styles.metricsTitle}>Performance Metrics</Text>
              <MetricRow
                label="Wake Word"
                value={`${metrics.wakeWordTime}ms`}
              />
              <MetricRow
                label="Listening"
                value={`${metrics.listeningTime}ms`}
              />
              <MetricRow
                label="Processing"
                value={`${metrics.processingTime}ms`}
              />
              <MetricRow
                label="TTS Response"
                value={`${metrics.ttsTime}ms`}
              />
              <MetricRow
                label="Total Time"
                value={`${metrics.totalTime}ms`}
                highlight
              />
            </View>
          )}

          {/* Voice Suggestions */}
          {suggestions && suggestions.length > 0 && (
            <View style={styles.suggestionsBox}>
              <Text style={styles.suggestionsTitle}>
                Suggested Commands
              </Text>
              {suggestions.map((suggestion, index) => (
                <TouchableOpacity
                  key={index}
                  style={styles.suggestionItem}
                  onPress={() => handleCommandExecute(suggestion.suggestion)}
                  activeOpacity={0.7}
                >
                  <Text style={styles.suggestionText}>
                    {suggestion.suggestion}
                  </Text>
                  <Text style={styles.suggestionConfidence}>
                    {(suggestion.confidence * 100).toFixed(0)}%
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          )}

          {/* Error Display */}
          {error && (
            <View style={styles.errorBox}>
              <Text style={styles.errorTitle}>⚠ Error</Text>
              <Text style={styles.errorText}>{error.message}</Text>
              <TouchableOpacity
                style={styles.retryButton}
                onPress={() => startManualListening()}
              >
                <Text style={styles.retryButtonText}>Try Again</Text>
              </TouchableOpacity>
            </View>
          )}
        </ScrollView>

        {/* Action Buttons */}
        <View style={styles.footer}>
          {isListening ? (
            <TouchableOpacity
              style={[styles.button, styles.stopButton]}
              onPress={stopListening}
            >
              <Text style={styles.buttonText}>Stop Listening</Text>
            </TouchableOpacity>
          ) : (
            <>
              <TouchableOpacity
                style={[styles.button, styles.closeFooterButton]}
                onPress={handleClose}
              >
                <Text style={styles.buttonText}>Close</Text>
              </TouchableOpacity>
              {isIdle && (
                <TouchableOpacity
                  style={[styles.button, styles.primaryButton]}
                  onPress={startManualListening}
                >
                  <Text style={styles.buttonText}>Start Listening</Text>
                </TouchableOpacity>
              )}
            </>
          )}
        </View>
      </SafeAreaView>
    </Modal>
  );
};

// ============================================
// Helper Components
// ============================================

interface PulsingDotProps {
  color: string;
  size: number;
  intensity: number;
}

const PulsingDot: React.FC<PulsingDotProps> = ({ color, size, intensity }) => {
  const [animation] = useState(new Animated.Value(intensity));

  useEffect(() => {
    const pulse = () => {
      animation.setValue(intensity);
      Animated.loop(
        Animated.sequence([
          Animated.timing(animation, {
            toValue: 1,
            duration: 1000,
            useNativeDriver: false,
          }),
          Animated.timing(animation, {
            toValue: intensity,
            duration: 1000,
            useNativeDriver: false,
          }),
        ])
      ).start();
    };
    pulse();
  }, [animation, intensity]);

  return (
    <Animated.View
      style={[
        {
          width: size,
          height: size,
          borderRadius: size / 2,
          backgroundColor: color,
          opacity: animation,
        },
      ]}
    />
  );
};

interface MetricRowProps {
  label: string;
  value: string;
  highlight?: boolean;
}

const MetricRow: React.FC<MetricRowProps> = ({ label, value, highlight }) => (
  <View style={[styles.metricRow, highlight && styles.metricRowHighlight]}>
    <Text style={styles.metricLabel}>{label}</Text>
    <Text style={[styles.metricValue, highlight && styles.metricValueHighlight]}>
      {value}
    </Text>
  </View>
);

// ============================================
// Styles
// ============================================

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0F172A', // Dark background
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#1E293B',
  },
  title: {
    fontSize: 18,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  closeButton: {
    fontSize: 24,
    color: '#94A3B8',
  },
  placeholder: {
    width: 24,
  },
  content: {
    flex: 1,
  },
  contentContainer: {
    padding: 16,
    gap: 16,
  },
  stateIndicator: {
    alignItems: 'center',
    paddingVertical: 24,
  },
  stateCircle: {
    width: 120,
    height: 120,
    borderRadius: 60,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
  },
  stateEmoji: {
    fontSize: 48,
  },
  stateText: {
    fontSize: 16,
    color: '#E2E8F0',
    textAlign: 'center',
  },
  transcriptionBox: {
    backgroundColor: '#1E293B',
    borderRadius: 8,
    padding: 12,
    borderLeftWidth: 4,
    borderLeftColor: '#3B82F6',
  },
  transcriptionLabel: {
    fontSize: 12,
    color: '#94A3B8',
    marginBottom: 4,
  },
  transcriptionText: {
    fontSize: 14,
    color: '#F1F5F9',
    marginBottom: 8,
  },
  confidenceText: {
    fontSize: 12,
    color: '#64748B',
  },
  responseBox: {
    backgroundColor: '#1E293B',
    borderRadius: 8,
    padding: 12,
    borderLeftWidth: 4,
  },
  responseLabel: {
    fontSize: 12,
    color: '#94A3B8',
    marginBottom: 4,
  },
  responseText: {
    fontSize: 14,
    color: '#F1F5F9',
    marginBottom: 4,
  },
  commandTypeText: {
    fontSize: 12,
    color: '#64748B',
  },
  metricsBox: {
    backgroundColor: '#1E293B',
    borderRadius: 8,
    padding: 12,
  },
  metricsTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#F1F5F9',
    marginBottom: 8,
  },
  metricRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 6,
    borderBottomWidth: 1,
    borderBottomColor: '#334155',
  },
  metricRowHighlight: {
    backgroundColor: '#1E293B',
    borderRadius: 4,
    paddingHorizontal: 8,
    borderBottomColor: 'transparent',
  },
  metricLabel: {
    fontSize: 12,
    color: '#94A3B8',
  },
  metricValue: {
    fontSize: 12,
    color: '#64748B',
  },
  metricValueHighlight: {
    color: '#10B981',
    fontWeight: '600',
  },
  suggestionsBox: {
    backgroundColor: '#1E293B',
    borderRadius: 8,
    padding: 12,
    overflow: 'hidden',
  },
  suggestionsTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#F1F5F9',
    marginBottom: 8,
  },
  suggestionItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 8,
    paddingHorizontal: 8,
    marginBottom: 4,
    backgroundColor: '#0F172A',
    borderRadius: 4,
    borderWidth: 1,
    borderColor: '#334155',
  },
  suggestionText: {
    fontSize: 12,
    color: '#E2E8F0',
    flex: 1,
  },
  suggestionConfidence: {
    fontSize: 11,
    color: '#64748B',
  },
  errorBox: {
    backgroundColor: '#7F1D1D',
    borderRadius: 8,
    padding: 12,
    marginTop: 8,
  },
  errorTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#FCA5A5',
    marginBottom: 4,
  },
  errorText: {
    fontSize: 12,
    color: '#FECACA',
    marginBottom: 8,
  },
  retryButton: {
    backgroundColor: '#DC2626',
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 4,
    alignItems: 'center',
  },
  retryButtonText: {
    fontSize: 12,
    color: '#FFFFFF',
    fontWeight: '600',
  },
  footer: {
    flexDirection: 'row',
    gap: 8,
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderTopWidth: 1,
    borderTopColor: '#1E293B',
  },
  button: {
    flex: 1,
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 8,
    alignItems: 'center',
  },
  primaryButton: {
    backgroundColor: '#3B82F6',
  },
  stopButton: {
    backgroundColor: '#EF4444',
  },
  closeFooterButton: {
    backgroundColor: '#475569',
  },
  buttonText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#FFFFFF',
  },
});
