/**
 * Connection Status Component
 * Shows WebSocket connection state with visual feedback
 */

import React from 'react';
import { View, Text, StyleSheet, Pressable } from 'react-native';
import { Wifi, WifiOff, RefreshCw, AlertCircle } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { GlassCard, GlassButton } from '@bayit/shared/ui';
import { spacing } from '@olorin/design-tokens';

interface ConnectionStatusProps {
  connected: boolean;
  reconnecting: boolean;
  reconnectAttempt?: number;
  maxAttempts?: number;
  onRefresh?: () => void;
}

export const ConnectionStatus: React.FC<ConnectionStatusProps> = ({
  connected,
  reconnecting,
  reconnectAttempt = 0,
  maxAttempts = 10,
  onRefresh,
}) => {
  const { t } = useTranslation();

  // Don't show anything when connected
  if (connected && !reconnecting) {
    return null;
  }

  const getStatusConfig = () => {
    if (reconnecting) {
      return {
        icon: RefreshCw,
        iconColor: '#FFA500',
        title: t('admin.uploads.connectionStatus.reconnecting'),
        message: t('admin.uploads.connectionStatus.reconnectAttempt', {
          current: reconnectAttempt,
          max: maxAttempts,
        }),
        showRefresh: false,
      };
    }

    return {
      icon: WifiOff,
      iconColor: '#FF6B6B',
      title: t('admin.uploads.connectionStatus.connectionLost'),
      message: t('admin.uploads.connectionStatus.connectionLostDescription'),
      showRefresh: true,
    };
  };

  const config = getStatusConfig();
  const IconComponent = config.icon;

  return (
    <GlassCard style={styles.container}>
      <View style={styles.content}>
        <View style={styles.iconContainer}>
          <IconComponent
            size={24}
            color={config.iconColor}
            style={reconnecting ? styles.spinningIcon : undefined}
          />
        </View>

        <View style={styles.textContainer}>
          <Text style={styles.title}>{config.title}</Text>
          <Text style={styles.message}>{config.message}</Text>
        </View>

        {config.showRefresh && onRefresh && (
          <GlassButton
            variant="secondary"
            size="small"
            onPress={onRefresh}
            accessibilityLabel={t('admin.uploads.connectionStatus.manualRefresh')}
            accessibilityHint={t('admin.uploads.connectionStatus.manualRefreshHint')}
          >
            <RefreshCw size={16} color="#fff" />
            <Text style={styles.refreshText}>
              {t('admin.uploads.connectionStatus.manualRefresh')}
            </Text>
          </GlassButton>
        )}
      </View>

      {/* ARIA live region for screen readers */}
      <View style={styles.srOnly}>
        <Text
          role="status"
          aria-live="polite"
          aria-atomic="true"
        >
          {reconnecting
            ? t('admin.uploads.connectionStatus.reconnectingAnnouncement', {
                attempt: reconnectAttempt,
                maxAttempts,
              })
            : t('admin.uploads.connectionStatus.connectionLostAnnouncement')
          }
        </Text>
      </View>
    </GlassCard>
  );
};

const styles = StyleSheet.create({
  container: {
    marginBottom: spacing.md,
    backgroundColor: 'rgba(255, 107, 107, 0.1)',
    borderLeftWidth: 4,
    borderLeftColor: '#FF6B6B',
  },
  content: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    padding: spacing.md,
  },
  iconContainer: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(0, 0, 0, 0.3)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  textContainer: {
    flex: 1,
    gap: spacing.xs,
  },
  title: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  message: {
    color: 'rgba(255, 255, 255, 0.7)',
    fontSize: 14,
  },
  refreshText: {
    color: '#fff',
    fontSize: 14,
    marginLeft: spacing.xs,
  },
  spinningIcon: {
    // Animation handled by parent
  },
  srOnly: {
    position: 'absolute',
    width: 1,
    height: 1,
    margin: -1,
    padding: 0,
    overflow: 'hidden',
  },
});
