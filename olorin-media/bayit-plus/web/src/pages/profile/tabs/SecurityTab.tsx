import { View, Text, Pressable, StyleSheet } from 'react-native';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';
import { Shield, Clock, LogOut } from 'lucide-react';
import { GlassView } from '@bayit/shared/ui';
import { useAuthStore } from '@/stores/authStore';
import { colors, spacing, fontSize } from '@bayit/shared/theme';

interface SecurityTabProps {
  isRTL: boolean;
}

export function SecurityTab({ isRTL }: SecurityTabProps) {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { user, logout } = useAuthStore();

  const handleLogout = () => {
    logout();
    navigate('/');
  };

  return (
    <View style={styles.container}>
      <GlassView style={styles.securitySection}>
        <Text style={[styles.sectionTitle, isRTL ? styles.textRight : styles.textLeft]}>
          {t('profile.accountSecurity', 'Account Security')}
        </Text>
        <View style={styles.infoContainer}>
          <View style={styles.infoRow}>
            {isRTL ? (
              <>
                <Text style={[styles.infoText, styles.textRight, styles.flexOne]}>
                  {t('profile.securityNote', 'Your account is secured with encrypted authentication')}
                </Text>
                <Shield size={20} color="#22C55E" />
              </>
            ) : (
              <>
                <Shield size={20} color="#22C55E" />
                <Text style={[styles.infoText, styles.textLeft, styles.flexOne]}>
                  {t('profile.securityNote', 'Your account is secured with encrypted authentication')}
                </Text>
              </>
            )}
          </View>
          {user?.last_login && (
            <View style={styles.infoRow}>
              {isRTL ? (
                <>
                  <Text style={[styles.infoText, styles.textRight, styles.flexOne]}>
                    {t('profile.lastLogin', 'Last login')}: {new Date(user.last_login).toLocaleString()}
                  </Text>
                  <Clock size={20} color="rgba(255,255,255,0.6)" />
                </>
              ) : (
                <>
                  <Clock size={20} color="rgba(255,255,255,0.6)" />
                  <Text style={[styles.infoText, styles.textLeft, styles.flexOne]}>
                    {t('profile.lastLogin', 'Last login')}: {new Date(user.last_login).toLocaleString()}
                  </Text>
                </>
              )}
            </View>
          )}
        </View>
      </GlassView>

      <GlassView style={styles.dangerSection}>
        <Text style={[styles.dangerTitle, isRTL ? styles.textRight : styles.textLeft]}>
          {t('profile.dangerZone', 'Danger Zone')}
        </Text>
        <Pressable onPress={handleLogout} style={styles.logoutButton}>
          {isRTL ? (
            <>
              <Text style={[styles.logoutText, styles.textRight]}>{t('account.logout', 'Sign Out')}</Text>
              <LogOut size={20} color="#EF4444" />
            </>
          ) : (
            <>
              <LogOut size={20} color="#EF4444" />
              <Text style={[styles.logoutText, styles.textLeft]}>{t('account.logout', 'Sign Out')}</Text>
            </>
          )}
        </Pressable>
      </GlassView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    gap: spacing.lg,
  },
  securitySection: {
    padding: spacing.lg,
    gap: spacing.md,
  },
  sectionTitle: {
    fontSize: 13,
    fontWeight: '600',
    color: 'rgba(255, 255, 255, 0.6)',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  infoContainer: {
    gap: spacing.md,
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
  },
  infoText: {
    fontSize: 14,
    color: 'rgba(255, 255, 255, 0.6)',
  },
  dangerSection: {
    padding: spacing.lg,
    gap: spacing.md,
    borderWidth: 1,
    borderColor: 'rgba(239, 68, 68, 0.3)',
  },
  dangerTitle: {
    fontSize: 13,
    fontWeight: '600',
    color: colors.error,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  logoutButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    paddingVertical: spacing.md,
  },
  logoutText: {
    fontSize: 15,
    fontWeight: '500',
    color: colors.error,
  },
  flexOne: {
    flex: 1,
  },
  textLeft: {
    textAlign: 'left',
  },
  textRight: {
    textAlign: 'right',
  },
});
