import { useState } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { useTranslation } from 'react-i18next';
import { Search, Save } from 'lucide-react';
import { colors, spacing, borderRadius, fontSize } from '@olorin/design-tokens';
import { GlassCard, GlassButton, GlassInput } from '@bayit/shared/ui';
import { voiceManagementService } from '@/services/voiceManagementApi';
import logger from '@/utils/logger';

export default function QuotaManagementPanel() {
  const { t } = useTranslation();
  const [userId, setUserId] = useState('');
  const [loading, setLoading] = useState(false);
  const [quota, setQuota] = useState<any>(null);

  const handleSearch = async () => {
    if (!userId.trim()) return;
    setLoading(true);
    try {
      const response = await voiceManagementService.getUserQuota(userId);
      setQuota(response);
    } catch (error: any) {
      logger.error('Failed to load user quota', 'QuotaManagementPanel', error);
    } finally {
      setLoading(false);
    }
  };

  const handleUpdate = async () => {
    if (!userId || !quota) return;
    try {
      await voiceManagementService.updateUserQuota(userId, quota.quota);
    } catch (error: any) {
      logger.error('Failed to update user quota', 'QuotaManagementPanel', error);
    }
  };

  return (
    <View>
      <GlassCard style={styles.card}>
        <Text style={styles.title}>{t('admin.voiceManagement.quotas.searchUser')}</Text>

        <View style={styles.searchRow}>
          <GlassInput
            value={userId}
            onChangeText={setUserId}
            placeholder={t('admin.voiceManagement.quotas.userIdPlaceholder')}
            style={styles.searchInput}
          />
          <GlassButton
            title=""
            icon={<Search size={16} color={colors.primary} />}
            variant="primary"
            onPress={handleSearch}
            loading={loading}
          />
        </View>
      </GlassCard>

      {quota && (
        <GlassCard style={styles.card}>
          <Text style={styles.title}>{t('admin.voiceManagement.quotas.quotaDetails')}</Text>

          <View style={styles.infoRow}>
            <Text style={styles.label}>{t('admin.voiceManagement.quotas.userEmail')}</Text>
            <Text style={styles.value}>{quota.user.email}</Text>
          </View>

          <View style={styles.infoRow}>
            <Text style={styles.label}>{t('admin.voiceManagement.quotas.tier')}</Text>
            <Text style={styles.value}>{quota.user.subscription_tier}</Text>
          </View>

          <View style={styles.section}>
            <Text style={styles.sectionTitle}>{t('admin.voiceManagement.quotas.subtitleLimits')}</Text>
            <Text style={styles.limitText}>
              Hour: {quota.quota.subtitle_minutes_per_hour} min
            </Text>
            <Text style={styles.limitText}>
              Day: {quota.quota.subtitle_minutes_per_day} min
            </Text>
            <Text style={styles.limitText}>
              Month: {quota.quota.subtitle_minutes_per_month} min
            </Text>
          </View>

          <View style={styles.section}>
            <Text style={styles.sectionTitle}>{t('admin.voiceManagement.quotas.dubbingLimits')}</Text>
            <Text style={styles.limitText}>
              Hour: {quota.quota.dubbing_minutes_per_hour} min
            </Text>
            <Text style={styles.limitText}>
              Day: {quota.quota.dubbing_minutes_per_day} min
            </Text>
            <Text style={styles.limitText}>
              Month: {quota.quota.dubbing_minutes_per_month} min
            </Text>
          </View>

          <GlassButton
            title={t('common.save')}
            icon={<Save size={16} color="#fff" />}
            variant="primary"
            onPress={handleUpdate}
            style={styles.saveButton}
          />
        </GlassCard>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    marginBottom: spacing.lg,
  },
  title: {
    fontSize: fontSize.xl,
    fontWeight: '600',
    color: colors.text,
    marginBottom: spacing.md,
  },
  searchRow: {
    flexDirection: 'row',
    gap: spacing.sm,
  },
  searchInput: {
    flex: 1,
  },
  infoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: spacing.sm,
  },
  label: {
    fontSize: fontSize.sm,
    color: colors.textMuted,
  },
  value: {
    fontSize: fontSize.sm,
    color: colors.text,
    fontWeight: '500',
  },
  section: {
    marginTop: spacing.lg,
  },
  sectionTitle: {
    fontSize: fontSize.base,
    fontWeight: '600',
    color: colors.text,
    marginBottom: spacing.sm,
  },
  limitText: {
    fontSize: fontSize.sm,
    color: colors.textMuted,
    marginBottom: spacing.xs,
  },
  saveButton: {
    marginTop: spacing.lg,
  },
});
