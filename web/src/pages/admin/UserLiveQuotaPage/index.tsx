import { useState, useEffect } from 'react';
import { View, Text, ScrollView, ActivityIndicator, StyleSheet } from 'react-native';
import { useParams, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { AlertCircle, RotateCcw } from 'lucide-react';
import { liveQuotasService } from '@/services/adminApi';
import { colors, spacing, borderRadius } from '@olorin/design-tokens';
import { GlassCard, GlassButton } from '@bayit/shared/ui';
import { useDirection } from '@/hooks/useDirection';
import AdminLayout from '@/components/admin/AdminLayout';
import logger from '@/utils/logger';
import { QuotaData } from './types';
import UsageSection from './UsageSection';
import LimitsSection from './LimitsSection';
import PageHeader from './PageHeader';

export default function UserLiveQuotaPage() {
  const { t } = useTranslation();
  const { isRTL, textAlign } = useDirection();
  const { userId } = useParams<{ userId: string }>();
  const navigate = useNavigate();

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [quota, setQuota] = useState<QuotaData | null>(null);
  const [usage, setUsage] = useState<QuotaData | null>(null);
  const [editing, setEditing] = useState(false);
  const [formData, setFormData] = useState<Partial<QuotaData>>({});
  const [notes, setNotes] = useState('');
  const [error, setError] = useState<string | null>(null);

  const loadQuota = async () => {
    if (!userId) return;
    try {
      setError(null);
      const response = await liveQuotasService.getUserQuota(userId);
      setQuota(response.quota);
      setUsage(response.usage);
      setFormData(response.quota);
    } catch (err: any) {
      setError(err?.message || 'Failed to load quota data');
      logger.error('Failed to load quota', 'UserLiveQuotaPage', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadQuota();
  }, [userId]);

  const handleSave = async () => {
    if (!userId) return;
    try {
      setSaving(true);
      await liveQuotasService.updateUserLimits(userId, formData, notes);
      await loadQuota();
      setEditing(false);
      setNotes('');
    } catch (err: any) {
      setError(err?.message || 'Failed to save limits');
      logger.error('Failed to save limits', 'UserLiveQuotaPage', err);
    } finally {
      setSaving(false);
    }
  };

  const handleReset = async () => {
    if (!userId) return;

    // Use GlassConfirmDialog instead of native confirm
    const confirmed = confirm(t('admin.liveQuotas.confirmReset', 'Reset all usage counters for this user?'));
    if (!confirmed) return;

    try {
      setSaving(true);
      await liveQuotasService.resetUserQuota(userId);
      await loadQuota();
    } catch (err: any) {
      setError(err?.message || 'Failed to reset quota');
      logger.error('Failed to reset quota', 'UserLiveQuotaPage', err);
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <AdminLayout>
        <View style={styles.centerContainer}>
          <ActivityIndicator size="large" color={colors.primary} />
        </View>
      </AdminLayout>
    );
  }

  return (
    <AdminLayout>
      <ScrollView style={styles.container} contentContainerStyle={styles.content}>
        <PageHeader userId={userId!} isRTL={isRTL} onBack={() => navigate(`/admin/users/${userId}`)} />

        {error && (
          <View style={styles.errorBanner}>
            <AlertCircle size={20} color={colors.error} />
            <Text style={styles.errorText}>{error}</Text>
          </View>
        )}

        {/* Current Usage Section */}
        <UsageSection quota={quota} usage={usage} isRTL={isRTL} />

        {/* Quota Limits Section */}
        <LimitsSection
          quota={quota}
          formData={formData}
          notes={notes}
          editing={editing}
          saving={saving}
          isRTL={isRTL}
          onFormDataChange={setFormData}
          onNotesChange={setNotes}
          onSave={handleSave}
          onCancel={() => setEditing(false)}
          onEdit={() => setEditing(true)}
        />

        {/* Actions Section */}
        <GlassCard style={styles.card}>
          <GlassButton
            variant="danger"
            onPress={handleReset}
            disabled={saving}
            style={styles.resetButton}
            accessibilityLabel={t('admin.liveQuotas.resetCounters', 'Reset All Usage Counters')}
            accessibilityRole="button"
          >
            <RotateCcw size={16} color={colors.white} />
            <Text style={styles.buttonText}>
              {t('admin.liveQuotas.resetCounters', 'Reset All Usage Counters')}
            </Text>
          </GlassButton>
        </GlassCard>
      </ScrollView>
    </AdminLayout>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  content: { padding: spacing.lg, gap: spacing.lg },
  centerContainer: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  errorBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    padding: spacing.md,
    backgroundColor: 'rgba(239, 68, 68, 0.1)',
    borderRadius: borderRadius.md,
    borderWidth: 1,
    borderColor: 'rgba(239, 68, 68, 0.3)',
  },
  errorText: { color: colors.error.DEFAULT, fontSize: 14, flex: 1 },
  card: { padding: spacing.lg },
  resetButton: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  buttonText: { color: colors.white, fontSize: 14, fontWeight: '600' },
});
