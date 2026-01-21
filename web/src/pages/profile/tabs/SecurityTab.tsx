import { View, Text, Pressable, StyleSheet } from 'react-native';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';
import { Shield, Clock, LogOut } from 'lucide-react';
import { GlassView } from '@bayit/shared/ui';
import { colors, spacing } from '@bayit/shared/theme';
import { useAuthStore } from '@/stores/authStore';

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
    <View style={styles.sectionGrid}>
      <GlassView style={styles.section}>
        <Text style={[styles.sectionTitle, { textAlign: isRTL ? 'right' : 'left' }]}>
          {t('profile.accountSecurity', 'Account Security')}
        </Text>
        <View style={styles.securityInfo}>
          <View style={styles.securityInfoRow}>
            {isRTL ? (
              <>
                <Text style={[styles.securityInfoText, { textAlign: 'right' }]}>
                  {t('profile.securityNote', 'Your account is secured with encrypted authentication')}
                </Text>
                <Shield size={20} color={colors.success} />
              </>
            ) : (
              <>
                <Shield size={20} color={colors.success} />
                <Text style={[styles.securityInfoText, { textAlign: 'left' }]}>
                  {t('profile.securityNote', 'Your account is secured with encrypted authentication')}
                </Text>
              </>
            )}
          </View>
          {user?.last_login && (
            <View style={styles.securityInfoRow}>
              {isRTL ? (
                <>
                  <Text style={[styles.securityInfoText, { textAlign: 'right' }]}>
                    {t('profile.lastLogin', 'Last login')}: {new Date(user.last_login).toLocaleString()}
                  </Text>
                  <Clock size={20} color={colors.textMuted} />
                </>
              ) : (
                <>
                  <Clock size={20} color={colors.textMuted} />
                  <Text style={[styles.securityInfoText, { textAlign: 'left' }]}>
                    {t('profile.lastLogin', 'Last login')}: {new Date(user.last_login).toLocaleString()}
                  </Text>
                </>
              )}
            </View>
          )}
        </View>
      </GlassView>

      <GlassView style={[styles.section, styles.dangerSection]}>
        <Text style={[styles.sectionTitle, { color: colors.error, textAlign: isRTL ? 'right' : 'left' }]}>
          {t('profile.dangerZone', 'Danger Zone')}
        </Text>
        <Pressable onPress={handleLogout} style={styles.logoutButton}>
          {isRTL ? (
            <>
              <Text style={[styles.logoutText, { textAlign: 'right' }]}>{t('account.logout', 'Sign Out')}</Text>
              <LogOut size={20} color={colors.error} />
            </>
          ) : (
            <>
              <LogOut size={20} color={colors.error} />
              <Text style={[styles.logoutText, { textAlign: 'left' }]}>{t('account.logout', 'Sign Out')}</Text>
            </>
          )}
        </Pressable>
      </GlassView>
    </View>
  );
}

const styles = StyleSheet.create({
  sectionGrid: {
    gap: spacing.lg,
  },
  section: {
    padding: spacing.lg,
    gap: spacing.md,
  },
  sectionTitle: {
    fontSize: 13,
    fontWeight: '600',
    color: colors.textMuted,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  securityInfo: {
    gap: spacing.md,
  },
  securityInfoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
  },
  securityInfoText: {
    flex: 1,
    fontSize: 14,
    color: colors.textMuted,
  },
  dangerSection: {
    borderWidth: 1,
    borderColor: 'rgba(239, 68, 68, 0.3)',
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
});
