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
  SafeAreaView,
} from 'react-native';
import { useVoiceFeatures } from '../../hooks/useVoiceFeatures';
import { useNavigation } from '@react-navigation/native';
import logger from '@/utils/logger';

const moduleLogger = logger.scope('VoiceSearchModal');

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
      moduleLogger.debug('Stage changed', { stage: newStage });
    },
    onError: (err) => {
      moduleLogger.error('Voice error', err);
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
      moduleLogger.error('Error executing command', err);
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
      <SafeAreaView className="flex-1 bg-slate-900">
        <View className="flex-row justify-between items-center px-4 py-3 border-b border-slate-800">
          <TouchableOpacity onPress={handleClose}>
            <Text className="text-2xl text-slate-400">✕</Text>
          </TouchableOpacity>
          <Text className="text-lg font-semibold text-white">Voice Search</Text>
          <View className="w-6" />
        </View>

        <ScrollView
          className="flex-1"
          contentContainerStyle={{ padding: 16, gap: 16 }}
          keyboardShouldPersistTaps="handled"
        >
          {/* Voice State Indicator */}
          <View className="items-center py-6">
            <View
              className="w-30 h-30 rounded-full justify-center items-center mb-4"
              style={{ backgroundColor: getStageColor() }}
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
                <Text className="text-5xl">
                  {stage === 'idle' ? '🎤' : '✓'}
                </Text>
              )}
            </View>
            <Text className="text-base text-slate-200 text-center">{getStageText()}</Text>
          </View>

          {/* Transcription Display */}
          {metrics?.transcription && (
            <View className="bg-slate-800 rounded-lg p-3 border-l-4 border-blue-600">
              <Text className="text-xs text-slate-400 mb-1">Transcription</Text>
              <Text className="text-sm text-slate-100 mb-2">
                {metrics.transcription}
              </Text>
              <Text className="text-xs text-slate-600">
                Confidence: {(metrics.confidence * 100).toFixed(0)}%
              </Text>
            </View>
          )}

          {/* Command Response */}
          {lastCommandResponse && (
            <View
              className="bg-slate-800 rounded-lg p-3 border-l-4"
              style={{ borderLeftColor: lastCommandResponse.success ? '#10B981' : '#EF4444' }}
            >
              <Text className="text-xs text-slate-400 mb-1">
                {lastCommandResponse.success ? '✓ Command' : '✗ Error'}
              </Text>
              <Text className="text-sm text-slate-100 mb-1">
                {lastCommandResponse.responseText}
              </Text>
              {lastCommandResponse.commandType && (
                <Text className="text-xs text-slate-600">
                  Type: {lastCommandResponse.commandType}
                </Text>
              )}
            </View>
          )}

          {/* Metrics Display */}
          {metrics && (
            <View className="bg-slate-800 rounded-lg p-3">
              <Text className="text-sm font-semibold text-slate-100 mb-2">Performance Metrics</Text>
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
            <View className="bg-slate-800 rounded-lg p-3 overflow-hidden">
              <Text className="text-sm font-semibold text-slate-100 mb-2">
                Suggested Commands
              </Text>
              {suggestions.map((suggestion, index) => (
                <TouchableOpacity
                  key={index}
                  className="flex-row justify-between items-center py-2 px-2 mb-1 bg-slate-900 rounded border border-slate-700"
                  onPress={() => handleCommandExecute(suggestion.suggestion)}
                  activeOpacity={0.7}
                >
                  <Text className="text-xs text-slate-200 flex-1">
                    {suggestion.suggestion}
                  </Text>
                  <Text className="text-xs text-slate-600">
                    {(suggestion.confidence * 100).toFixed(0)}%
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          )}

          {/* Error Display */}
          {error && (
            <View className="bg-red-900 rounded-lg p-3 mt-2">
              <Text className="text-sm font-semibold text-red-300 mb-1">⚠ Error</Text>
              <Text className="text-xs text-red-200 mb-2">{error.message}</Text>
              <TouchableOpacity
                className="py-2 px-3 bg-red-600 rounded items-center"
                onPress={() => startManualListening()}
              >
                <Text className="text-xs font-semibold text-white">Try Again</Text>
              </TouchableOpacity>
            </View>
          )}
        </ScrollView>

        {/* Action Buttons */}
        <View className="flex-row gap-2 px-4 py-3 border-t border-slate-800">
          {isListening ? (
            <TouchableOpacity
              className="flex-1 py-3 px-4 bg-red-500 rounded-lg items-center"
              onPress={stopListening}
            >
              <Text className="text-sm font-semibold text-white">Stop Listening</Text>
            </TouchableOpacity>
          ) : (
            <>
              <TouchableOpacity
                className="flex-1 py-3 px-4 bg-slate-600 rounded-lg items-center"
                onPress={handleClose}
              >
                <Text className="text-sm font-semibold text-white">Close</Text>
              </TouchableOpacity>
              {isIdle && (
                <TouchableOpacity
                  className="flex-1 py-3 px-4 bg-blue-600 rounded-lg items-center"
                  onPress={startManualListening}
                >
                  <Text className="text-sm font-semibold text-white">Start Listening</Text>
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
      style={{
        width: size,
        height: size,
        borderRadius: size / 2,
        backgroundColor: color,
        opacity: animation,
      }}
    />
  );
};

interface MetricRowProps {
  label: string;
  value: string;
  highlight?: boolean;
}

const MetricRow: React.FC<MetricRowProps> = ({ label, value, highlight }) => (
  <View className={`flex-row justify-between py-1.5 border-b border-slate-700 ${highlight ? 'bg-slate-800 rounded px-2' : ''}`}>
    <Text className="text-xs text-slate-400">{label}</Text>
    <Text className={`text-xs ${highlight ? 'text-green-500 font-semibold' : 'text-slate-600'}`}>
      {value}
    </Text>
  </View>
);
