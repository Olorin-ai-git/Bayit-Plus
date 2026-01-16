import { useState, useEffect, useCallback } from 'react';
import { View, Text, StyleSheet, Pressable, ScrollView } from 'react-native';
import { useTranslation } from 'react-i18next';
import { Plus, Edit2, Trash2, Check } from 'lucide-react';
import { subscriptionsService } from '@/services/adminApi';
import { colors, spacing, borderRadius } from '@bayit/shared/theme';
import { GlassCard, GlassButton, GlassModal, GlassToggle, GlassInput } from '@bayit/shared/ui';
import { useDirection } from '@/hooks/useDirection';
import logger from '@/utils/logger';

interface Plan {
  id: string;
  name: string;
  name_he?: string;
  price: number;
  interval: 'monthly' | 'yearly';
  features: string[];
  is_active: boolean;
  subscribers?: number;
  trial_days?: number;
}

const formatCurrency = (amount: number) => {
  return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(amount);
};

export default function PlanManagementPage() {
  const { t } = useTranslation();
  const { isRTL, textAlign, flexDirection } = useDirection();
  const [plans, setPlans] = useState<Plan[]>([]);
  const [loading, setLoading] = useState(true);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [showErrorModal, setShowErrorModal] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [editingPlan, setEditingPlan] = useState<Plan | null>(null);
  const [planToDelete, setPlanToDelete] = useState<Plan | null>(null);
  const [formData, setFormData] = useState({
    name: '',
    name_he: '',
    price: '',
    interval: 'monthly' as 'monthly' | 'yearly',
    features: '',
    is_active: true,
    trial_days: '0',
  });

  const loadPlans = useCallback(async () => {
    setLoading(true);
    try {
      const data = await subscriptionsService.getPlans();
      setPlans(data || []);
    } catch (error) {
      logger.error('Failed to load plans', 'PlanManagementPage', error);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadPlans();
  }, [loadPlans]);

  const openCreateModal = () => {
    setEditingPlan(null);
    setFormData({ name: '', name_he: '', price: '', interval: 'monthly', features: '', is_active: true, trial_days: '0' });
    setShowEditModal(true);
  };

  const openEditModal = (plan: Plan) => {
    setEditingPlan(plan);
    setFormData({
      name: plan.name,
      name_he: plan.name_he || '',
      price: plan.price.toString(),
      interval: plan.interval,
      features: plan.features.join('\n'),
      is_active: plan.is_active,
      trial_days: (plan.trial_days || 0).toString(),
    });
    setShowEditModal(true);
  };

  const handleSave = async () => {
    if (!formData.name || !formData.price) {
      setErrorMessage(t('admin.plans.errors.requiredFields'));
      setShowErrorModal(true);
      return;
    }
    try {
      const planData = {
        name: formData.name,
        name_he: formData.name_he,
        price: parseFloat(formData.price),
        interval: formData.interval,
        features: formData.features.split('\n').filter(f => f.trim()),
        is_active: formData.is_active,
        trial_days: parseInt(formData.trial_days) || 0,
      };

      if (editingPlan) {
        await subscriptionsService.updatePlan(editingPlan.id, planData);
      } else {
        await subscriptionsService.createPlan(planData);
      }
      setShowEditModal(false);
      loadPlans();
    } catch (error) {
      logger.error('Failed to save plan', 'PlanManagementPage', error);
      setErrorMessage(t('common.errors.unexpected'));
      setShowErrorModal(true);
    }
  };

  const handleDeleteConfirm = async () => {
    if (!planToDelete) return;
    try {
      await subscriptionsService.deletePlan(planToDelete.id);
      setShowDeleteConfirm(false);
      setPlanToDelete(null);
      loadPlans();
    } catch (error) {
      logger.error('Failed to delete plan', 'PlanManagementPage', error);
      setErrorMessage(t('common.errors.unexpected'));
      setShowErrorModal(true);
    }
  };

  const handleDelete = (plan: Plan) => {
    setPlanToDelete(plan);
    setShowDeleteConfirm(true);
  };

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.contentContainer}>
      <View style={[styles.header, { flexDirection }]}>
        <View>
          <Text style={[styles.pageTitle, { textAlign }]}>{t('admin.plans.title')}</Text>
          <Text style={[styles.subtitle, { textAlign }]}>{t('admin.plans.subtitle')}</Text>
        </View>
        <GlassButton title={t('admin.plans.createButton')} variant="primary" icon={<Plus size={16} color="white" />} onPress={openCreateModal} />
      </View>

      <View style={styles.plansGrid}>
        {plans.map((plan) => (
          <GlassCard key={plan.id} style={[styles.planCard, !plan.is_active && styles.planCardInactive]}>
            <View style={[styles.planHeader, { flexDirection }]}>
              <View>
                <Text style={[styles.planName, { textAlign }]}>{plan.name_he || plan.name}</Text>
                <Text style={[styles.planNameEn, { textAlign }]}>{plan.name}</Text>
              </View>
              {!plan.is_active && (
                <View style={styles.inactiveBadge}>
                  <Text style={styles.inactiveBadgeText}>{t('admin.plans.inactive')}</Text>
                </View>
              )}
            </View>

            <View style={styles.priceContainer}>
              <Text style={styles.priceAmount}>{formatCurrency(plan.price)}</Text>
              <Text style={styles.priceInterval}>/ {t(`admin.plans.intervals.${plan.interval}`, plan.interval === 'monthly' ? 'month' : 'year')}</Text>
            </View>

            {plan.trial_days && plan.trial_days > 0 && (
              <Text style={styles.trialText}>{t('admin.plans.trialDays', { days: plan.trial_days })}</Text>
            )}

            <View style={styles.featuresContainer}>
              {plan.features.map((feature, index) => (
                <View key={index} style={[styles.featureRow, { flexDirection }]}>
                  <Check size={14} color={colors.success} />
                  <Text style={[styles.featureText, { textAlign }]}>{feature}</Text>
                </View>
              ))}
            </View>

            <View style={[styles.subscribersRow, { flexDirection }]}>
              <Text style={styles.subscribersLabel}>{t('admin.plans.subscribersLabel')}</Text>
              <Text style={styles.subscribersCount}>{(plan.subscribers || 0).toLocaleString()}</Text>
            </View>

            <View style={styles.planActions}>
              <Pressable style={styles.actionButton} onPress={() => openEditModal(plan)}>
                <Edit2 size={16} color={colors.primary} />
              </Pressable>
              <Pressable style={styles.actionButton} onPress={() => handleDelete(plan)}>
                <Trash2 size={16} color={colors.error} />
              </Pressable>
            </View>
          </GlassCard>
        ))}
      </View>

      <GlassModal
        visible={showEditModal}
        onClose={() => setShowEditModal(false)}
        title={editingPlan ? t('admin.plans.modal.editTitle') : t('admin.plans.modal.createTitle')}
      >
        <View style={styles.modalContent}>
          <View style={[styles.formRow, { flexDirection }]}>
            <View style={styles.formGroup}>
              <GlassInput label={t('admin.plans.form.nameEn')} value={formData.name} onChangeText={(name) => setFormData((p) => ({ ...p, name }))} containerStyle={styles.inputContainer} />
            </View>
            <View style={styles.formGroup}>
              <GlassInput label={t('admin.plans.form.nameHe')} value={formData.name_he} onChangeText={(name_he) => setFormData((p) => ({ ...p, name_he }))} containerStyle={styles.inputContainer} />
            </View>
          </View>

          <View style={[styles.formRow, { flexDirection }]}>
            <View style={styles.formGroup}>
              <GlassInput label={t('admin.plans.form.price')} value={formData.price} onChangeText={(price) => setFormData((p) => ({ ...p, price }))} keyboardType="decimal-pad" containerStyle={styles.inputContainer} />
            </View>
            <View style={styles.formGroup}>
              <Text style={[styles.formLabel, { textAlign }]}>{t('admin.plans.form.interval')}</Text>
              <View style={[styles.intervalButtons, { flexDirection }]}>
                <Pressable style={[styles.intervalButton, formData.interval === 'monthly' && styles.intervalButtonActive]} onPress={() => setFormData((p) => ({ ...p, interval: 'monthly' }))}>
                  <Text style={[styles.intervalButtonText, formData.interval === 'monthly' && styles.intervalButtonTextActive]}>{t('admin.plans.intervals.monthly')}</Text>
                </Pressable>
                <Pressable style={[styles.intervalButton, formData.interval === 'yearly' && styles.intervalButtonActive]} onPress={() => setFormData((p) => ({ ...p, interval: 'yearly' }))}>
                  <Text style={[styles.intervalButtonText, formData.interval === 'yearly' && styles.intervalButtonTextActive]}>{t('admin.plans.intervals.yearly')}</Text>
                </Pressable>
              </View>
            </View>
          </View>

          <View style={styles.formGroup}>
            <GlassInput label={t('admin.plans.form.trialDays')} value={formData.trial_days} onChangeText={(trial_days) => setFormData((p) => ({ ...p, trial_days }))} keyboardType="number-pad" containerStyle={styles.inputContainer} />
          </View>

          <View style={styles.formGroup}>
            <GlassInput label={t('admin.plans.form.features')} value={formData.features} onChangeText={(features) => setFormData((p) => ({ ...p, features }))} multiline numberOfLines={4} containerStyle={styles.inputContainer} />
          </View>

          <View style={styles.toggleRow}>
            <Text style={[styles.formLabel, { textAlign }]}>{t('admin.plans.form.active')}</Text>
            <GlassToggle
              value={formData.is_active}
              onValueChange={(is_active) => setFormData((p) => ({ ...p, is_active }))}
            />
          </View>

          <View style={styles.modalActions}>
            <GlassButton title={t('common.cancel')} variant="cancel" onPress={() => setShowEditModal(false)} />
            <GlassButton title={t('common.save')} variant="success" onPress={handleSave} />
          </View>
        </View>
      </GlassModal>

      <GlassModal
        visible={showDeleteConfirm}
        onClose={() => setShowDeleteConfirm(false)}
        title={t('common.confirm')}
      >
        <View style={styles.modalContent}>
          {planToDelete && (
            <Text style={styles.modalMessage}>
              {t('admin.plans.confirmDelete', { name: planToDelete.name })}
            </Text>
          )}
          <View style={styles.modalActions}>
            <GlassButton title={t('common.cancel')} variant="cancel" onPress={() => setShowDeleteConfirm(false)} />
            <GlassButton title={t('common.delete')} variant="danger" onPress={handleDeleteConfirm} />
          </View>
        </View>
      </GlassModal>

      <GlassModal
        visible={showErrorModal}
        onClose={() => setShowErrorModal(false)}
        title={t('common.error')}
      >
        <View style={styles.modalContent}>
          <Text style={styles.errorText}>{errorMessage}</Text>
          <View style={styles.modalActions}>
            <GlassButton title={t('common.ok')} variant="success" onPress={() => setShowErrorModal(false)} />
          </View>
        </View>
      </GlassModal>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  contentContainer: { padding: spacing.lg },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: spacing.lg },
  pageTitle: { fontSize: 24, fontWeight: 'bold', color: colors.text },
  subtitle: { fontSize: 14, color: colors.textMuted, marginTop: spacing.xs },
  plansGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.md },
  planCard: { width: 280, padding: spacing.lg },
  planCardInactive: { opacity: 0.6 },
  planHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: spacing.md },
  planName: { fontSize: 18, fontWeight: 'bold', color: colors.text },
  planNameEn: { fontSize: 12, color: colors.textMuted },
  inactiveBadge: { backgroundColor: 'rgba(239, 68, 68, 0.2)', paddingHorizontal: spacing.sm, paddingVertical: spacing.xs, borderRadius: borderRadius.sm },
  inactiveBadgeText: { fontSize: 10, color: colors.error },
  priceContainer: { flexDirection: 'row', alignItems: 'baseline', marginBottom: spacing.sm },
  priceAmount: { fontSize: 28, fontWeight: 'bold', color: colors.primary },
  priceInterval: { fontSize: 14, color: colors.textMuted, marginStart: spacing.xs },
  trialText: { fontSize: 12, color: colors.success, marginBottom: spacing.md },
  featuresContainer: { gap: spacing.xs, marginBottom: spacing.md },
  featureRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.xs },
  featureText: { fontSize: 13, color: colors.textSecondary },
  subscribersRow: { flexDirection: 'row', justifyContent: 'space-between', paddingTop: spacing.md, borderTopWidth: 1, borderTopColor: 'rgba(255,255,255,0.05)', marginBottom: spacing.md },
  subscribersLabel: { fontSize: 14, color: colors.textMuted },
  subscribersCount: { fontSize: 14, fontWeight: '600', color: colors.text },
  planActions: { flexDirection: 'row', justifyContent: 'flex-end', gap: spacing.sm },
  actionButton: { width: 36, height: 36, borderRadius: borderRadius.sm, backgroundColor: colors.glass, justifyContent: 'center', alignItems: 'center' },
  modalContent: { gap: spacing.md, width: '100%' },
  formRow: { flexDirection: 'row', gap: spacing.md, width: '100%' },
  formGroup: { flex: 1, gap: spacing.xs },
  formLabel: { fontSize: 14, fontWeight: '600', color: colors.text },
  inputContainer: { width: '100%' },
  intervalButtons: { flexDirection: 'row', gap: spacing.sm },
  intervalButton: { flex: 1, paddingVertical: spacing.sm, borderRadius: borderRadius.md, backgroundColor: colors.backgroundLighter, alignItems: 'center' },
  intervalButtonActive: { backgroundColor: colors.primary },
  intervalButtonText: { fontSize: 14, color: colors.textMuted },
  intervalButtonTextActive: { color: colors.text, fontWeight: '500' },
  toggleRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', width: '100%', paddingVertical: spacing.sm, marginTop: spacing.md },
  modalActions: { flexDirection: 'row', justifyContent: 'flex-end', gap: spacing.sm, marginTop: spacing.md, width: '100%' },
  modalMessage: { fontSize: 14, color: colors.text, marginBottom: spacing.md },
  errorText: { fontSize: 14, color: colors.text, marginBottom: spacing.md },
});
