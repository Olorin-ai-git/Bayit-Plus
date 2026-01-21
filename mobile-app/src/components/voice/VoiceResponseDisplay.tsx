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
  StyleSheet,
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
      style={[
        styles.container,
        {
          opacity: fadeAnimation,
        },
      ]}
    >
      <View style={styles.content}>
        {/* Status and Command Type */}
        <View style={styles.header}>
          <View style={[styles.statusBadge, { backgroundColor: statusColor }]}>
            <Text style={styles.statusIcon}>{statusIcon}</Text>
          </View>
          <View style={styles.headerText}>
            <Text style={styles.title}>
              {response.success ? 'Command Recognized' : 'Command Failed'}
            </Text>
            <View style={styles.commandTypeRow}>
              <View
                style={[
                  styles.commandTypeBadge,
                  { backgroundColor: commandTypeColor },
                ]}
              >
                <Text style={styles.commandTypeText}>
                  {response.commandType}
                </Text>
              </View>
              {response.confidence && (
                <Text style={styles.confidenceText}>
                  {(response.confidence * 100).toFixed(0)}% confident
                </Text>
              )}
            </View>
          </View>
          <TouchableOpacity
            onPress={handleDismiss}
            style={styles.closeButton}
          >
            <Text style={styles.closeIcon}>✕</Text>
          </TouchableOpacity>
        </View>

        {/* Response Text */}
        <Text style={styles.responseText}>
          {response.responseText}
        </Text>

        {/* Action Details */}
        {response.action && (
          <View style={styles.actionBox}>
            <Text style={styles.actionLabel}>Action:</Text>
            <Text style={styles.actionText}>{response.action}</Text>
          </View>
        )}

        {/* Action Data */}
        {response.actionData && (
          <View style={styles.dataBox}>
            <Text style={styles.dataLabel}>Details:</Text>
            <View style={styles.dataContent}>
              {Object.entries(response.actionData).map(([key, value]) => (
                <View key={key} style={styles.dataItem}>
                  <Text style={styles.dataKey}>{key}:</Text>
                  <Text style={styles.dataValue}>
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

// ============================================
// Styles
// ============================================

const styles = StyleSheet.create({
  container: {
    backgroundColor: '#1E293B',
    borderRadius: 8,
    marginHorizontal: 16,
    marginVertical: 8,
    borderWidth: 1,
    borderColor: '#334155',
    overflow: 'hidden',
  },
  content: {
    padding: 12,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
    marginBottom: 12,
  },
  statusBadge: {
    width: 28,
    height: 28,
    borderRadius: 14,
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 2,
  },
  statusIcon: {
    fontSize: 16,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  headerText: {
    flex: 1,
  },
  title: {
    fontSize: 14,
    fontWeight: '600',
    color: '#F1F5F9',
    marginBottom: 4,
  },
  commandTypeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  commandTypeBadge: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 4,
  },
  commandTypeText: {
    fontSize: 11,
    fontWeight: '600',
    color: '#FFFFFF',
    textTransform: 'capitalize',
  },
  confidenceText: {
    fontSize: 11,
    color: '#94A3B8',
  },
  closeButton: {
    padding: 4,
  },
  closeIcon: {
    fontSize: 18,
    color: '#64748B',
  },
  responseText: {
    fontSize: 13,
    color: '#E2E8F0',
    lineHeight: 18,
    marginBottom: 12,
  },
  actionBox: {
    backgroundColor: '#0F172A',
    borderRadius: 4,
    padding: 8,
    marginBottom: 8,
    borderLeftWidth: 3,
    borderLeftColor: '#3B82F6',
  },
  actionLabel: {
    fontSize: 11,
    color: '#94A3B8',
    marginBottom: 4,
  },
  actionText: {
    fontSize: 12,
    color: '#F1F5F9',
  },
  dataBox: {
    backgroundColor: '#0F172A',
    borderRadius: 4,
    padding: 8,
    borderLeftWidth: 3,
    borderLeftColor: '#8B5CF6',
  },
  dataLabel: {
    fontSize: 11,
    color: '#94A3B8',
    marginBottom: 6,
  },
  dataContent: {
    gap: 4,
  },
  dataItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  dataKey: {
    fontSize: 11,
    color: '#64748B',
    fontWeight: '500',
  },
  dataValue: {
    fontSize: 11,
    color: '#CBD5E1',
  },
});
