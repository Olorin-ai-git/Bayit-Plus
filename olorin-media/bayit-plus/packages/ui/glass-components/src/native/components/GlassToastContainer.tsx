/**
 * GlassToastContainer
 * Container component that manages and renders multiple toast notifications
 */

import React, { useEffect } from 'react';
import { View, Platform, StyleSheet } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useNotificationStore } from '../../stores/notificationStore';
import { GlassToast } from './GlassToast';
import { spacing } from '../../theme';
import type { GlassToastContainerProps } from './GlassToast/types';

export const GlassToastContainer: React.FC<GlassToastContainerProps> = ({
  position = 'bottom',
  maxVisible = 3,
}) => {
  const insets = useSafeAreaInsets();
  const {
    notifications,
    remove: removeNotification,
    setProviderMounted,
  } = useNotificationStore();

  useEffect(() => {
    setProviderMounted(true);
    return () => setProviderMounted(false);
  }, []);

  const visibleNotifications = notifications.slice(0, maxVisible);

  if (visibleNotifications.length === 0) {
    return null;
  }

  const containerStyle = [
    styles.container,
    position === 'top'
      ? { top: insets.top + spacing.md }
      : { bottom: insets.bottom + spacing.md },
    // Handle Dynamic Island on iPhone 14 Pro+
    Platform.OS === 'ios' && insets.top > 50 && position === 'top'
      ? { paddingTop: spacing.sm }
      : {},
  ];

  return (
    <View style={containerStyle} pointerEvents="box-none">
      {visibleNotifications.map((notification) => (
        <GlassToast
          key={notification.id}
          notification={notification}
          position={position}
          onDismiss={removeNotification}
        />
      ))}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    left: spacing.md,
    right: spacing.md,
    zIndex: 9999,
  },
});

export default GlassToastContainer;
