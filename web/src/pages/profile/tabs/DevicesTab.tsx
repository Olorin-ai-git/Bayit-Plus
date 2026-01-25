import { useState, useEffect } from 'react';
import { View, Text, Pressable, StyleSheet, ActivityIndicator } from 'react-native';
import { useTranslation } from 'react-i18next';
import { Smartphone, Monitor, Tv, Tablet, Trash2, AlertCircle } from 'lucide-react';
import { GlassView, GlassModal } from '@bayit/shared/ui';
import { useDevicesStore } from '@/stores/devicesStore';
import { colors, spacing } from '@olorin/design-tokens';

interface DevicesTabProps {
  isRTL: boolean;
}

export function DevicesTab({ isRTL }: DevicesTabProps) {
  const { t } = useTranslation();
  const { devices, loading, disconnecting, error, loadDevices, disconnectDevice } = useDevicesStore();

  const [confirmModalVisible, setConfirmModalVisible] = useState(false);
  const [deviceToDisconnect, setDeviceToDisconnect] = useState<string | null>(null);
  const [successModalVisible, setSuccessModalVisible] = useState(false);
  const [terminatedSessions, setTerminatedSessions] = useState(0);

  useEffect(() => {
    loadDevices();
  }, []);

  const handleDisconnectPress = (deviceId: string) => {
    setDeviceToDisconnect(deviceId);
    setConfirmModalVisible(true);
  };

  const handleConfirmDisconnect = async () => {
    if (!deviceToDisconnect) return;

    setConfirmModalVisible(false);

    try {
      const result = await disconnectDevice(deviceToDisconnect);
      setTerminatedSessions(result.terminated_sessions);
      setSuccessModalVisible(true);
      setDeviceToDisconnect(null);
    } catch (error) {
      // Error is handled by store
      setDeviceToDisconnect(null);
    }
  };

  const getDeviceIcon = (deviceType: string) => {
    switch (deviceType.toLowerCase()) {
      case 'mobile':
        return Smartphone;
      case 'desktop':
        return Monitor;
      case 'tv':
        return Tv;
      case 'tablet':
        return Tablet;
      default:
        return Monitor;
    }
  };

  const formatLastActive = (lastActive: string) => {
    const now = new Date();
    const lastActiveDate = new Date(lastActive);
    const diffMs = now.getTime() - lastActiveDate.getTime();
    const diffMins = Math.floor(diffMs / 60000);

    if (diffMins < 1) {
      return t('devices.activeNow', 'Active now');
    } else if (diffMins < 60) {
      return t('devices.minutesAgo', '{{count}} minutes ago', { count: diffMins });
    } else if (diffMins < 1440) {
      const hours = Math.floor(diffMins / 60);
      return t('devices.hoursAgo', '{{count}} hours ago', { count: hours });
    } else {
      const days = Math.floor(diffMins / 1440);
      return t('devices.daysAgo', '{{count}} days ago', { count: days });
    }
  };

  const currentDeviceId = localStorage.getItem('current_device_id');

  if (loading && devices.length === 0) {
    return (
      <View style={styles.centerContainer}>
        <ActivityIndicator size="large" color={colors.primary.DEFAULT} />
        <Text style={styles.loadingText}>{t('devices.loading', 'Loading devices...')}</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <GlassView style={styles.headerSection}>
        <Text style={[styles.sectionTitle, isRTL ? styles.textRight : styles.textLeft]}>
          {t('devices.registeredDevices', 'Registered Devices')}
        </Text>
        <Text style={[styles.sectionDescription, isRTL ? styles.textRight : styles.textLeft]}>
          {t(
            'devices.description',
            'Manage devices that have access to your account. You can disconnect devices to free up stream slots.'
          )}
        </Text>
      </GlassView>

      {error && (
        <GlassView style={styles.errorSection}>
          <View style={styles.errorRow}>
            <AlertCircle size={20} color={colors.error.DEFAULT} />
            <Text style={styles.errorText}>{error}</Text>
          </View>
        </GlassView>
      )}

      {devices.length === 0 ? (
        <GlassView style={styles.emptySection}>
          <Monitor size={48} color="rgba(255,255,255,0.3)" />
          <Text style={styles.emptyTitle}>{t('devices.noDevices', 'No devices connected')}</Text>
          <Text style={styles.emptyDescription}>
            {t('devices.noDevicesDescription', 'Devices will appear here when you log in on different platforms')}
          </Text>
        </GlassView>
      ) : (
        <View style={styles.devicesList}>
          {devices.map((device) => {
            const DeviceIcon = getDeviceIcon(device.device_type);
            const isCurrentDevice = device.device_id === currentDeviceId;
            const isDisconnecting = disconnecting === device.device_id;

            return (
              <GlassView key={device.device_id} style={styles.deviceCard}>
                <View style={[styles.deviceHeader, isRTL && styles.deviceHeaderRTL]}>
                  <View style={[styles.deviceInfo, isRTL && styles.deviceInfoRTL]}>
                    <View style={styles.deviceIconContainer}>
                      <DeviceIcon size={24} color="rgba(255,255,255,0.8)" />
                    </View>
                    <View style={[styles.deviceDetails, isRTL && styles.deviceDetailsRTL]}>
                      <View style={[styles.deviceNameRow, isRTL && styles.deviceNameRowRTL]}>
                        <Text style={[styles.deviceName, isRTL ? styles.textRight : styles.textLeft]}>
                          {device.device_name}
                        </Text>
                        {isCurrentDevice && (
                          <View style={styles.currentBadge}>
                            <Text style={styles.currentBadgeText}>{t('devices.thisDevice', 'This device')}</Text>
                          </View>
                        )}
                      </View>
                      <Text style={[styles.deviceMeta, isRTL ? styles.textRight : styles.textLeft]}>
                        {device.browser && device.os
                          ? `${device.browser} • ${device.os}`
                          : device.platform || device.device_type}
                      </Text>
                      <Text style={[styles.deviceLastActive, isRTL ? styles.textRight : styles.textLeft]}>
                        {formatLastActive(device.last_active)}
                      </Text>
                    </View>
                  </View>

                  <Pressable
                    onPress={() => handleDisconnectPress(device.device_id)}
                    style={[styles.disconnectButton, isDisconnecting && styles.disconnectButtonDisabled]}
                    disabled={isDisconnecting}
                  >
                    {isDisconnecting ? (
                      <ActivityIndicator size="small" color={colors.error.DEFAULT} />
                    ) : (
                      <Trash2 size={20} color={colors.error.DEFAULT} />
                    )}
                  </Pressable>
                </View>
              </GlassView>
            );
          })}
        </View>
      )}

      {/* Disconnect Confirmation Modal */}
      <GlassModal
        visible={confirmModalVisible}
        type="warning"
        title={t('devices.confirmDisconnect', 'Disconnect Device?')}
        message={t(
          'devices.confirmDisconnectMessage',
          'This will end all active playback sessions on this device and remove it from your account.'
        )}
        onClose={() => setConfirmModalVisible(false)}
        buttons={[
          {
            text: t('common.cancel', 'Cancel'),
            style: 'cancel',
            onPress: () => setConfirmModalVisible(false),
          },
          {
            text: t('devices.disconnect', 'Disconnect'),
            style: 'destructive',
            onPress: handleConfirmDisconnect,
          },
        ]}
      />

      {/* Success Modal */}
      <GlassModal
        visible={successModalVisible}
        type="success"
        title={t('devices.disconnectSuccess', 'Device Disconnected')}
        message={
          terminatedSessions > 0
            ? t('devices.disconnectSuccessWithSessions', 'Device disconnected and {{count}} active session(s) ended.', {
                count: terminatedSessions,
              })
            : t('devices.disconnectSuccessMessage', 'Device has been successfully disconnected.')
        }
        onClose={() => setSuccessModalVisible(false)}
        buttons={[{ text: t('common.ok', 'OK'), style: 'default' }]}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    gap: spacing.lg,
  },
  centerContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: spacing.xl,
    gap: spacing.md,
  },
  loadingText: {
    fontSize: 14,
    color: 'rgba(255, 255, 255, 0.6)',
  },
  headerSection: {
    padding: spacing.lg,
    gap: spacing.sm,
  },
  sectionTitle: {
    fontSize: 13,
    fontWeight: '600',
    color: 'rgba(255, 255, 255, 0.6)',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  sectionDescription: {
    fontSize: 14,
    color: 'rgba(255, 255, 255, 0.5)',
    lineHeight: 20,
  },
  errorSection: {
    padding: spacing.md,
    borderWidth: 1,
    borderColor: 'rgba(239, 68, 68, 0.3)',
  },
  errorRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  errorText: {
    fontSize: 14,
    color: colors.error.DEFAULT,
    flex: 1,
  },
  emptySection: {
    padding: spacing.xl * 2,
    alignItems: 'center',
    gap: spacing.md,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: 'rgba(255, 255, 255, 0.8)',
    textAlign: 'center',
  },
  emptyDescription: {
    fontSize: 14,
    color: 'rgba(255, 255, 255, 0.5)',
    textAlign: 'center',
    maxWidth: 300,
  },
  devicesList: {
    gap: spacing.md,
  },
  deviceCard: {
    padding: spacing.lg,
  },
  deviceHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  deviceHeaderRTL: {
    flexDirection: 'row-reverse',
  },
  deviceInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    gap: spacing.md,
  },
  deviceInfoRTL: {
    flexDirection: 'row-reverse',
  },
  deviceIconContainer: {
    width: 48,
    height: 48,
    borderRadius: 12,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  deviceDetails: {
    flex: 1,
    gap: 4,
  },
  deviceDetailsRTL: {
    alignItems: 'flex-end',
  },
  deviceNameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  deviceNameRowRTL: {
    flexDirection: 'row-reverse',
  },
  deviceName: {
    fontSize: 16,
    fontWeight: '600',
    color: 'rgba(255, 255, 255, 0.9)',
  },
  currentBadge: {
    paddingHorizontal: spacing.sm,
    paddingVertical: 2,
    borderRadius: 4,
    backgroundColor: 'rgba(34, 197, 94, 0.2)',
  },
  currentBadgeText: {
    fontSize: 11,
    fontWeight: '600',
    color: '#22C55E',
  },
  deviceMeta: {
    fontSize: 13,
    color: 'rgba(255, 255, 255, 0.6)',
  },
  deviceLastActive: {
    fontSize: 12,
    color: 'rgba(255, 255, 255, 0.5)',
  },
  disconnectButton: {
    width: 40,
    height: 40,
    borderRadius: 8,
    backgroundColor: 'rgba(239, 68, 68, 0.15)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  disconnectButtonDisabled: {
    opacity: 0.5,
  },
  textLeft: {
    textAlign: 'left',
  },
  textRight: {
    textAlign: 'right',
  },
});
