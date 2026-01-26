/**
 * Connection Status Component
 * Shows WebSocket connection state with visual feedback
 * Uses design tokens exclusively - no hardcoded colors
 */

import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { WifiOff, RefreshCw } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { GlassCard, GlassButton } from '@bayit/shared/ui';
import { colors, spacing, fontSize, borderRadius } from '@olorin/design-tokens';

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

  const statusConfig = reconnecting
    ? {
        icon: RefreshCw,
        iconColor: colors.warning.DEFAULT,
        bgColor: `${colors.warning.DEFAULT}1A`, // 10% opacity
        borderColor: colors.warning.DEFAULT,
        title: t('admin.uploads.connectionStatus.reconnecting'),
        message: t('admin.uploads.connectionStatus.reconnectAttempt', {
          current: reconnectAttempt,
          max: maxAttempts,
        }),
        showRefresh: false,
      }
    : {
        icon: WifiOff,
        iconColor: colors.error.DEFAULT,
        bgColor: `${colors.error.DEFAULT}1A`,
        borderColor: colors.error.DEFAULT,
        title: t('admin.uploads.connectionStatus.connectionLost'),
        message: t('admin.uploads.connectionStatus.connectionLostDescription'),
        showRefresh: true,
      };

  const IconComponent = statusConfig.icon;

  return (
    <GlassCard
      style={[
        styles.container,
        {
          backgroundColor: statusConfig.bgColor,
          borderLeftColor: statusConfig.borderColor,
        },
      ]}
    >
      <View style={styles.content}>
        <View
          style={[
            styles.iconContainer,
            { backgroundColor: `${statusConfig.iconColor}20` },
          ]}
        >
          <IconComponent size={24} color={statusConfig.iconColor} />
        </View>

        <View style={styles.textContainer}>
          <Text style={styles.title}>{statusConfig.title}</Text>
          <Text style={styles.message}>{statusConfig.message}</Text>
        </View>

        {statusConfig.showRefresh && onRefresh && (
          <GlassButton
            title={t('admin.uploads.connectionStatus.manualRefresh')}
            variant="secondary"
            size="sm"
            onPress={onRefresh}
            icon={<RefreshCw size={16} color={colors.text} />}
            iconPosition="left"
            accessibilityLabel={t('admin.uploads.connectionStatus.manualRefresh')}
            accessibilityHint={t('admin.uploads.connectionStatus.manualRefreshHint')}
          />
        )}
      </View>

      {/* ARIA live region for screen readers */}
      <View style={styles.srOnly}>
        <Text role="status" aria-live="polite" aria-atomic="true">
          {reconnecting
            ? t('admin.uploads.connectionStatus.reconnectingAnnouncement', {
                attempt: reconnectAttempt,
                maxAttempts,
              })
            : t('admin.uploads.connectionStatus.connectionLostAnnouncement')}
        </Text>
      </View>
    </GlassCard>
  );
};

const styles = StyleSheet.create({
  container: {
    marginBottom: spacing.md,
    borderLeftWidth: 4,
    borderRadius: borderRadius.lg,
  },
  content: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    padding: spacing.md,
  },
  iconContainer: {
    width: 48,
    height: 48,
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
  },
  textContainer: {
    flex: 1,
    gap: spacing.xs,
  },
  title: {
    color: colors.text,
    fontSize: fontSize.md,
    fontWeight: '600',
  },
  message: {
    color: colors.textSecondary,
    fontSize: fontSize.sm,
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
