/**
 * PlanManagementScreen
 * Subscription plan management with pricing and features configuration
 */

import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  Modal,
  TextInput,
  Switch,
  ActivityIndicator,
} from 'react-native';
import { useTranslation } from 'react-i18next';
import { useNotifications } from '@olorin/glass-ui/hooks';
import { AdminLayout } from '../../components/admin/AdminLayout';
import { subscriptionsService, SubscriptionPlan } from '../../services/adminApi';
import { colors, spacing, borderRadius, fontSize } from '../../theme';
import { formatCurrency } from '../../utils/formatters';
import { getPlanColor } from '../../utils/adminConstants';
import { logger } from '../../utils/logger';

// Scoped logger for plan management screen
const planManagementLogger = logger.scope('Admin:PlanManagement');

export const PlanManagementScreen: React.FC = () => {
  const { t } = useTranslation();
  const notifications = useNotifications();
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
      planManagementLogger.error('Error loading plans', {
        error: err instanceof Error ? err.message : String(err),
        stack: err instanceof Error ? err.stack : undefined,
      });
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
      notifications.showError(t('admin.plans.requiredFields', 'Name and price are required'), t('common.error', 'Error'));
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
      notifications.showSuccess(
        editingPlan
          ? t('admin.plans.updated', 'Plan updated successfully')
          : t('admin.plans.created', 'Plan created successfully'),
        t('common.success', 'Success')
      );
    } catch (error) {
      planManagementLogger.error('Error saving plan', {
        isEdit: !!editingPlan,
        planId: editingPlan?.id,
        formData: {
          name: formData.name,
          price: formData.price,
          interval: formData.interval,
        },
        error: error instanceof Error ? error.message : String(error),
        stack: error instanceof Error ? error.stack : undefined,
      });
      notifications.showError(t('admin.plans.saveError', 'Failed to save plan'), t('common.error', 'Error'));
    } finally {
      setSaving(false);
    }
  };

  const handleDeletePlan = async (plan: SubscriptionPlan) => {
    notifications.show({
      level: 'warning',
      title: t('admin.plans.deleteConfirm', 'Delete Plan'),
      message: t('admin.plans.deleteMessage', `Are you sure you want to delete "${plan.name}"?`),
      dismissable: true,
      action: {
        label: t('common.delete', 'Delete'),
        type: 'action',
        onPress: async () => {
          try {
            await subscriptionsService.deletePlan(plan.id);
            loadPlans();
          } catch (error) {
            planManagementLogger.error('Error deleting plan', {
              planId: plan.id,
              planName: plan.name,
              error: error instanceof Error ? error.message : String(error),
              stack: error instanceof Error ? error.stack : undefined,
            });
          }
        },
      },
    });
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
        <View className="flex-1 justify-center items-center">
          <ActivityIndicator size="large" color={colors.primary} />
        </View>
      </AdminLayout>
    );
  }

  return (
    <AdminLayout
      title={t('admin.titles.planManagement', 'Plan Management')}
      actions={
        <TouchableOpacity className="px-4 py-2 bg-[#00BFFF] rounded-md" onPress={handleCreatePlan}>
          <Text className="text-sm text-white font-semibold">+ {t('admin.plans.createPlan', 'Create Plan')}</Text>
        </TouchableOpacity>
      }
    >
      <ScrollView className="flex-1" contentContainerStyle={{ padding: spacing.lg }}>
        <View className="flex-row flex-wrap gap-4">
          {plans.map((plan) => (
            <View key={plan.id} className={`w-[280px] bg-white/10 rounded-2xl border border-white/20 p-4 relative ${plan.is_active ? '' : 'opacity-60'}`}>
              {!plan.is_active && (
                <View className="absolute top-2 right-2 bg-[#FF4444] px-2 py-0.5 rounded-sm">
                  <Text className="text-xs text-white font-semibold">{t('admin.plans.inactive', 'Inactive')}</Text>
                </View>
              )}

              <View className="flex-row justify-between items-center mb-4">
                <Text className="text-xl font-bold text-white">{plan.name}</Text>
                <View className="flex-row gap-1">
                  <TouchableOpacity className="w-7 h-7 rounded-sm bg-[#1a1a1a] justify-center items-center" onPress={() => handleEditPlan(plan)}>
                    <Text className="text-sm">✏️</Text>
                  </TouchableOpacity>
                  <TouchableOpacity className="w-7 h-7 rounded-sm bg-[#1a1a1a] justify-center items-center" onPress={() => handleDeletePlan(plan)}>
                    <Text className="text-sm">🗑️</Text>
                  </TouchableOpacity>
                </View>
              </View>

              <View className="flex-row items-baseline mb-4">
                <Text className="text-[32px] font-bold text-[#00BFFF]">{formatCurrency(plan.price)}</Text>
                <Text className="text-sm text-[#999999] ml-1">/ {plan.interval === 'monthly' ? t('admin.plans.mo') : t('admin.plans.yr')}</Text>
              </View>

              {plan.trial_days > 0 && (
                <View className="bg-[#4CAF50]/20 px-2 py-1 rounded-sm self-start mb-4">
                  <Text className="text-xs text-[#4CAF50] font-semibold">{t('admin.plans.freeTrial', { days: plan.trial_days })}</Text>
                </View>
              )}

              <View className="mb-4">
                {plan.features.map((feature, index) => (
                  <View key={index} className="flex-row items-center mb-1">
                    <Text className="text-sm text-[#4CAF50] mr-2">✓</Text>
                    <Text className="text-sm text-[#cccccc]">{feature}</Text>
                  </View>
                ))}
              </View>

              <View className="border-t border-white/20 pt-2">
                <Text className="text-xs text-[#666666]">
                  {t('admin.plans.created', 'Created')}: {new Date(plan.created_at).toLocaleDateString()}
                </Text>
              </View>
            </View>
          ))}

          {/* Add Plan Card */}
          <TouchableOpacity className="w-[280px] h-[300px] bg-[#1a1a1a] rounded-2xl border-2 border-dashed border-white/20 justify-center items-center" onPress={handleCreatePlan}>
            <Text className="text-5xl text-[#666666] mb-2">+</Text>
            <Text className="text-base text-[#cccccc]">{t('admin.plans.addNew', 'Add New Plan')}</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>

      {/* Plan Editor Modal */}
      <Modal visible={showPlanModal} transparent animationType="fade" onRequestClose={() => setShowPlanModal(false)}>
        <View className="flex-1 bg-black/80 justify-center items-center">
          <View className="w-[90%] max-w-[500px] max-h-[80%] bg-[#1a1a1a] rounded-2xl p-4 border border-white/20">
            <ScrollView showsVerticalScrollIndicator={false}>
              <Text className="text-xl font-bold text-white mb-4">
                {editingPlan ? t('admin.plans.editPlan', 'Edit Plan') : t('admin.plans.createPlan', 'Create Plan')}
              </Text>

              <View className="mb-4">
                <Text className="text-sm font-semibold text-white mb-1">{t('admin.plans.name', 'Plan Name')}</Text>
                <TextInput
                  className="bg-[#1a1a1a] rounded-md border border-white/20 px-4 py-2 text-white text-base"
                  value={formData.name}
                  onChangeText={(text) => setFormData(prev => ({ ...prev, name: text }))}
                  placeholder={t('admin.plans.namePlaceholder', 'e.g., Premium')}
                  placeholderTextColor={colors.textMuted}
                />
              </View>

              <View className="flex-row gap-4">
                <View className="flex-1 mb-4">
                  <Text className="text-sm font-semibold text-white mb-1">{t('admin.plans.price', 'Price ($)')}</Text>
                  <TextInput
                    className="bg-[#1a1a1a] rounded-md border border-white/20 px-4 py-2 text-white text-base"
                    value={formData.price}
                    onChangeText={(text) => setFormData(prev => ({ ...prev, price: text }))}
                    keyboardType="numeric"
                    placeholder={t('placeholder.amount.price', '0.00')}
                    placeholderTextColor={colors.textMuted}
                  />
                </View>
                <View className="flex-1 mb-4">
                  <Text className="text-sm font-semibold text-white mb-1">{t('admin.plans.interval', 'Billing Interval')}</Text>
                  <View className="flex-row bg-[#1a1a1a] rounded-md p-0.5">
                    {(['monthly', 'yearly'] as const).map((interval) => (
                      <TouchableOpacity
                        key={interval}
                        className={`flex-1 py-2 items-center rounded-sm ${formData.interval === interval ? 'bg-[#00BFFF]' : ''}`}
                        onPress={() => setFormData(prev => ({ ...prev, interval }))}
                      >
                        <Text className={`text-sm ${formData.interval === interval ? 'text-white font-semibold' : 'text-[#cccccc]'}`}>
                          {interval === 'monthly' ? t('admin.plans.monthly') : t('admin.plans.yearly')}
                        </Text>
                      </TouchableOpacity>
                    ))}
                  </View>
                </View>
              </View>

              <View className="mb-4">
                <Text className="text-sm font-semibold text-white mb-1">{t('admin.plans.trialDays', 'Trial Days')}</Text>
                <TextInput
                  className="bg-[#1a1a1a] rounded-md border border-white/20 px-4 py-2 text-white text-base"
                  value={formData.trial_days}
                  onChangeText={(text) => setFormData(prev => ({ ...prev, trial_days: text }))}
                  keyboardType="numeric"
                  placeholder={t('placeholder.number', '0')}
                  placeholderTextColor={colors.textMuted}
                />
              </View>

              <View className="mb-4">
                <View className="flex-row justify-between items-center mb-1">
                  <Text className="text-sm font-semibold text-white">{t('admin.plans.features', 'Features')}</Text>
                  <TouchableOpacity onPress={handleAddFeature}>
                    <Text className="text-sm text-[#00BFFF]">+ {t('admin.plans.addFeature', 'Add')}</Text>
                  </TouchableOpacity>
                </View>
                {formData.features.map((feature, index) => (
                  <View key={index} className="flex-row items-center mb-1">
                    <TextInput
                      className="flex-1 bg-[#1a1a1a] rounded-md border border-white/20 px-4 py-2 text-white text-base"
                      value={feature}
                      onChangeText={(text) => handleFeatureChange(index, text)}
                      placeholder={t('admin.plans.featurePlaceholder', 'Enter feature...')}
                      placeholderTextColor={colors.textMuted}
                    />
                    {formData.features.length > 1 && (
                      <TouchableOpacity className="w-[30px] h-[30px] ml-1 rounded-sm bg-[#FF4444]/30 justify-center items-center" onPress={() => handleRemoveFeature(index)}>
                        <Text className="text-sm text-[#FF4444]">✕</Text>
                      </TouchableOpacity>
                    )}
                  </View>
                ))}
              </View>

              <View className="flex-row justify-between items-center mb-4 py-2">
                <Text className="text-sm font-semibold text-white">{t('admin.plans.active', 'Active')}</Text>
                <Switch
                  value={formData.is_active}
                  onValueChange={(value) => setFormData(prev => ({ ...prev, is_active: value }))}
                  trackColor={{ false: colors.backgroundLighter, true: colors.primary + '50' }}
                  thumbColor={formData.is_active ? colors.primary : colors.textMuted}
                />
              </View>

              <View className="flex-row justify-end gap-2">
                <TouchableOpacity className="px-4 py-2 bg-[#1a1a1a] rounded-md" onPress={() => setShowPlanModal(false)}>
                  <Text className="text-sm text-[#cccccc]">{t('common.cancel', 'Cancel')}</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  className={`px-4 py-2 bg-[#00BFFF] rounded-md min-w-[80px] items-center ${saving ? 'opacity-60' : ''}`}
                  onPress={handleSavePlan}
                  disabled={saving}
                >
                  {saving ? (
                    <ActivityIndicator size="small" color={colors.text} />
                  ) : (
                    <Text className="text-sm text-white font-semibold">{t('common.save', 'Save')}</Text>
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

export default PlanManagementScreen;
