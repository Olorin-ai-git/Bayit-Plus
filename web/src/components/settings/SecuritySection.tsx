/**
 * SecuritySection
 * Security settings: change password, 2FA, active sessions, sign out all.
 */

import { useState, useEffect } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { useTranslation } from 'react-i18next';
import { useDirection } from '@/hooks/useDirection';
import { GlassButton, GlassModal } from '@bayit/shared/ui';
import {
  Lock, ShieldCheck, Smartphone, LogOut, KeyRound,
} from 'lucide-react';
import { colors, spacing, fontSize } from '@olorin/design-tokens';
import { SettingSection } from './shared/SettingSection';
import { SettingRow } from './shared/SettingRow';
import api from '@/services/api';
import logger from '@/utils/logger';

interface Session {
  id: string;
  device_name: string;
  device_type: string;
  last_active: string;
  is_current: boolean;
}

export function SecuritySection() {
  const { t } = useTranslation();
  const { isRTL } = useDirection();
  const [sessions, setSessions] = useState<Session[]>([]);
  const [twoFactorEnabled, setTwoFactorEnabled] = useState(false);
  const [showPasswordModal, setShowPasswordModal] = useState(false);
  const [showSignOutAllModal, setShowSignOutAllModal] = useState(false);

  useEffect(() => {
    loadSecurity();
  }, []);

  const loadSecurity = async () => {
    try {
      const [securityData, devicesData] = await Promise.all([
        api.get('/security/settings'),
        api.get('/users/me/devices'),
      ]);
      setTwoFactorEnabled(securityData?.two_factor_enabled ?? false);
      setSessions(devicesData?.devices ?? []);
    } catch (error) {
      logger.error('Failed to load security info', 'SecuritySection', error);
    }
  };

  const handleRevokeSession = async (sessionId: string) => {
    try {
      await api.delete(`/auth/devices/${sessionId}`);
      setSessions((prev) => prev.filter((s) => s.id !== sessionId));
    } catch (error) {
      logger.error('Failed to revoke session', 'SecuritySection', error);
    }
  };

  const handleSignOutAll = async () => {
    try {
      await api.post('/auth/sign-out-all');
      setShowSignOutAllModal(false);
      loadSecurity();
    } catch (error) {
      logger.error('Failed to sign out all', 'SecuritySection', error);
    }
  };

  return (
    <>
      <SettingSection title={t('settings.security', 'Security')} isRTL={isRTL}>
        <SettingRow
          type="navigation"
          icon={Lock}
          label={t('settings.changePassword', 'Change Password')}
          onPress={() => setShowPasswordModal(true)}
          isRTL={isRTL}
        />
        <SettingRow
          type="toggle"
          icon={ShieldCheck}
          label={t('settings.twoFactorAuth', 'Two-Factor Authentication')}
          description={t('settings.twoFactorAuthDesc', 'Add an extra layer of security')}
          value={twoFactorEnabled}
          onValueChange={async (v) => {
            try {
              if (v) {
                await api.post('/auth/2fa/setup');
              }
              setTwoFactorEnabled(v);
            } catch (error) {
              logger.error('Failed to toggle 2FA', 'SecuritySection', error);
            }
          }}
          isRTL={isRTL}
        />

        {sessions.length > 0 && (
          <View style={styles.sessionsContainer}>
            <Text style={[styles.sessionsTitle, isRTL && styles.textRight]}>
              {t('settings.activeSessions', 'Active Sessions')} ({sessions.length})
            </Text>
            {sessions.map((session) => (
              <View key={session.id} style={[styles.sessionRow, isRTL && styles.rowReverse]}>
                <Smartphone size={16} color={colors.textMuted} />
                <View style={styles.sessionInfo}>
                  <Text style={styles.sessionDevice}>
                    {session.device_name}
                    {session.is_current
                      ? ` (${t('settings.currentDevice', 'Current')})`
                      : ''}
                  </Text>
                  <Text style={styles.sessionTime}>{session.last_active}</Text>
                </View>
                {!session.is_current && (
                  <GlassButton
                    variant="secondary"
                    size="xs"
                    onPress={() => handleRevokeSession(session.id)}
                  >
                    <Text style={styles.revokeText}>
                      {t('settings.revoke', 'Revoke')}
                    </Text>
                  </GlassButton>
                )}
              </View>
            ))}
          </View>
        )}

        <View style={styles.actions}>
          <GlassButton
            variant="secondary"
            size="sm"
            onPress={() => setShowSignOutAllModal(true)}
          >
            <LogOut size={14} color={colors.textMuted} />
            <Text style={styles.actionText}>
              {t('settings.signOutAll', 'Sign Out All Devices')}
            </Text>
          </GlassButton>
        </View>
      </SettingSection>

      <GlassModal
        visible={showPasswordModal}
        onClose={() => setShowPasswordModal(false)}
        title={t('settings.changePassword', 'Change Password')}
        buttons={[
          { label: t('common.cancel', 'Cancel'), onPress: () => setShowPasswordModal(false) },
        ]}
      >
        <Text style={styles.modalText}>
          {t('settings.passwordResetInfo', 'A password reset link will be sent to your email.')}
        </Text>
      </GlassModal>

      <GlassModal
        visible={showSignOutAllModal}
        onClose={() => setShowSignOutAllModal(false)}
        title={t('settings.signOutAllTitle', 'Sign Out All Devices')}
        type="danger"
        buttons={[
          { label: t('common.cancel', 'Cancel'), onPress: () => setShowSignOutAllModal(false) },
          {
            label: t('settings.signOutAll', 'Sign Out All'),
            onPress: handleSignOutAll,
            variant: 'destructive',
          },
        ]}
      >
        <Text style={styles.modalText}>
          {t('settings.signOutAllDesc', 'You will be signed out of all devices except this one.')}
        </Text>
      </GlassModal>
    </>
  );
}

const styles = StyleSheet.create({
  sessionsContainer: {
    marginTop: spacing.md,
    paddingTop: spacing.sm,
  },
  sessionsTitle: {
    fontSize: fontSize.sm,
    fontWeight: '600',
    color: colors.text,
    marginBottom: spacing.sm,
  },
  sessionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    paddingVertical: spacing.xs,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255, 255, 255, 0.05)',
  },
  rowReverse: {
    flexDirection: 'row-reverse',
  },
  sessionInfo: {
    flex: 1,
  },
  sessionDevice: {
    fontSize: fontSize.sm,
    color: colors.text,
  },
  sessionTime: {
    fontSize: fontSize.xs,
    color: colors.textMuted,
  },
  actions: {
    marginTop: spacing.md,
  },
  actionText: {
    color: colors.textMuted,
    fontSize: fontSize.sm,
    marginLeft: spacing.xs,
  },
  revokeText: {
    color: colors.error.DEFAULT,
    fontSize: fontSize.xs,
  },
  textRight: {
    textAlign: 'right',
  },
  modalText: {
    color: colors.textMuted,
    fontSize: fontSize.sm,
    lineHeight: 20,
  },
});
