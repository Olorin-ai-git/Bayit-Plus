/**
 * SecuritySettingsScreen - Security status display
 *
 * Features:
 * - Read-only security status display
 * - Two-factor authentication status
 * - Biometric authentication status
 * - Last password change date
 * - Last login information
 * - Link to devices manager
 */

import React, { useEffect, useState } from 'react';
import { View, Text, ScrollView, Pressable, StyleSheet, ActivityIndicator } from 'react-native';
import { useTranslation } from 'react-i18next';
import { Shield, Lock, Fingerprint, Clock, MapPin, Monitor, CheckCircle, XCircle, Bell } from 'lucide-react-native';
import { TVHeader } from '../components/TVHeader';
import { useSecuritySettingsStore } from '../stores/securitySettingsStore';
import { config } from '../config/appConfig';

export const SecuritySettingsScreen: React.FC<{ navigation: any }> = ({ navigation }) => {
  const { t } = useTranslation();
  const [focusedItem, setFocusedItem] = useState<string | null>(null);

  const {
    securityStatus,
    isLoading,
    error,
    loadSecuritySettings,
  } = useSecuritySettingsStore();

  useEffect(() => {
    loadSecuritySettings();
  }, [loadSecuritySettings]);

  const formatDate = (dateString: string | null) => {
    if (!dateString) return t('common.never', 'Never');

    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });
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

  if (!securityStatus) {
    return null;
  }

  const isSecured = securityStatus.twoFactorEnabled && securityStatus.biometricEnabled;

  return (
    <View style={styles.container}>
      <TVHeader currentScreen="profile" navigation={navigation} />

      <ScrollView style={styles.content} contentContainerStyle={styles.contentInner}>
        <Text style={styles.screenTitle}>
          {t('tvos.profile.securitySettings', 'Security')}
        </Text>

        {/* Security Status Badge */}
        <View style={[styles.statusCard, isSecured ? styles.statusCardSecured : styles.statusCardAtRisk]}>
          <View style={styles.statusHeader}>
            {isSecured ? (
              <CheckCircle size={40} color="#10B981" />
            ) : (
              <XCircle size={40} color="#EF4444" />
            )}
            <View style={styles.statusInfo}>
              <Text style={styles.statusTitle}>
                {isSecured
                  ? t('tvos.security.statusSecured', 'Account Secured')
                  : t('tvos.security.statusAtRisk', 'Security at Risk')
                }
              </Text>
              <Text style={styles.statusSubtitle}>
                {isSecured
                  ? t('tvos.security.statusSecuredDesc', 'All security features enabled')
                  : t('tvos.security.statusAtRiskDesc', 'Enable all security features')
                }
              </Text>
            </View>
          </View>
        </View>

        {/* Security Features Section */}
        <Text style={styles.sectionTitle}>
          {t('tvos.security.securityFeatures', 'Security Features')}
        </Text>
        <View style={styles.section}>
          <View style={styles.infoCard}>
            <View style={styles.infoIconContainer}>
              <Lock size={28} color="#A855F7" />
            </View>
            <View style={styles.infoContent}>
              <Text style={styles.infoLabel}>
                {t('tvos.security.twoFactor', 'Two-Factor Authentication')}
              </Text>
              <Text style={[
                styles.infoValue,
                securityStatus.twoFactorEnabled ? styles.infoValueEnabled : styles.infoValueDisabled
              ]}>
                {securityStatus.twoFactorEnabled
                  ? t('common.enabled', 'Enabled')
                  : t('common.disabled', 'Disabled')
                }
              </Text>
            </View>
          </View>

          <View style={styles.infoCard}>
            <View style={styles.infoIconContainer}>
              <Fingerprint size={28} color="#A855F7" />
            </View>
            <View style={styles.infoContent}>
              <Text style={styles.infoLabel}>
                {t('tvos.security.biometric', 'Biometric Authentication')}
              </Text>
              <Text style={[
                styles.infoValue,
                securityStatus.biometricEnabled ? styles.infoValueEnabled : styles.infoValueDisabled
              ]}>
                {securityStatus.biometricEnabled
                  ? t('common.enabled', 'Enabled')
                  : t('common.disabled', 'Disabled')
                }
              </Text>
            </View>
          </View>

          <View style={styles.infoCard}>
            <View style={styles.infoIconContainer}>
              <Bell size={28} color="#A855F7" />
            </View>
            <View style={styles.infoContent}>
              <Text style={styles.infoLabel}>
                {t('tvos.security.loginNotifications', 'Login Notifications')}
              </Text>
              <Text style={[
                styles.infoValue,
                securityStatus.loginNotifications ? styles.infoValueEnabled : styles.infoValueDisabled
              ]}>
                {securityStatus.loginNotifications
                  ? t('common.enabled', 'Enabled')
                  : t('common.disabled', 'Disabled')
                }
              </Text>
            </View>
          </View>

          <View style={styles.infoCard}>
            <View style={styles.infoIconContainer}>
              <Clock size={28} color="#A855F7" />
            </View>
            <View style={styles.infoContent}>
              <Text style={styles.infoLabel}>
                {t('tvos.security.lastPasswordChange', 'Last Password Change')}
              </Text>
              <Text style={styles.infoValue}>
                {formatDate(securityStatus.lastPasswordChange)}
              </Text>
            </View>
          </View>
        </View>

        {/* Last Login Section */}
        <Text style={styles.sectionTitle}>
          {t('tvos.security.lastLogin', 'Last Login')}
        </Text>
        <View style={styles.section}>
          <View style={styles.infoCard}>
            <View style={styles.infoIconContainer}>
              <Clock size={28} color="#A855F7" />
            </View>
            <View style={styles.infoContent}>
              <Text style={styles.infoLabel}>
                {t('tvos.security.lastLoginAt', 'Login Time')}
              </Text>
              <Text style={styles.infoValue}>
                {formatDate(securityStatus.lastLoginAt)}
              </Text>
            </View>
          </View>

          <View style={styles.infoCard}>
            <View style={styles.infoIconContainer}>
              <MapPin size={28} color="#A855F7" />
            </View>
            <View style={styles.infoContent}>
              <Text style={styles.infoLabel}>
                {t('tvos.security.lastLoginFrom', 'Login Location')}
              </Text>
              <Text style={styles.infoValue}>
                {securityStatus.lastLoginFrom || t('common.unknown', 'Unknown')}
              </Text>
            </View>
          </View>
        </View>

        {/* Devices Link */}
        <Text style={styles.sectionTitle}>
          {t('tvos.security.deviceManagement', 'Device Management')}
        </Text>
        <Pressable
          onPress={() => navigation.navigate('DevicesManager')}
          onFocus={() => setFocusedItem('devices')}
          hasTVPreferredFocus={true}
          style={styles.linkButton}
        >
          <View style={[styles.linkCard, focusedItem === 'devices' && styles.linkCardFocused]}>
            <View style={styles.linkIconContainer}>
              <Monitor size={32} color="#A855F7" />
            </View>
            <View style={styles.linkContent}>
              <Text style={styles.linkTitle}>
                {t('tvos.security.manageDevices', 'Manage Connected Devices')}
              </Text>
              <Text style={styles.linkSubtitle}>
                {t('tvos.security.manageDevicesDesc', 'View and disconnect active sessions')}
              </Text>
            </View>
          </View>
        </Pressable>
      </ScrollView>
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
  statusCard: {
    borderRadius: 16,
    padding: 24,
    marginBottom: 32,
    borderWidth: 3,
  },
  statusCardSecured: {
    backgroundColor: 'rgba(16,185,129,0.1)',
    borderColor: '#10B981',
  },
  statusCardAtRisk: {
    backgroundColor: 'rgba(239,68,68,0.1)',
    borderColor: '#EF4444',
  },
  statusHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 20,
  },
  statusInfo: {
    flex: 1,
    gap: 8,
  },
  statusTitle: {
    fontSize: 36,
    fontWeight: '700',
    color: '#ffffff',
  },
  statusSubtitle: {
    fontSize: 24,
    fontWeight: '400',
    color: 'rgba(255,255,255,0.7)',
  },
  sectionTitle: {
    fontSize: 32,
    fontWeight: '700',
    color: '#ffffff',
    marginTop: 24,
    marginBottom: 16,
  },
  section: {
    gap: 12,
  },
  infoCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 20,
    backgroundColor: 'rgba(20,20,35,0.85)',
    borderRadius: 12,
    padding: 16,
    borderWidth: 2,
    borderColor: 'rgba(255,255,255,0.1)',
  },
  infoIconContainer: {
    width: 48,
    height: 48,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(168,85,247,0.2)',
    borderRadius: 10,
  },
  infoContent: {
    flex: 1,
    gap: 4,
  },
  infoLabel: {
    fontSize: config.tv.minBodyTextSizePt,
    fontWeight: '600',
    color: 'rgba(255,255,255,0.8)',
  },
  infoValue: {
    fontSize: 24,
    fontWeight: '500',
    color: '#ffffff',
  },
  infoValueEnabled: {
    color: '#10B981',
  },
  infoValueDisabled: {
    color: '#EF4444',
  },
  linkButton: {
    width: '100%',
  },
  linkCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 20,
    backgroundColor: 'rgba(20,20,35,0.85)',
    borderRadius: 16,
    padding: 20,
    borderWidth: 2,
    borderColor: 'rgba(255,255,255,0.1)',
  },
  linkCardFocused: {
    borderColor: '#A855F7',
    borderWidth: config.tv.focusBorderWidth,
    transform: [{ scale: 1.02 }],
  },
  linkIconContainer: {
    width: 60,
    height: 60,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(168,85,247,0.2)',
    borderRadius: 12,
  },
  linkContent: {
    flex: 1,
    gap: 4,
  },
  linkTitle: {
    fontSize: config.tv.minBodyTextSizePt,
    fontWeight: '700',
    color: '#ffffff',
  },
  linkSubtitle: {
    fontSize: 24,
    fontWeight: '400',
    color: 'rgba(255,255,255,0.6)',
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
});
