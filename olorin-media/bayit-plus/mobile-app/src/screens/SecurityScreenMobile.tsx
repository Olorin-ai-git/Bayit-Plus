/**
 * SecurityScreenMobile - Mobile-optimized security settings
 *
 * Features:
 * - Password management
 * - Two-factor authentication
 * - Connected devices management
 * - Login history
 * - Biometric authentication settings
 * - RTL support
 * - Haptic feedback
 */

import React, { useEffect, useState, useCallback } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  RefreshControl,
  ActivityIndicator,
  SafeAreaView,
  Switch,
  Platform,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { useTranslation } from 'react-i18next';
import ReactNativeHapticFeedback from 'react-native-haptic-feedback';
import * as BiometricAuth from '../utils/biometricAuth';
import { GlassView, GlassButton } from '@bayit/shared';
import { useDirection } from '@bayit/shared-hooks';
import { useAuthStore } from '@bayit/shared-stores';
import { useNotifications } from '@olorin/glass-ui/hooks';
import { securityService } from '@bayit/shared-services';
import { spacing, colors, borderRadius } from '@olorin/design-tokens';

import logger from '@/utils/logger';


const moduleLogger = logger.scope('SecurityScreenMobile');

interface ConnectedDevice {
  id: string;
  name: string;
  type: string;
  lastActive: string;
  isCurrent: boolean;
}

interface LoginHistory {
  id: string;
  device: string;
  location: string;
  timestamp: string;
  success: boolean;
}

export const SecurityScreenMobile: React.FC = () => {
  const { t } = useTranslation();
  const navigation = useNavigation<any>();
  const { isRTL, textAlign } = useDirection();
  const { user } = useAuthStore();
  const notifications = useNotifications();

  const [isLoading, setIsLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [devices, setDevices] = useState<ConnectedDevice[]>([]);
  const [loginHistory, setLoginHistory] = useState<LoginHistory[]>([]);
  const [twoFactorEnabled, setTwoFactorEnabled] = useState(false);
  const [biometricEnabled, setBiometricEnabled] = useState(false);
  const [biometricAvailable, setBiometricAvailable] = useState(false);

  const loadSecurityData = useCallback(async () => {
    try {
      setIsLoading(true);

      // Check biometric availability
      const compatible = await BiometricAuth.hasHardwareAsync();
      const enrolled = await BiometricAuth.isEnrolledAsync();
      setBiometricAvailable(compatible && enrolled);

      // Load security settings
      const [devicesRes, historyRes, settingsRes] = await Promise.all([
        securityService.getConnectedDevices(),
        securityService.getLoginHistory(),
        securityService.getSecuritySettings(),
      ]) as [any, any, any];

      setDevices(devicesRes?.devices || []);
      setLoginHistory(historyRes?.history || []);
      setTwoFactorEnabled(settingsRes?.two_factor_enabled || false);
      setBiometricEnabled(settingsRes?.biometric_enabled || false);
    } catch (error) {
      moduleLogger.error('Failed to load security data:', error);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    loadSecurityData();
  }, [loadSecurityData]);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    ReactNativeHapticFeedback.trigger('impactLight');
    await loadSecurityData();
    setRefreshing(false);
  }, [loadSecurityData]);

  const handleChangePassword = useCallback(() => {
    ReactNativeHapticFeedback.trigger('impactMedium');
    navigation.navigate('ChangePassword');
  }, [navigation]);

  const handleToggleTwoFactor = useCallback(async (value: boolean) => {
    ReactNativeHapticFeedback.trigger('impactMedium');

    if (value) {
      // Enable 2FA - navigate to setup
      navigation.navigate('TwoFactorSetup');
    } else {
      // Disable 2FA - confirm first
      notifications.show({
        level: 'warning',
        title: t('security.disable2FATitle'),
        message: t('security.disable2FAMessage'),
        dismissable: true,
        action: {
          label: t('security.disable'),
          type: 'action',
          onPress: async () => {
            try {
              await securityService.disableTwoFactor();
              setTwoFactorEnabled(false);
              ReactNativeHapticFeedback.trigger('notificationSuccess');
            } catch (error) {
              moduleLogger.error('Failed to disable 2FA:', error);
              notifications.showError(t('security.disable2FAError'), t('common.error'));
            }
          },
        },
      });
    }
  }, [navigation, t]);

  const handleToggleBiometric = useCallback(async (value: boolean) => {
    ReactNativeHapticFeedback.trigger('impactMedium');

    if (value) {
      // Verify biometric before enabling
      const result = await BiometricAuth.authenticateAsync({
        promptMessage: t('security.verifyBiometric'),
        fallbackLabel: t('security.usePassword'),
      });

      if (result.success) {
        try {
          await securityService.enableBiometric();
          setBiometricEnabled(true);
          ReactNativeHapticFeedback.trigger('notificationSuccess');
        } catch (error) {
          moduleLogger.error('Failed to enable biometric:', error);
          notifications.showError(t('security.enableBiometricError'), t('common.error'));
        }
      }
    } else {
      try {
        await securityService.disableBiometric();
        setBiometricEnabled(false);
      } catch (error) {
        moduleLogger.error('Failed to disable biometric:', error);
      }
    }
  }, [t]);

  const handleRemoveDevice = useCallback(async (deviceId: string) => {
    ReactNativeHapticFeedback.trigger('notificationWarning');

    notifications.show({
      level: 'warning',
      title: t('security.removeDeviceTitle'),
      message: t('security.removeDeviceMessage'),
      dismissable: true,
      action: {
        label: t('security.remove'),
        type: 'action',
        onPress: async () => {
          try {
            await securityService.removeDevice(deviceId);
            setDevices(prev => prev.filter(d => d.id !== deviceId));
            ReactNativeHapticFeedback.trigger('notificationSuccess');
          } catch (error) {
            moduleLogger.error('Failed to remove device:', error);
            notifications.showError(t('security.removeDeviceError'), t('common.error'));
          }
        },
      },
    });
  }, [t, notifications]);

  const getDeviceIcon = (type: string) => {
    switch (type.toLowerCase()) {
      case 'mobile': return '📱';
      case 'tablet': return '📱';
      case 'tv': return '📺';
      case 'desktop': return '💻';
      default: return '💻';
    }
  };

  const renderSecurityOption = (
    title: string,
    description: string,
    onPress: () => void,
    icon?: string
  ) => (
    <TouchableOpacity
      onPress={onPress}
      activeOpacity={0.7}
    >
      <GlassView className="rounded-lg mb-2 p-4">
        <View className={`flex-row items-center ${isRTL ? 'flex-row-reverse' : ''}`}>
          {icon && <Text className="text-2xl mr-4">{icon}</Text>}
          <View className="flex-1">
            <Text className="text-base font-medium text-white" style={{ textAlign }}>{title}</Text>
            <Text className="text-sm text-white/60" style={{ textAlign }}>{description}</Text>
          </View>
          <Text className="text-2xl text-white/60">{isRTL ? '‹' : '›'}</Text>
        </View>
      </GlassView>
    </TouchableOpacity>
  );

  const renderToggleOption = (
    title: string,
    description: string,
    value: boolean,
    onToggle: (value: boolean) => void,
    disabled?: boolean,
    icon?: string
  ) => (
    <GlassView className="rounded-lg mb-2 p-4">
      <View className={`flex-row items-center ${isRTL ? 'flex-row-reverse' : ''}`}>
        {icon && <Text className="text-2xl mr-4">{icon}</Text>}
        <View className="flex-1">
          <Text className="text-base font-medium text-white" style={{ textAlign }}>{title}</Text>
          <Text className="text-sm text-white/60" style={{ textAlign }}>{description}</Text>
        </View>
        <Switch
          value={value}
          onValueChange={onToggle}
          disabled={disabled}
          trackColor={{ false: colors.backgroundLight, true: colors.primary }}
          thumbColor={colors.text}
        />
      </View>
    </GlassView>
  );

  if (isLoading) {
    return (
      <SafeAreaView className="flex-1 bg-black justify-center items-center">
        <ActivityIndicator size="large" color={colors.primary} />
        <Text className="text-white text-base mt-4">{t('common.loading')}</Text>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView className="flex-1 bg-black">
      <ScrollView
        contentContainerStyle={{ paddingHorizontal: spacing.md, paddingBottom: spacing.xl }}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor={colors.primary}
            colors={[colors.primary]}
          />
        }
        showsVerticalScrollIndicator={false}
      >
        {/* Header */}
        <View className={`flex-row items-center py-4 gap-4 ${isRTL ? 'flex-row-reverse' : ''}`}>
          <TouchableOpacity
            onPress={() => navigation.goBack()}
            className="w-11 h-11 justify-center items-center"
          >
            <Text className="text-4xl text-white font-light">{isRTL ? '‹' : '›'}</Text>
          </TouchableOpacity>
          <Text className="flex-1 text-3xl font-bold text-white" style={{ textAlign }}>
            {t('security.title')}
          </Text>
        </View>

        {/* Password Section */}
        <View className="mb-4">
          <Text className="text-lg font-semibold text-white mb-2" style={{ textAlign }}>
            {t('security.password')}
          </Text>
          {renderSecurityOption(
            t('security.changePassword'),
            t('security.changePasswordDesc'),
            handleChangePassword,
            '🔑'
          )}
        </View>

        {/* Authentication Section */}
        <View className="mb-4">
          <Text className="text-lg font-semibold text-white mb-2" style={{ textAlign }}>
            {t('security.authentication')}
          </Text>

          {renderToggleOption(
            t('security.twoFactor'),
            t('security.twoFactorDesc'),
            twoFactorEnabled,
            handleToggleTwoFactor,
            false,
            '🛡️'
          )}

          {biometricAvailable && renderToggleOption(
            Platform.OS === 'ios' ? t('security.faceId') : t('security.fingerprint'),
            t('security.biometricDesc'),
            biometricEnabled,
            handleToggleBiometric,
            false,
            '👆'
          )}
        </View>

        {/* Connected Devices Section */}
        <View className="mb-4">
          <Text className="text-lg font-semibold text-white mb-2" style={{ textAlign }}>
            {t('security.connectedDevices')}
          </Text>

          {devices.length === 0 ? (
            <GlassView className="rounded-lg p-6 items-center">
              <Text className="text-5xl mb-4">📱</Text>
              <Text className="text-base text-white/60" style={{ textAlign }}>
                {t('security.noDevices')}
              </Text>
            </GlassView>
          ) : (
            devices.map((device) => (
              <GlassView key={device.id} className="rounded-lg mb-2 p-4">
                <View className={`flex-row items-center ${isRTL ? 'flex-row-reverse' : ''}`}>
                  <Text className="text-3xl mr-4">
                    {getDeviceIcon(device.type)}
                  </Text>
                  <View className="flex-1">
                    <View className={`flex-row items-center gap-2 ${isRTL ? 'flex-row-reverse' : ''}`}>
                      <Text className="text-base font-medium text-white" style={{ textAlign }}>
                        {device.name}
                      </Text>
                      {device.isCurrent && (
                        <View className="bg-green-500/20 px-2 py-0.5 rounded">
                          <Text className="text-xs text-green-400 font-semibold">
                            {t('security.thisDevice')}
                          </Text>
                        </View>
                      )}
                    </View>
                    <Text className="text-sm text-white/60 mt-0.5" style={{ textAlign }}>
                      {t('security.lastActive')}: {device.lastActive}
                    </Text>
                  </View>
                  {!device.isCurrent && (
                    <TouchableOpacity
                      onPress={() => handleRemoveDevice(device.id)}
                      className="px-2 py-1"
                    >
                      <Text className="text-sm text-red-500">{t('security.remove')}</Text>
                    </TouchableOpacity>
                  )}
                </View>
              </GlassView>
            ))
          )}
        </View>

        {/* Login History Section */}
        <View className="mb-4">
          <Text className="text-lg font-semibold text-white mb-2" style={{ textAlign }}>
            {t('security.loginHistory')}
          </Text>

          {loginHistory.length === 0 ? (
            <GlassView className="rounded-lg p-6 items-center">
              <Text className="text-5xl mb-4">📋</Text>
              <Text className="text-base text-white/60" style={{ textAlign }}>
                {t('security.noLoginHistory')}
              </Text>
            </GlassView>
          ) : (
            loginHistory.slice(0, 5).map((entry) => (
              <GlassView key={entry.id} className="rounded-lg mb-2 p-4">
                <View className={`flex-row items-center ${isRTL ? 'flex-row-reverse' : ''}`}>
                  <View className={`w-8 h-8 rounded-full justify-center items-center mr-4 ${entry.success ? 'bg-green-500/20' : 'bg-red-500/20'}`}>
                    <Text className="text-base font-bold text-white">
                      {entry.success ? '✓' : '✕'}
                    </Text>
                  </View>
                  <View className="flex-1">
                    <Text className="text-base font-medium text-white" style={{ textAlign }}>
                      {entry.device}
                    </Text>
                    <Text className="text-sm text-white/60 mt-0.5" style={{ textAlign }}>
                      {entry.location} • {entry.timestamp}
                    </Text>
                  </View>
                </View>
              </GlassView>
            ))
          )}

          {loginHistory.length > 5 && (
            <TouchableOpacity
              onPress={() => navigation.navigate('LoginHistory')}
              className="items-center py-4"
            >
              <Text className="text-sm text-purple-400 font-medium">
                {t('security.viewAllHistory')}
              </Text>
            </TouchableOpacity>
          )}
        </View>

        {/* Sign Out All Devices */}
        <View className="mb-4">
          <GlassButton
            title={t('security.signOutAllDevices')}
            onPress={() => {
              ReactNativeHapticFeedback.trigger('notificationWarning');
              notifications.show({
                level: 'warning',
                title: t('security.signOutAllTitle'),
                message: t('security.signOutAllMessage'),
                dismissable: true,
                action: {
                  label: t('security.signOut'),
                  type: 'action',
                  onPress: async () => {
                    try {
                      await securityService.signOutAllDevices();
                      navigation.navigate('Login');
                    } catch (error) {
                      moduleLogger.error('Failed to sign out all devices:', error);
                    }
                  },
                },
              });
            }}
            variant="danger"
          />
        </View>
      </ScrollView>
    </SafeAreaView>
  );
};

export default SecurityScreenMobile;
