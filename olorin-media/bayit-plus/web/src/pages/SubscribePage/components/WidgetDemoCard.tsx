/**
 * Widget Demo Card
 * Interactive Kan11 widget preview using WidgetContainer
 */

import React, { useState, useEffect, useRef } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { useTranslation } from 'react-i18next';
import { colors, spacing, borderRadius } from '@olorin/design-tokens';
import { sanitizeI18n } from '@/utils/security/sanitizeI18n';
import WidgetContainer from '@/components/widgets/WidgetContainer';
import type { Widget, WidgetPosition } from '@/types/widget';

interface WidgetDemoCardProps {
  title: string;
  description: string;
  channelId?: string;
  autoMute?: boolean;
}

const INACTIVITY_TIMEOUT = 30000; // 30 seconds

export const WidgetDemoCard: React.FC<WidgetDemoCardProps> = ({
  title,
  description,
  channelId = 'channel-kan11',
  autoMute = true,
}) => {
  const { t } = useTranslation();
  const [isMuted, setIsMuted] = useState(autoMute);
  const [isMinimized, setIsMinimized] = useState(false);
  const [position, setPosition] = useState<WidgetPosition>({
    x: 20,
    y: 20,
    width: 400,
    height: 280,
    zIndex: 100,
  });
  const inactivityTimerRef = useRef<NodeJS.Timeout | null>(null);

  const demoWidget: Widget = {
    id: 'premium-showcase-kan11',
    type: 'system',
    title: 'כאן 11',
    content: {
      content_type: 'live_channel',
      live_channel_id: channelId,
    },
    position: {
      ...position,
      z_index: position.zIndex,
    },
    is_active: true,
    is_muted: isMuted,
    is_visible: true,
    is_minimized: isMinimized,
    is_closable: false,
    is_draggable: true,
    visible_to_roles: [],
    visible_to_subscription_tiers: ['premium', 'family'],
    target_pages: ['/subscribe'],
    order: 0,
  };

  const resetInactivityTimer = () => {
    if (inactivityTimerRef.current) {
      clearTimeout(inactivityTimerRef.current);
    }
    inactivityTimerRef.current = setTimeout(() => {
      setIsMinimized(true);
    }, INACTIVITY_TIMEOUT);
  };

  useEffect(() => {
    resetInactivityTimer();
    return () => {
      if (inactivityTimerRef.current) {
        clearTimeout(inactivityTimerRef.current);
      }
    };
  }, []);

  const handlePositionChange = (newPosition: Partial<WidgetPosition>) => {
    setPosition((prev) => ({ ...prev, ...newPosition }));
    resetInactivityTimer();
  };

  const handleToggleMute = () => {
    setIsMuted(!isMuted);
    resetInactivityTimer();
  };

  const handleToggleMinimize = () => {
    setIsMinimized(!isMinimized);
    resetInactivityTimer();
  };

  const handleClose = () => {
    // Do nothing - demo widget shouldn't close
  };

  return (
    <View style={styles.container}>
      <View style={styles.demoContainer}>
        <WidgetContainer
          widget={demoWidget}
          isMuted={isMuted}
          isMinimized={isMinimized}
          position={position}
          onToggleMute={handleToggleMute}
          onClose={handleClose}
          onToggleMinimize={handleToggleMinimize}
          onPositionChange={handlePositionChange}
        />
        <View style={styles.badge}>
          <Text style={styles.badgeText}>
            {sanitizeI18n(t('subscribe.premiumShowcase.badges.interactiveDemo'))}
          </Text>
        </View>
      </View>
      <View style={styles.textContainer}>
        <Text style={styles.title}>{sanitizeI18n(title)}</Text>
        <Text style={styles.description}>{sanitizeI18n(description)}</Text>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    minWidth: 300,
  },
  demoContainer: {
    position: 'relative',
    height: 300,
    borderRadius: borderRadius.lg,
    backgroundColor: 'rgba(20, 20, 35, 0.9)',
    overflow: 'hidden',
    marginBottom: spacing.md,
  },
  badge: {
    position: 'absolute',
    top: spacing.md,
    right: spacing.md,
    backgroundColor: 'rgba(34, 197, 94, 0.9)',
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    borderRadius: borderRadius.sm,
    zIndex: 200,
  },
  badgeText: {
    fontSize: 10,
    fontWeight: '700',
    color: '#FFFFFF',
    letterSpacing: 1,
  },
  textContainer: {
    paddingHorizontal: spacing.sm,
  },
  title: {
    fontSize: 20,
    fontWeight: '700',
    color: '#FFFFFF',
    marginBottom: spacing.xs,
  },
  description: {
    fontSize: 14,
    color: 'rgba(255, 255, 255, 0.7)',
    lineHeight: 20,
  },
});
