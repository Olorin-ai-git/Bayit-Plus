/**
 * StreamLimitExceeded - Modal for concurrent stream limit violations
 *
 * Shows active devices and provides option to end another session
 * to free up a streaming slot.
 */

import React, { useCallback } from 'react';
import { View, Text, StyleSheet, FlatList, type ListRenderItemInfo } from 'react-native';
import { useTranslation } from 'react-i18next';
import ReactNativeHapticFeedback from 'react-native-haptic-feedback';
import { useDirection } from '@bayit/shared-hooks';
import { GlassButton } from '@bayit/shared/ui';
import { GlassView } from '@bayit/shared';
import { GlassModal } from '@olorin/glass-ui/native';
import { NativeIcon } from '@olorin/shared-icons/native';
import { colors, spacing, borderRadius, fontSize } from '@olorin/design-tokens';
import { Colors } from '../../theme/colors';
import logger from '@/utils/logger';

const log = logger.scope('StreamLimitExceeded');

export interface ActiveDevice {
  id: string;
  name: string;
  type: string;
  contentTitle: string;
  startedAt: string;
}

interface StreamLimitExceededProps {
  visible: boolean;
  onClose: () => void;
  activeDevices: ActiveDevice[];
  onEndOtherSession: (deviceId: string) => void;
}

const DEVICE_ICON_MAP: Record<string, string> = {
  mobile: 'smartphone',
  tablet: 'tablet',
  tv: 'tv',
  desktop: 'monitor',
  web: 'globe',
};

const formatStartedAt = (ts: string): string => {
  try {
    return new Date(ts).toLocaleTimeString('he-IL', {
      hour: '2-digit',
      minute: '2-digit',
    });
  } catch {
    return '';
  }
};

export const StreamLimitExceeded: React.FC<StreamLimitExceededProps> = ({
  visible,
  onClose,
  activeDevices,
  onEndOtherSession,
}) => {
  const { t } = useTranslation();
  const { isRTL, textAlign } = useDirection();

  const handleEndSession = useCallback((deviceId: string) => {
    ReactNativeHapticFeedback.trigger('impactMedium');
    log.info('Ending other session', { deviceId });
    onEndOtherSession(deviceId);
  }, [onEndOtherSession]);

  const renderDevice = useCallback(({ item }: ListRenderItemInfo<ActiveDevice>) => {
    const iconName = DEVICE_ICON_MAP[item.type] || 'monitor';
    return (
      <GlassView
        style={styles.deviceCard}
        accessible
        accessibilityRole="text"
        accessibilityLabel={`${item.name}, ${t('streamLimit.watching')} ${item.contentTitle}`}
      >
        <View style={[styles.deviceRow, isRTL && styles.deviceRowRTL]}>
          <View style={styles.deviceIcon}>
            <NativeIcon name={iconName} size="md" color={Colors.Primary.p400} />
          </View>
          <View style={styles.deviceInfo}>
            <Text style={[styles.deviceName, { textAlign }]}>{item.name}</Text>
            <Text style={[styles.deviceContent, { textAlign }]} numberOfLines={1}>
              {item.contentTitle}
            </Text>
            <Text style={[styles.deviceTime, { textAlign }]}>
              {t('streamLimit.since', { time: formatStartedAt(item.startedAt) })}
            </Text>
          </View>
          <GlassButton
            variant="secondary"
            size="small"
            onPress={() => handleEndSession(item.id)}
            accessibilityLabel={t('streamLimit.endSession')}
            accessibilityHint={t('streamLimit.endSessionHint', { device: item.name })}
            accessibilityRole="button"
          >
            <Text style={styles.endButtonText}>{t('streamLimit.end')}</Text>
          </GlassButton>
        </View>
      </GlassView>
    );
  }, [isRTL, textAlign, handleEndSession, t]);

  const keyExtractor = useCallback((item: ActiveDevice) => item.id, []);

  return (
    <GlassModal
      visible={visible}
      onClose={onClose}
      size="lg"
      dismissable
    >
      <View style={styles.container}>
        <View style={styles.header}>
          <View style={styles.warningIcon}>
            <NativeIcon name="alertTriangle" size="xl" color={Colors.Warning.default} />
          </View>
          <Text
            style={[styles.title, { textAlign }]}
            accessible
            accessibilityRole="header"
          >
            {t('streamLimit.title')}
          </Text>
          <Text style={[styles.subtitle, { textAlign }]}>
            {t('streamLimit.subtitle')}
          </Text>
        </View>

        <Text style={[styles.devicesLabel, { textAlign }]}>
          {t('streamLimit.activeDevices')}
        </Text>

        <FlatList
          data={activeDevices}
          renderItem={renderDevice}
          keyExtractor={keyExtractor}
          style={styles.deviceList}
          contentContainerStyle={styles.deviceListContent}
          showsVerticalScrollIndicator={false}
          scrollEnabled={activeDevices.length > 3}
        />

        <GlassButton
          variant="ghost"
          onPress={onClose}
          style={styles.closeButton}
          accessibilityLabel={t('common.close')}
          accessibilityRole="button"
        >
          <Text style={styles.closeText}>{t('common.close')}</Text>
        </GlassButton>
      </View>
    </GlassModal>
  );
};

const styles = StyleSheet.create({
  container: { paddingVertical: spacing.md },
  header: { alignItems: 'center', marginBottom: spacing.lg },
  warningIcon: {
    width: 64, height: 64, borderRadius: borderRadius.full,
    backgroundColor: 'rgba(245, 158, 11, 0.15)', justifyContent: 'center',
    alignItems: 'center', marginBottom: spacing.md,
  },
  title: { fontSize: 20, fontWeight: '700', color: colors.text, marginBottom: spacing.xs },
  subtitle: { fontSize: fontSize.sm, color: colors.textSecondary, textAlign: 'center', lineHeight: 20 },
  devicesLabel: {
    fontSize: fontSize.xs, fontWeight: '600', color: Colors.Primary.p400,
    textTransform: 'uppercase', letterSpacing: 0.6, marginBottom: spacing.sm,
  },
  deviceList: { maxHeight: 280 },
  deviceListContent: { gap: spacing.sm },
  deviceCard: { borderRadius: borderRadius.md, padding: spacing.md },
  deviceRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  deviceRowRTL: { flexDirection: 'row-reverse' },
  deviceIcon: {
    width: 40, height: 40, borderRadius: borderRadius.md,
    backgroundColor: Colors.Glass.purpleLight, justifyContent: 'center', alignItems: 'center',
  },
  deviceInfo: { flex: 1 },
  deviceName: { fontSize: fontSize.md, fontWeight: '600', color: colors.text },
  deviceContent: { fontSize: fontSize.sm, color: colors.textSecondary, marginTop: 1 },
  deviceTime: { fontSize: fontSize.xs, color: Colors.Text.muted, marginTop: 2 },
  endButtonText: { fontSize: fontSize.xs, fontWeight: '600', color: Colors.Error.default },
  closeButton: { marginTop: spacing.md, minHeight: 44, paddingVertical: spacing.sm },
  closeText: { fontSize: fontSize.md, fontWeight: '500', color: colors.textSecondary, textAlign: 'center' },
});
