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
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  RefreshControl,
  ActivityIndicator,
  SafeAreaView,
  Alert,
  Switch,
  Platform,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { useTranslation } from 'react-i18next';
import * as Haptics from 'expo-haptics';
import * as LocalAuthentication from 'expo-local-authentication';
import { GlassView, GlassButton } from '@bayit/shared';
import { useDirection } from '@bayit/shared-hooks';
import { useAuthStore } from '@bayit/shared-stores';
import { securityService } from '@bayit/shared-services';
import { spacing, colors, borderRadius } from '../theme';

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
      const compatible = await LocalAuthentication.hasHardwareAsync();
      const enrolled = await LocalAuthentication.isEnrolledAsync();
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
      console.error('Failed to load security data:', error);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    loadSecurityData();
  }, [loadSecurityData]);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    await loadSecurityData();
    setRefreshing(false);
  }, [loadSecurityData]);

  const handleChangePassword = useCallback(() => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    navigation.navigate('ChangePassword');
  }, [navigation]);

  const handleToggleTwoFactor = useCallback(async (value: boolean) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);

    if (value) {
      // Enable 2FA - navigate to setup
      navigation.navigate('TwoFactorSetup');
    } else {
      // Disable 2FA - confirm first
      Alert.alert(
        t('security.disable2FATitle'),
        t('security.disable2FAMessage'),
        [
          { text: t('common.cancel'), style: 'cancel' },
          {
            text: t('security.disable'),
            style: 'destructive',
            onPress: async () => {
              try {
                await securityService.disableTwoFactor();
                setTwoFactorEnabled(false);
                Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
              } catch (error) {
                console.error('Failed to disable 2FA:', error);
                Alert.alert(t('common.error'), t('security.disable2FAError'));
              }
            },
          },
        ]
      );
    }
  }, [navigation, t]);

  const handleToggleBiometric = useCallback(async (value: boolean) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);

    if (value) {
      // Verify biometric before enabling
      const result = await LocalAuthentication.authenticateAsync({
        promptMessage: t('security.verifyBiometric'),
        fallbackLabel: t('security.usePassword'),
      });

      if (result.success) {
        try {
          await securityService.enableBiometric();
          setBiometricEnabled(true);
          Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        } catch (error) {
          console.error('Failed to enable biometric:', error);
          Alert.alert(t('common.error'), t('security.enableBiometricError'));
        }
      }
    } else {
      try {
        await securityService.disableBiometric();
        setBiometricEnabled(false);
      } catch (error) {
        console.error('Failed to disable biometric:', error);
      }
    }
  }, [t]);

  const handleRemoveDevice = useCallback(async (deviceId: string) => {
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);

    Alert.alert(
      t('security.removeDeviceTitle'),
      t('security.removeDeviceMessage'),
      [
        { text: t('common.cancel'), style: 'cancel' },
        {
          text: t('security.remove'),
          style: 'destructive',
          onPress: async () => {
            try {
              await securityService.removeDevice(deviceId);
              setDevices(prev => prev.filter(d => d.id !== deviceId));
              Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
            } catch (error) {
              console.error('Failed to remove device:', error);
              Alert.alert(t('common.error'), t('security.removeDeviceError'));
            }
          },
        },
      ]
    );
  }, [t]);

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
      <GlassView style={styles.optionCard}>
        <View style={[styles.optionContent, isRTL && styles.contentRTL]}>
          {icon && <Text style={styles.optionIcon}>{icon}</Text>}
          <View style={styles.optionInfo}>
            <Text style={[styles.optionTitle, { textAlign }]}>{title}</Text>
            <Text style={[styles.optionDescription, { textAlign }]}>{description}</Text>
          </View>
          <Text style={styles.chevron}>{isRTL ? '‹' : '›'}</Text>
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
    <GlassView style={styles.optionCard}>
      <View style={[styles.optionContent, isRTL && styles.contentRTL]}>
        {icon && <Text style={styles.optionIcon}>{icon}</Text>}
        <View style={styles.optionInfo}>
          <Text style={[styles.optionTitle, { textAlign }]}>{title}</Text>
          <Text style={[styles.optionDescription, { textAlign }]}>{description}</Text>
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
      <SafeAreaView style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={colors.primary} />
        <Text style={styles.loadingText}>{t('common.loading')}</Text>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView
        contentContainerStyle={styles.content}
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
        <View style={[styles.header, isRTL && styles.headerRTL]}>
          <TouchableOpacity
            onPress={() => navigation.goBack()}
            style={styles.backButton}
          >
            <Text style={styles.backText}>{isRTL ? '‹' : '›'}</Text>
          </TouchableOpacity>
          <Text style={[styles.title, { textAlign }]}>
            {t('security.title')}
          </Text>
        </View>

        {/* Password Section */}
        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { textAlign }]}>
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
        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { textAlign }]}>
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
        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { textAlign }]}>
            {t('security.connectedDevices')}
          </Text>

          {devices.length === 0 ? (
            <GlassView style={styles.emptyCard}>
              <Text style={styles.emptyIcon}>📱</Text>
              <Text style={[styles.emptyText, { textAlign }]}>
                {t('security.noDevices')}
              </Text>
            </GlassView>
          ) : (
            devices.map((device) => (
              <GlassView key={device.id} style={styles.deviceCard}>
                <View style={[styles.deviceContent, isRTL && styles.contentRTL]}>
                  <Text style={styles.deviceIcon}>
                    {getDeviceIcon(device.type)}
                  </Text>
                  <View style={styles.deviceInfo}>
                    <View style={[styles.deviceNameRow, isRTL && styles.contentRTL]}>
                      <Text style={[styles.deviceName, { textAlign }]}>
                        {device.name}
                      </Text>
                      {device.isCurrent && (
                        <View style={styles.currentBadge}>
                          <Text style={styles.currentBadgeText}>
                            {t('security.thisDevice')}
                          </Text>
                        </View>
                      )}
                    </View>
                    <Text style={[styles.deviceMeta, { textAlign }]}>
                      {t('security.lastActive')}: {device.lastActive}
                    </Text>
                  </View>
                  {!device.isCurrent && (
                    <TouchableOpacity
                      onPress={() => handleRemoveDevice(device.id)}
                      style={styles.removeButton}
                    >
                      <Text style={styles.removeText}>{t('security.remove')}</Text>
                    </TouchableOpacity>
                  )}
                </View>
              </GlassView>
            ))
          )}
        </View>

        {/* Login History Section */}
        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { textAlign }]}>
            {t('security.loginHistory')}
          </Text>

          {loginHistory.length === 0 ? (
            <GlassView style={styles.emptyCard}>
              <Text style={styles.emptyIcon}>📋</Text>
              <Text style={[styles.emptyText, { textAlign }]}>
                {t('security.noLoginHistory')}
              </Text>
            </GlassView>
          ) : (
            loginHistory.slice(0, 5).map((entry) => (
              <GlassView key={entry.id} style={styles.historyCard}>
                <View style={[styles.historyContent, isRTL && styles.contentRTL]}>
                  <View style={[
                    styles.historyStatus,
                    entry.success ? styles.historySuccess : styles.historyFailed
                  ]}>
                    <Text style={styles.historyStatusIcon}>
                      {entry.success ? '✓' : '✕'}
                    </Text>
                  </View>
                  <View style={styles.historyInfo}>
                    <Text style={[styles.historyDevice, { textAlign }]}>
                      {entry.device}
                    </Text>
                    <Text style={[styles.historyMeta, { textAlign }]}>
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
              style={styles.viewAllButton}
            >
              <Text style={styles.viewAllText}>
                {t('security.viewAllHistory')}
              </Text>
            </TouchableOpacity>
          )}
        </View>

        {/* Sign Out All Devices */}
        <View style={styles.section}>
          <GlassButton
            title={t('security.signOutAllDevices')}
            onPress={() => {
              Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
              Alert.alert(
                t('security.signOutAllTitle'),
                t('security.signOutAllMessage'),
                [
                  { text: t('common.cancel'), style: 'cancel' },
                  {
                    text: t('security.signOut'),
                    style: 'destructive',
                    onPress: async () => {
                      try {
                        await securityService.signOutAllDevices();
                        navigation.navigate('Login');
                      } catch (error) {
                        console.error('Failed to sign out all devices:', error);
                      }
                    },
                  },
                ]
              );
            }}
            variant="danger"
          />
        </View>
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  loadingContainer: {
    flex: 1,
    backgroundColor: colors.background,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    color: colors.text,
    fontSize: 16,
    marginTop: spacing.md,
  },
  content: {
    paddingHorizontal: spacing.md,
    paddingBottom: spacing.xl,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: spacing.lg,
    gap: spacing.md,
  },
  headerRTL: {
    flexDirection: 'row-reverse',
  },
  backButton: {
    width: 44,
    height: 44,
    justifyContent: 'center',
    alignItems: 'center',
  },
  backText: {
    fontSize: 32,
    color: colors.text,
    fontWeight: '300',
  },
  title: {
    flex: 1,
    fontSize: 28,
    fontWeight: 'bold',
    color: colors.text,
  },
  section: {
    marginBottom: spacing.lg,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: colors.text,
    marginBottom: spacing.sm,
  },
  optionCard: {
    borderRadius: borderRadius.lg,
    marginBottom: spacing.sm,
    padding: spacing.md,
  },
  optionContent: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  contentRTL: {
    flexDirection: 'row-reverse',
  },
  optionIcon: {
    fontSize: 24,
    marginRight: spacing.md,
  },
  optionInfo: {
    flex: 1,
  },
  optionTitle: {
    fontSize: 16,
    fontWeight: '500',
    color: colors.text,
  },
  optionDescription: {
    fontSize: 13,
    color: colors.textSecondary,
    marginTop: 2,
  },
  chevron: {
    fontSize: 24,
    color: colors.textSecondary,
  },
  deviceCard: {
    borderRadius: borderRadius.lg,
    marginBottom: spacing.sm,
    padding: spacing.md,
  },
  deviceContent: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  deviceIcon: {
    fontSize: 28,
    marginRight: spacing.md,
  },
  deviceInfo: {
    flex: 1,
  },
  deviceNameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  deviceName: {
    fontSize: 16,
    fontWeight: '500',
    color: colors.text,
  },
  currentBadge: {
    backgroundColor: 'rgba(34, 197, 94, 0.2)',
    paddingHorizontal: spacing.sm,
    paddingVertical: 2,
    borderRadius: borderRadius.sm,
  },
  currentBadgeText: {
    fontSize: 11,
    color: '#22c55e',
    fontWeight: '600',
  },
  deviceMeta: {
    fontSize: 13,
    color: colors.textSecondary,
    marginTop: 2,
  },
  removeButton: {
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
  },
  removeText: {
    color: colors.error,
    fontSize: 14,
  },
  historyCard: {
    borderRadius: borderRadius.lg,
    marginBottom: spacing.sm,
    padding: spacing.md,
  },
  historyContent: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  historyStatus: {
    width: 32,
    height: 32,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: spacing.md,
  },
  historySuccess: {
    backgroundColor: 'rgba(34, 197, 94, 0.2)',
  },
  historyFailed: {
    backgroundColor: 'rgba(239, 68, 68, 0.2)',
  },
  historyStatusIcon: {
    fontSize: 16,
    fontWeight: 'bold',
    color: colors.text,
  },
  historyInfo: {
    flex: 1,
  },
  historyDevice: {
    fontSize: 16,
    fontWeight: '500',
    color: colors.text,
  },
  historyMeta: {
    fontSize: 13,
    color: colors.textSecondary,
    marginTop: 2,
  },
  viewAllButton: {
    alignItems: 'center',
    paddingVertical: spacing.md,
  },
  viewAllText: {
    color: colors.primary,
    fontSize: 14,
    fontWeight: '500',
  },
  emptyCard: {
    borderRadius: borderRadius.lg,
    padding: spacing.xl,
    alignItems: 'center',
  },
  emptyIcon: {
    fontSize: 48,
    marginBottom: spacing.md,
  },
  emptyText: {
    fontSize: 16,
    color: colors.textSecondary,
  },
});

export default SecurityScreenMobile;
