import { View, Text, TextInput, StyleSheet } from 'react-native';
import { useTranslation } from 'react-i18next';
import { Clock, Save } from 'lucide-react';
import { GlassCard, GlassButton } from '@bayit/shared/ui';
import { colors, spacing, borderRadius } from '@bayit/shared/theme';
import { QuotaData } from './types';

interface LimitsSectionProps {
  quota: QuotaData | null;
  formData: Partial<QuotaData>;
  notes: string;
  editing: boolean;
  saving: boolean;
  isRTL: boolean;
  onFormDataChange: (data: Partial<QuotaData>) => void;
  onNotesChange: (notes: string) => void;
  onSave: () => void;
  onCancel: () => void;
  onEdit: () => void;
}

export default function LimitsSection({
  quota,
  formData,
  notes,
  editing,
  saving,
  isRTL,
  onFormDataChange,
  onNotesChange,
  onSave,
  onCancel,
  onEdit,
}: LimitsSectionProps) {
  const { t } = useTranslation();

  return (
    <GlassCard style={styles.card}>
      <View style={[styles.cardHeader, isRTL && styles.cardHeaderRTL]}>
        <Clock size={20} color={colors.primary} />
        <Text style={[styles.cardTitle, isRTL && styles.textRTL]}>
          {t('admin.liveQuotas.quotaLimits', 'Quota Limits')}
        </Text>
      </View>

      {editing ? (
        <View style={styles.form}>
          <View style={styles.formSection}>
            <Text style={styles.formSectionTitle}>
              {t('admin.liveQuotas.subtitleLimits', 'Subtitle Limits')}
            </Text>
            <View style={styles.formRow}>
              <Text style={styles.formLabel}>{t('admin.liveQuotas.perHour', 'Per Hour (min)')}</Text>
              <TextInput
                style={styles.formInput}
                value={String(formData.subtitle_minutes_per_hour || 0)}
                onChangeText={(v) =>
                  onFormDataChange({ ...formData, subtitle_minutes_per_hour: Number(v) })
                }
                keyboardType="numeric"
                accessibilityLabel={t('admin.liveQuotas.subtitleHourInput', 'Subtitle minutes per hour')}
              />
            </View>
            <View style={styles.formRow}>
              <Text style={styles.formLabel}>{t('admin.liveQuotas.perDay', 'Per Day (min)')}</Text>
              <TextInput
                style={styles.formInput}
                value={String(formData.subtitle_minutes_per_day || 0)}
                onChangeText={(v) =>
                  onFormDataChange({ ...formData, subtitle_minutes_per_day: Number(v) })
                }
                keyboardType="numeric"
                accessibilityLabel={t('admin.liveQuotas.subtitleDayInput', 'Subtitle minutes per day')}
              />
            </View>
            <View style={styles.formRow}>
              <Text style={styles.formLabel}>{t('admin.liveQuotas.perMonth', 'Per Month (min)')}</Text>
              <TextInput
                style={styles.formInput}
                value={String(formData.subtitle_minutes_per_month || 0)}
                onChangeText={(v) =>
                  onFormDataChange({ ...formData, subtitle_minutes_per_month: Number(v) })
                }
                keyboardType="numeric"
                accessibilityLabel={t('admin.liveQuotas.subtitleMonthInput', 'Subtitle minutes per month')}
              />
            </View>
          </View>

          <View style={styles.formSection}>
            <Text style={styles.formSectionTitle}>
              {t('admin.liveQuotas.dubbingLimits', 'Dubbing Limits')}
            </Text>
            <View style={styles.formRow}>
              <Text style={styles.formLabel}>{t('admin.liveQuotas.perHour', 'Per Hour (min)')}</Text>
              <TextInput
                style={styles.formInput}
                value={String(formData.dubbing_minutes_per_hour || 0)}
                onChangeText={(v) =>
                  onFormDataChange({ ...formData, dubbing_minutes_per_hour: Number(v) })
                }
                keyboardType="numeric"
                accessibilityLabel={t('admin.liveQuotas.dubbingHourInput', 'Dubbing minutes per hour')}
              />
            </View>
            <View style={styles.formRow}>
              <Text style={styles.formLabel}>{t('admin.liveQuotas.perDay', 'Per Day (min)')}</Text>
              <TextInput
                style={styles.formInput}
                value={String(formData.dubbing_minutes_per_day || 0)}
                onChangeText={(v) =>
                  onFormDataChange({ ...formData, dubbing_minutes_per_day: Number(v) })
                }
                keyboardType="numeric"
                accessibilityLabel={t('admin.liveQuotas.dubbingDayInput', 'Dubbing minutes per day')}
              />
            </View>
            <View style={styles.formRow}>
              <Text style={styles.formLabel}>{t('admin.liveQuotas.perMonth', 'Per Month (min)')}</Text>
              <TextInput
                style={styles.formInput}
                value={String(formData.dubbing_minutes_per_month || 0)}
                onChangeText={(v) =>
                  onFormDataChange({ ...formData, dubbing_minutes_per_month: Number(v) })
                }
                keyboardType="numeric"
                accessibilityLabel={t('admin.liveQuotas.dubbingMonthInput', 'Dubbing minutes per month')}
              />
            </View>
          </View>

          <View style={styles.formSection}>
            <Text style={styles.formLabel}>{t('admin.liveQuotas.notes', 'Admin Notes')}</Text>
            <TextInput
              style={styles.formTextArea}
              value={notes}
              onChangeText={onNotesChange}
              multiline
              numberOfLines={3}
              placeholder={t('admin.liveQuotas.notesPlaceholder', 'Reason for extending limits...')}
              accessibilityLabel={t('admin.liveQuotas.notesLabel', 'Admin notes')}
            />
          </View>

          <View style={[styles.buttonRow, isRTL && styles.buttonRowRTL]}>
            <GlassButton
              variant="primary"
              onPress={onSave}
              disabled={saving}
              style={styles.button}
            >
              <Save size={16} color={colors.white} />
              <Text style={styles.buttonText}>{t('common.save', 'Save Changes')}</Text>
            </GlassButton>
            <GlassButton
              variant="secondary"
              onPress={onCancel}
              disabled={saving}
              style={styles.button}
            >
              <Text style={styles.buttonSecondaryText}>{t('common.cancel', 'Cancel')}</Text>
            </GlassButton>
          </View>
        </View>
      ) : (
        <View>
          <View style={styles.limitsDisplay}>
            <Text style={styles.limitsText}>
              <Text style={styles.limitsLabel}>
                {t('admin.liveQuotas.subtitleLimits', 'Subtitle Limits')}:
              </Text>{' '}
              {quota?.subtitle_minutes_per_hour}m/hr, {quota?.subtitle_minutes_per_day}m/day,{' '}
              {quota?.subtitle_minutes_per_month}m/month
            </Text>
            <Text style={styles.limitsText}>
              <Text style={styles.limitsLabel}>
                {t('admin.liveQuotas.dubbingLimits', 'Dubbing Limits')}:
              </Text>{' '}
              {quota?.dubbing_minutes_per_hour}m/hr, {quota?.dubbing_minutes_per_day}m/day,{' '}
              {quota?.dubbing_minutes_per_month}m/month
            </Text>
          </View>
          <GlassButton variant="primary" onPress={onEdit} style={styles.button}>
            <Text style={styles.buttonText}>{t('admin.liveQuotas.editLimits', 'Edit Limits')}</Text>
          </GlassButton>
        </View>
      )}
    </GlassCard>
  );
}

const styles = StyleSheet.create({
  card: {
    padding: spacing.lg,
    gap: spacing.md,
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    marginBottom: spacing.sm,
  },
  cardHeaderRTL: {
    flexDirection: 'row-reverse',
  },
  cardTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: colors.text,
  },
  textRTL: {
    textAlign: 'right',
  },
  form: {
    gap: spacing.lg,
  },
  formSection: {
    gap: spacing.md,
  },
  formSectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.text,
    marginBottom: spacing.xs,
  },
  formRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: spacing.md,
  },
  formLabel: {
    color: colors.textSecondary,
    fontSize: 14,
    flex: 1,
  },
  formInput: {
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
    borderRadius: borderRadius.md,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    color: colors.text,
    fontSize: 14,
    width: 120,
  },
  formTextArea: {
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
    borderRadius: borderRadius.md,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    color: colors.text,
    fontSize: 14,
    minHeight: 80,
    textAlignVertical: 'top',
  },
  buttonRow: {
    flexDirection: 'row',
    gap: spacing.md,
  },
  buttonRowRTL: {
    flexDirection: 'row-reverse',
  },
  button: {
    flex: 1,
  },
  buttonText: {
    color: colors.white,
    fontSize: 14,
    fontWeight: '600',
  },
  buttonSecondaryText: {
    color: colors.textSecondary,
    fontSize: 14,
    fontWeight: '600',
  },
  limitsDisplay: {
    gap: spacing.md,
    marginBottom: spacing.lg,
  },
  limitsText: {
    color: colors.textSecondary,
    fontSize: 14,
    lineHeight: 20,
  },
  limitsLabel: {
    color: colors.text,
    fontWeight: '600',
  },
});
