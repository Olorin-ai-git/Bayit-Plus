/**
 * PlanManagementScreen
 * Subscription plan management with pricing and features configuration
 */

import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Modal,
  TextInput,
  Switch,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { useTranslation } from 'react-i18next';
import { AdminLayout } from '@bayit/shared/admin';
import { subscriptionsService, SubscriptionPlan } from '../../services/adminApi';
import { colors, spacing, borderRadius, fontSize } from '@bayit/shared/theme';
import { formatCurrency } from '../../utils/formatters';
import { getPlanColor } from '../../utils/adminConstants';

export const PlanManagementScreen: React.FC = () => {
  const { t } = useTranslation();
  const [plans, setPlans] = useState<SubscriptionPlan[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showPlanModal, setShowPlanModal] = useState(false);
  const [editingPlan, setEditingPlan] = useState<SubscriptionPlan | null>(null);
  const [saving, setSaving] = useState(false);

  const [formData, setFormData] = useState({
    name: '',
    price: '',
    interval: 'monthly' as 'monthly' | 'yearly',
    features: [''],
    is_active: true,
    trial_days: '7',
  });

  const loadPlans = async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await subscriptionsService.getPlans();
      setPlans(data);
    } catch (err) {
      console.error('Error loading plans:', err);
      setError(t('admin.plans.loadError', 'Failed to load subscription plans. Please try again.'));
      setPlans([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadPlans();
  }, []);

  const handleCreatePlan = () => {
    setEditingPlan(null);
    setFormData({
      name: '',
      price: '',
      interval: 'monthly',
      features: [''],
      is_active: true,
      trial_days: '7',
    });
    setShowPlanModal(true);
  };

  const handleEditPlan = (plan: SubscriptionPlan) => {
    setEditingPlan(plan);
    setFormData({
      name: plan.name,
      price: plan.price.toString(),
      interval: plan.interval,
      features: plan.features.length > 0 ? plan.features : [''],
      is_active: plan.is_active,
      trial_days: plan.trial_days.toString(),
    });
    setShowPlanModal(true);
  };

  const handleSavePlan = async () => {
    if (!formData.name.trim() || !formData.price) {
      Alert.alert(t('common.error', 'Error'), t('admin.plans.requiredFields', 'Name and price are required'));
      return;
    }

    setSaving(true);
    try {
      const payload: Partial<SubscriptionPlan> = {
        name: formData.name,
        price: parseFloat(formData.price),
        currency: 'USD',
        interval: formData.interval,
        features: formData.features.filter(f => f.trim()),
        is_active: formData.is_active,
        trial_days: parseInt(formData.trial_days) || 0,
      };

      if (editingPlan) {
        await subscriptionsService.updatePlan(editingPlan.id, payload);
      } else {
        await subscriptionsService.createPlan(payload);
      }

      setShowPlanModal(false);
      loadPlans();
      Alert.alert(
        t('common.success', 'Success'),
        editingPlan
          ? t('admin.plans.updated', 'Plan updated successfully')
          : t('admin.plans.created', 'Plan created successfully')
      );
    } catch (error) {
      console.error('Error saving plan:', error);
      Alert.alert(t('common.error', 'Error'), t('admin.plans.saveError', 'Failed to save plan'));
    } finally {
      setSaving(false);
    }
  };

  const handleDeletePlan = async (plan: SubscriptionPlan) => {
    Alert.alert(
      t('admin.plans.deleteConfirm', 'Delete Plan'),
      t('admin.plans.deleteMessage', `Are you sure you want to delete "${plan.name}"?`),
      [
        { text: t('common.cancel', 'Cancel'), style: 'cancel' },
        {
          text: t('common.delete', 'Delete'),
          style: 'destructive',
          onPress: async () => {
            try {
              await subscriptionsService.deletePlan(plan.id);
              loadPlans();
            } catch (error) {
              console.error('Error deleting plan:', error);
            }
          },
        },
      ]
    );
  };

  const handleAddFeature = () => {
    setFormData(prev => ({ ...prev, features: [...prev.features, ''] }));
  };

  const handleRemoveFeature = (index: number) => {
    setFormData(prev => ({
      ...prev,
      features: prev.features.filter((_, i) => i !== index),
    }));
  };

  const handleFeatureChange = (index: number, value: string) => {
    setFormData(prev => ({
      ...prev,
      features: prev.features.map((f, i) => (i === index ? value : f)),
    }));
  };

  if (loading) {
    return (
      <AdminLayout title={t('admin.titles.planManagement', 'Plan Management')}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={colors.primary} />
        </View>
      </AdminLayout>
    );
  }

  return (
    <AdminLayout
      title={t('admin.titles.planManagement', 'Plan Management')}
      actions={
        <TouchableOpacity style={styles.addButton} onPress={handleCreatePlan}>
          <Text style={styles.addButtonText}>+ {t('admin.plans.createPlan', 'Create Plan')}</Text>
        </TouchableOpacity>
      }
    >
      <ScrollView style={styles.container} contentContainerStyle={styles.contentContainer}>
        <View style={styles.plansGrid}>
          {plans.map((plan) => (
            <View key={plan.id} style={[styles.planCard, !plan.is_active && styles.planCardInactive]}>
              {!plan.is_active && (
                <View style={styles.inactiveBadge}>
                  <Text style={styles.inactiveBadgeText}>{t('admin.plans.inactive', 'Inactive')}</Text>
                </View>
              )}

              <View style={styles.planHeader}>
                <Text style={styles.planName}>{plan.name}</Text>
                <View style={styles.planActions}>
                  <TouchableOpacity style={styles.planAction} onPress={() => handleEditPlan(plan)}>
                    <Text style={styles.planActionIcon}>✏️</Text>
                  </TouchableOpacity>
                  <TouchableOpacity style={styles.planAction} onPress={() => handleDeletePlan(plan)}>
                    <Text style={styles.planActionIcon}>🗑️</Text>
                  </TouchableOpacity>
                </View>
              </View>

              <View style={styles.planPricing}>
                <Text style={styles.planPrice}>{formatCurrency(plan.price)}</Text>
                <Text style={styles.planInterval}>/ {plan.interval === 'monthly' ? t('admin.plans.mo') : t('admin.plans.yr')}</Text>
              </View>

              {plan.trial_days > 0 && (
                <View style={styles.trialBadge}>
                  <Text style={styles.trialBadgeText}>{t('admin.plans.freeTrial', { days: plan.trial_days })}</Text>
                </View>
              )}

              <View style={styles.planFeatures}>
                {plan.features.map((feature, index) => (
                  <View key={index} style={styles.featureRow}>
                    <Text style={styles.featureCheck}>✓</Text>
                    <Text style={styles.featureText}>{feature}</Text>
                  </View>
                ))}
              </View>

              <View style={styles.planMeta}>
                <Text style={styles.planMetaText}>
                  {t('admin.plans.created', 'Created')}: {new Date(plan.created_at).toLocaleDateString()}
                </Text>
              </View>
            </View>
          ))}

          {/* Add Plan Card */}
          <TouchableOpacity style={styles.addPlanCard} onPress={handleCreatePlan}>
            <Text style={styles.addPlanIcon}>+</Text>
            <Text style={styles.addPlanText}>{t('admin.plans.addNew', 'Add New Plan')}</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>

      {/* Plan Editor Modal */}
      <Modal visible={showPlanModal} transparent animationType="fade" onRequestClose={() => setShowPlanModal(false)}>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <ScrollView showsVerticalScrollIndicator={false}>
              <Text style={styles.modalTitle}>
                {editingPlan ? t('admin.plans.editPlan', 'Edit Plan') : t('admin.plans.createPlan', 'Create Plan')}
              </Text>

              <View style={styles.formGroup}>
                <Text style={styles.formLabel}>{t('admin.plans.name', 'Plan Name')}</Text>
                <TextInput
                  style={styles.formInput}
                  value={formData.name}
                  onChangeText={(text) => setFormData(prev => ({ ...prev, name: text }))}
                  placeholder={t('admin.plans.namePlaceholder', 'e.g., Premium')}
                  placeholderTextColor={colors.textMuted}
                />
              </View>

              <View style={styles.formRow}>
                <View style={[styles.formGroup, { flex: 1 }]}>
                  <Text style={styles.formLabel}>{t('admin.plans.price', 'Price ($)')}</Text>
                  <TextInput
                    style={styles.formInput}
                    value={formData.price}
                    onChangeText={(text) => setFormData(prev => ({ ...prev, price: text }))}
                    keyboardType="numeric"
                    placeholder="0.00"
                    placeholderTextColor={colors.textMuted}
                  />
                </View>
                <View style={[styles.formGroup, { flex: 1 }]}>
                  <Text style={styles.formLabel}>{t('admin.plans.interval', 'Billing Interval')}</Text>
                  <View style={styles.intervalSelector}>
                    {(['monthly', 'yearly'] as const).map((interval) => (
                      <TouchableOpacity
                        key={interval}
                        style={[styles.intervalOption, formData.interval === interval && styles.intervalOptionActive]}
                        onPress={() => setFormData(prev => ({ ...prev, interval }))}
                      >
                        <Text style={[styles.intervalOptionText, formData.interval === interval && styles.intervalOptionTextActive]}>
                          {interval === 'monthly' ? t('admin.plans.monthly') : t('admin.plans.yearly')}
                        </Text>
                      </TouchableOpacity>
                    ))}
                  </View>
                </View>
              </View>

              <View style={styles.formGroup}>
                <Text style={styles.formLabel}>{t('admin.plans.trialDays', 'Trial Days')}</Text>
                <TextInput
                  style={styles.formInput}
                  value={formData.trial_days}
                  onChangeText={(text) => setFormData(prev => ({ ...prev, trial_days: text }))}
                  keyboardType="numeric"
                  placeholder="0"
                  placeholderTextColor={colors.textMuted}
                />
              </View>

              <View style={styles.formGroup}>
                <View style={styles.formLabelRow}>
                  <Text style={styles.formLabel}>{t('admin.plans.features', 'Features')}</Text>
                  <TouchableOpacity onPress={handleAddFeature}>
                    <Text style={styles.addFeatureButton}>+ {t('admin.plans.addFeature', 'Add')}</Text>
                  </TouchableOpacity>
                </View>
                {formData.features.map((feature, index) => (
                  <View key={index} style={styles.featureInputRow}>
                    <TextInput
                      style={[styles.formInput, styles.featureInput]}
                      value={feature}
                      onChangeText={(text) => handleFeatureChange(index, text)}
                      placeholder={t('admin.plans.featurePlaceholder', 'Enter feature...')}
                      placeholderTextColor={colors.textMuted}
                    />
                    {formData.features.length > 1 && (
                      <TouchableOpacity style={styles.removeFeatureButton} onPress={() => handleRemoveFeature(index)}>
                        <Text style={styles.removeFeatureIcon}>✕</Text>
                      </TouchableOpacity>
                    )}
                  </View>
                ))}
              </View>

              <View style={styles.switchRow}>
                <Text style={styles.switchLabel}>{t('admin.plans.active', 'Active')}</Text>
                <Switch
                  value={formData.is_active}
                  onValueChange={(value) => setFormData(prev => ({ ...prev, is_active: value }))}
                  trackColor={{ false: colors.backgroundLighter, true: colors.primary + '50' }}
                  thumbColor={formData.is_active ? colors.primary : colors.textMuted}
                />
              </View>

              <View style={styles.modalActions}>
                <TouchableOpacity style={styles.modalCancelButton} onPress={() => setShowPlanModal(false)}>
                  <Text style={styles.modalCancelText}>{t('common.cancel', 'Cancel')}</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.modalSaveButton, saving && styles.modalSaveButtonDisabled]}
                  onPress={handleSavePlan}
                  disabled={saving}
                >
                  {saving ? (
                    <ActivityIndicator size="small" color={colors.text} />
                  ) : (
                    <Text style={styles.modalSaveText}>{t('common.save', 'Save')}</Text>
                  )}
                </TouchableOpacity>
              </View>
            </ScrollView>
          </View>
        </View>
      </Modal>
    </AdminLayout>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1 },
  contentContainer: { padding: spacing.lg },
  loadingContainer: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  addButton: { paddingHorizontal: spacing.md, paddingVertical: spacing.sm, backgroundColor: colors.secondary, borderRadius: borderRadius.md },
  addButtonText: { fontSize: fontSize.sm, color: colors.text, fontWeight: '600' },
  plansGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.lg },
  planCard: { width: 280, backgroundColor: colors.glass, borderRadius: borderRadius.lg, borderWidth: 1, borderColor: colors.glassBorder, padding: spacing.lg, position: 'relative' },
  planCardInactive: { opacity: 0.6 },
  inactiveBadge: { position: 'absolute', top: spacing.sm, right: spacing.sm, backgroundColor: colors.error, paddingHorizontal: spacing.sm, paddingVertical: 2, borderRadius: borderRadius.sm },
  inactiveBadgeText: { fontSize: fontSize.xs, color: colors.text, fontWeight: '600' },
  planHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: spacing.md },
  planName: { fontSize: fontSize.xl, fontWeight: 'bold', color: colors.text },
  planActions: { flexDirection: 'row', gap: spacing.xs },
  planAction: { width: 28, height: 28, borderRadius: borderRadius.sm, backgroundColor: colors.backgroundLighter, justifyContent: 'center', alignItems: 'center' },
  planActionIcon: { fontSize: 14 },
  planPricing: { flexDirection: 'row', alignItems: 'baseline', marginBottom: spacing.md },
  planPrice: { fontSize: 32, fontWeight: 'bold', color: colors.primary },
  planInterval: { fontSize: fontSize.sm, color: colors.textSecondary, marginLeft: spacing.xs },
  trialBadge: { backgroundColor: colors.success + '20', paddingHorizontal: spacing.sm, paddingVertical: spacing.xs, borderRadius: borderRadius.sm, alignSelf: 'flex-start', marginBottom: spacing.md },
  trialBadgeText: { fontSize: fontSize.xs, color: colors.success, fontWeight: '600' },
  planFeatures: { marginBottom: spacing.md },
  featureRow: { flexDirection: 'row', alignItems: 'center', marginBottom: spacing.xs },
  featureCheck: { fontSize: 14, color: colors.success, marginRight: spacing.sm },
  featureText: { fontSize: fontSize.sm, color: colors.textSecondary },
  planMeta: { borderTopWidth: 1, borderTopColor: colors.glassBorder, paddingTop: spacing.sm },
  planMetaText: { fontSize: fontSize.xs, color: colors.textMuted },
  addPlanCard: { width: 280, height: 300, backgroundColor: colors.backgroundLighter, borderRadius: borderRadius.lg, borderWidth: 2, borderColor: colors.glassBorder, borderStyle: 'dashed', justifyContent: 'center', alignItems: 'center' },
  addPlanIcon: { fontSize: 48, color: colors.textMuted, marginBottom: spacing.sm },
  addPlanText: { fontSize: fontSize.md, color: colors.textSecondary },
  modalOverlay: { flex: 1, backgroundColor: colors.overlay, justifyContent: 'center', alignItems: 'center' },
  modalContent: { width: '90%', maxWidth: 500, maxHeight: '80%', backgroundColor: colors.backgroundLight, borderRadius: borderRadius.lg, padding: spacing.lg, borderWidth: 1, borderColor: colors.glassBorder },
  modalTitle: { fontSize: fontSize.xl, fontWeight: 'bold', color: colors.text, marginBottom: spacing.lg },
  formGroup: { marginBottom: spacing.md },
  formRow: { flexDirection: 'row', gap: spacing.md },
  formLabel: { fontSize: fontSize.sm, fontWeight: '600', color: colors.text, marginBottom: spacing.xs },
  formLabelRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: spacing.xs },
  formInput: { backgroundColor: colors.backgroundLighter, borderRadius: borderRadius.md, borderWidth: 1, borderColor: colors.glassBorder, paddingHorizontal: spacing.md, paddingVertical: spacing.sm, color: colors.text, fontSize: fontSize.md },
  intervalSelector: { flexDirection: 'row', backgroundColor: colors.backgroundLighter, borderRadius: borderRadius.md, padding: 2 },
  intervalOption: { flex: 1, paddingVertical: spacing.sm, alignItems: 'center', borderRadius: borderRadius.sm },
  intervalOptionActive: { backgroundColor: colors.primary },
  intervalOptionText: { fontSize: fontSize.sm, color: colors.textSecondary },
  intervalOptionTextActive: { color: colors.text, fontWeight: '600' },
  addFeatureButton: { fontSize: fontSize.sm, color: colors.primary },
  featureInputRow: { flexDirection: 'row', alignItems: 'center', marginBottom: spacing.xs },
  featureInput: { flex: 1 },
  removeFeatureButton: { width: 30, height: 30, marginLeft: spacing.xs, borderRadius: borderRadius.sm, backgroundColor: colors.error + '30', justifyContent: 'center', alignItems: 'center' },
  removeFeatureIcon: { fontSize: 14, color: colors.error },
  switchRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: spacing.lg, paddingVertical: spacing.sm },
  switchLabel: { fontSize: fontSize.sm, fontWeight: '600', color: colors.text },
  modalActions: { flexDirection: 'row', justifyContent: 'flex-end', gap: spacing.sm },
  modalCancelButton: { paddingHorizontal: spacing.lg, paddingVertical: spacing.sm, backgroundColor: colors.backgroundLighter, borderRadius: borderRadius.md },
  modalCancelText: { fontSize: fontSize.sm, color: colors.textSecondary },
  modalSaveButton: { paddingHorizontal: spacing.lg, paddingVertical: spacing.sm, backgroundColor: colors.primary, borderRadius: borderRadius.md, minWidth: 80, alignItems: 'center' },
  modalSaveButtonDisabled: { opacity: 0.6 },
  modalSaveText: { fontSize: fontSize.sm, color: colors.text, fontWeight: '600' },
});

export default PlanManagementScreen;
