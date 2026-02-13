/**
 * DevicesManagerScreen - Device management
 *
 * Features:
 * - List all connected devices
 * - Show device type, OS, and last active time
 * - Disconnect devices (except current)
 * - Confirmation modal for disconnection
 */

import React, { useEffect, useState } from 'react';
import { View, Text, ScrollView, Pressable, StyleSheet, ActivityIndicator } from 'react-native';
import { useTranslation } from 'react-i18next';
import { Monitor, Smartphone, Tablet, Tv, CheckCircle } from 'lucide-react-native';
import { TVHeader } from '../components/TVHeader';
import { ConfirmModal } from '../components/profile/ConfirmModal';
import { useDevicesStore } from '../stores/devicesStore';
import { config } from '../config/appConfig';

export const DevicesManagerScreen: React.FC<{ navigation: any }> = ({ navigation }) => {
  const { t } = useTranslation();
  const [focusedDevice, setFocusedDevice] = useState<string | null>(null);
  const [selectedDevice, setSelectedDevice] = useState<string | null>(null);
  const [showConfirmModal, setShowConfirmModal] = useState(false);

  const {
    devices,
    isLoading,
    isDisconnecting,
    error,
    successMessage,
    loadDevices,
    disconnectDevice,
    clearMessages,
  } = useDevicesStore();

  useEffect(() => {
    loadDevices();
  }, [loadDevices]);

  const getDeviceIcon = (deviceType: string) => {
    switch (deviceType) {
      case 'mobile':
        return Smartphone;
      case 'tablet':
        return Tablet;
      case 'tv':
        return Tv;
      case 'desktop':
      default:
        return Monitor;
    }
  };

  const formatLastActive = (lastActive: string) => {
    const date = new Date(lastActive);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMins / 60);
    const diffDays = Math.floor(diffHours / 24);

    if (diffMins < 1) {
      return t('tvos.devices.justNow', 'Just now');
    } else if (diffMins < 60) {
      return t('tvos.devices.minsAgo', '{{count}} mins ago', { count: diffMins });
    } else if (diffHours < 24) {
      return t('tvos.devices.hoursAgo', '{{count}} hours ago', { count: diffHours });
    } else if (diffDays === 1) {
      return t('tvos.devices.yesterday', 'Yesterday');
    } else {
      return t('tvos.devices.daysAgo', '{{count}} days ago', { count: diffDays });
    }
  };

  const handleDisconnectPress = (deviceId: string) => {
    setSelectedDevice(deviceId);
    setShowConfirmModal(true);
  };

  const handleConfirmDisconnect = async () => {
    if (selectedDevice) {
      setShowConfirmModal(false);
      await disconnectDevice(selectedDevice);
      setSelectedDevice(null);
    }
  };

  const handleCancelDisconnect = () => {
    setShowConfirmModal(false);
    setSelectedDevice(null);
  };

  if (isLoading) {
    return (
      <View style={styles.container}>
        <TVHeader currentScreen="profile" navigation={navigation} />
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#A855F7" />
          <Text style={styles.loadingText}>{t('common.loading', 'Loading...')}</Text>
        </View>
      </View>
    );
  }

  if (error) {
    return (
      <View style={styles.container}>
        <TVHeader currentScreen="profile" navigation={navigation} />
        <View style={styles.errorContainer}>
          <Text style={styles.errorText}>{error}</Text>
          <Text style={styles.errorHint}>{t('common.retry', 'Please try again')}</Text>
        </View>
      </View>
    );
  }

  if (devices.length === 0) {
    return (
      <View style={styles.container}>
        <TVHeader currentScreen="profile" navigation={navigation} />
        <View style={styles.emptyContainer}>
          <Monitor size={64} color="rgba(255,255,255,0.3)" />
          <Text style={styles.emptyText}>
            {t('tvos.devices.noDevices', 'No connected devices')}
          </Text>
        </View>
      </View>
    );
  }

  const selectedDeviceData = devices.find(d => d.device_id === selectedDevice);

  return (
    <View style={styles.container}>
      <TVHeader currentScreen="profile" navigation={navigation} />

      <ScrollView style={styles.content} contentContainerStyle={styles.contentInner}>
        <Text style={styles.screenTitle}>
          {t('tvos.profile.devicesManager', 'Connected Devices')}
        </Text>

        {successMessage && (
          <View style={styles.successBanner}>
            <CheckCircle size={24} color="#10B981" />
            <Text style={styles.successText}>{successMessage}</Text>
          </View>
        )}

        <View style={styles.devicesList}>
          {devices.map((device, index) => {
            const DeviceIcon = getDeviceIcon(device.device_type);
            const isFocused = focusedDevice === device.device_id;
            const isDisconnectingThis = isDisconnecting === device.device_id;

            return (
              <View key={device.device_id} style={styles.deviceWrapper}>
                <Pressable
                  onFocus={() => setFocusedDevice(device.device_id)}
                  hasTVPreferredFocus={index === 0}
                  style={styles.devicePressable}
                  disabled={true}
                >
                  <View style={[styles.deviceCard, isFocused && styles.deviceCardFocused]}>
                    <View style={styles.deviceIconContainer}>
                      <DeviceIcon size={32} color="#A855F7" />
                    </View>
                    <View style={styles.deviceInfo}>
                      <Text style={styles.deviceName}>{device.device_name}</Text>
                      <Text style={styles.deviceMeta}>
                        {device.os} • {formatLastActive(device.last_active)}
                      </Text>
                      {device.is_current && (
                        <View style={styles.currentBadge}>
                          <Text style={styles.currentBadgeText}>
                            {t('tvos.devices.currentDevice', 'Current Device')}
                          </Text>
                        </View>
                      )}
                    </View>
                    {!device.is_current && (
                      <Pressable
                        onPress={() => handleDisconnectPress(device.device_id)}
                        disabled={isDisconnectingThis}
                        style={styles.disconnectButtonWrapper}
                      >
                        <View style={[
                          styles.disconnectButton,
                          isFocused && styles.disconnectButtonFocused,
                        ]}>
                          {isDisconnectingThis ? (
                            <ActivityIndicator color="#ffffff" size="small" />
                          ) : (
                            <Text style={styles.disconnectText}>
                              {t('tvos.devices.disconnect', 'Disconnect')}
                            </Text>
                          )}
                        </View>
                      </Pressable>
                    )}
                  </View>
                </Pressable>
              </View>
            );
          })}
        </View>
      </ScrollView>

      <ConfirmModal
        visible={showConfirmModal}
        title={t('tvos.devices.disconnectConfirmTitle', 'Disconnect Device?')}
        message={t('tvos.devices.disconnectConfirmMessage',
          `Are you sure you want to disconnect "${selectedDeviceData?.device_name}"? You'll need to sign in again on that device.`
        )}
        confirmLabel={t('tvos.devices.disconnectConfirm', 'Disconnect')}
        cancelLabel={t('common.cancel', 'Cancel')}
        onConfirm={handleConfirmDisconnect}
        onCancel={handleCancelDisconnect}
        type="destructive"
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000000',
  },
  content: {
    flex: 1,
  },
  contentInner: {
    paddingHorizontal: config.tv.safeZoneMarginPt,
    paddingBottom: config.tv.safeZoneMarginPt,
  },
  screenTitle: {
    fontSize: 48,
    fontWeight: '700',
    color: '#ffffff',
    marginTop: 24,
    marginBottom: 24,
  },
  successBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    backgroundColor: 'rgba(16,185,129,0.2)',
    borderRadius: 12,
    padding: 16,
    marginBottom: 24,
    borderWidth: 2,
    borderColor: '#10B981',
  },
  successText: {
    fontSize: 24,
    fontWeight: '600',
    color: '#10B981',
  },
  devicesList: {
    gap: 16,
  },
  deviceWrapper: {
    width: '100%',
  },
  devicePressable: {
    width: '100%',
  },
  deviceCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 20,
    backgroundColor: 'rgba(20,20,35,0.85)',
    borderRadius: 16,
    padding: 20,
    borderWidth: 2,
    borderColor: 'rgba(255,255,255,0.1)',
  },
  deviceCardFocused: {
    borderColor: '#A855F7',
    borderWidth: config.tv.focusBorderWidth,
    transform: [{ scale: 1.02 }],
  },
  deviceIconContainer: {
    width: 60,
    height: 60,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(168,85,247,0.2)',
    borderRadius: 12,
  },
  deviceInfo: {
    flex: 1,
    gap: 6,
  },
  deviceName: {
    fontSize: config.tv.minBodyTextSizePt,
    fontWeight: '700',
    color: '#ffffff',
  },
  deviceMeta: {
    fontSize: 22,
    fontWeight: '400',
    color: 'rgba(255,255,255,0.6)',
  },
  currentBadge: {
    alignSelf: 'flex-start',
    backgroundColor: '#A855F7',
    paddingVertical: 4,
    paddingHorizontal: 12,
    borderRadius: 6,
    marginTop: 4,
  },
  currentBadgeText: {
    fontSize: 18,
    fontWeight: '700',
    color: '#ffffff',
  },
  disconnectButtonWrapper: {
    marginLeft: 'auto',
  },
  disconnectButton: {
    backgroundColor: '#EF4444',
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 10,
    minWidth: 140,
    alignItems: 'center',
  },
  disconnectButtonFocused: {
    backgroundColor: '#DC2626',
  },
  disconnectText: {
    fontSize: 22,
    fontWeight: '700',
    color: '#ffffff',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    gap: 16,
  },
  loadingText: {
    fontSize: config.tv.minBodyTextSizePt,
    color: 'rgba(255,255,255,0.7)',
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    gap: 12,
    paddingHorizontal: config.tv.safeZoneMarginPt,
  },
  errorText: {
    fontSize: 28,
    fontWeight: '600',
    color: '#EF4444',
    textAlign: 'center',
  },
  errorHint: {
    fontSize: 24,
    color: 'rgba(255,255,255,0.6)',
    textAlign: 'center',
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    gap: 16,
  },
  emptyText: {
    fontSize: 28,
    fontWeight: '600',
    color: 'rgba(255,255,255,0.5)',
  },
});
