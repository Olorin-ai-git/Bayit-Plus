/**
 * CampaignDetailScreen
 * Full campaign editor with targeting, scheduling, and promo code management
 */

import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Modal,
  ActivityIndicator,
  Switch,
} from 'react-native';
import { useTranslation } from 'react-i18next';
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import { AdminLayout } from '../../components/admin/AdminLayout';
import { campaignsService } from '../../services/adminApi';
import { Campaign, AudienceFilter } from '../../types/rbac';
import { colors, spacing, borderRadius, fontSize } from '../../theme';
import { AdminStackParamList } from '../../navigation/AdminNavigator';
import { useNotifications } from '@olorin/glass-ui/hooks';

type CampaignDetailRouteProp = RouteProp<AdminStackParamList, 'CampaignDetail'>;

type CampaignType = 'discount' | 'trial' | 'referral' | 'promotional';
type DiscountType = 'percentage' | 'fixed' | 'trial_days';

export const CampaignDetailScreen: React.FC = () => {
  const { t } = useTranslation();
  const navigation = useNavigation<any>();
  const route = useRoute<CampaignDetailRouteProp>();
  const { campaignId } = route.params;
  const notifications = useNotifications();

  const isNewCampaign = !campaignId;

  const [loading, setLoading] = useState(!isNewCampaign);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [campaign, setCampaign] = useState<Campaign | null>(null);
  const [showDatePicker, setShowDatePicker] = useState<'start' | 'end' | null>(null);
  const [showAudienceBuilder, setShowAudienceBuilder] = useState(false);

  const [formData, setFormData] = useState({
    name: '',
    description: '',
    type: 'discount' as CampaignType,
    promo_code: '',
    discount_type: 'percentage' as DiscountType,
    discount_value: 0,
    usage_limit: 0,
    start_date: new Date().toISOString().split('T')[0],
    end_date: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
    target_audience: {} as AudienceFilter,
    is_active: false,
    auto_apply: false,
    minimum_purchase: 0,
    max_discount_amount: 0,
    first_purchase_only: false,
    stackable: false,
  });

  useEffect(() => {
    if (!isNewCampaign) {
      loadCampaign();
    }
  }, [campaignId]);

  const loadCampaign = async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await campaignsService.getCampaign(campaignId!);
      setCampaign(data);
      setFormData({
        name: data.name,
        description: data.description || '',
        type: data.type as CampaignType,
        promo_code: data.promo_code || '',
        discount_type: data.discount_type as DiscountType,
        discount_value: data.discount_value,
        usage_limit: data.usage_limit || 0,
        start_date: data.start_date?.split('T')[0] || new Date().toISOString().split('T')[0],
        end_date: data.end_date?.split('T')[0] || new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
        target_audience: data.target_audience || {},
        is_active: data.status === 'active',
        auto_apply: false,
        minimum_purchase: 0,
        max_discount_amount: 0,
        first_purchase_only: false,
        stackable: false,
      });
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : t('admin.campaigns.loadError', 'Failed to load campaign');
      setError(errorMessage);
      notifications.showError(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    if (!formData.name.trim()) {
      notifications.showError(t('admin.campaigns.nameRequired', 'Campaign name is required'));
      return;
    }

    if (formData.discount_value <= 0) {
      notifications.showError(t('admin.campaigns.discountRequired', 'Discount value must be greater than 0'));
      return;
    }

    setSaving(true);
    try {
      const payload: Partial<Campaign> = {
        name: formData.name,
        description: formData.description,
        type: formData.type,
        promo_code: formData.promo_code || undefined,
        discount_type: formData.discount_type,
        discount_value: formData.discount_value,
        usage_limit: formData.usage_limit || undefined,
        start_date: formData.start_date,
        end_date: formData.end_date,
        target_audience: formData.target_audience,
        status: formData.is_active ? 'active' : 'draft',
      };

      if (isNewCampaign) {
        await campaignsService.createCampaign(payload);
        notifications.showSuccess(
          t('admin.campaigns.createdSuccess', 'Campaign has been created successfully.'),
          t('admin.campaigns.created', 'Campaign Created')
        );
      } else {
        await campaignsService.updateCampaign(campaignId!, payload);
        notifications.showSuccess(
          t('admin.campaigns.updatedSuccess', 'Campaign has been updated successfully.'),
          t('admin.campaigns.updated', 'Campaign Updated')
        );
      }
      navigation.goBack();
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : t('admin.campaigns.saveError', 'Failed to save campaign');
      notifications.showError(errorMessage);
    } finally {
      setSaving(false);
    }
  };

  const handleActivate = async () => {
    if (!campaignId) return;
    try {
      await campaignsService.activateCampaign(campaignId);
      setFormData(prev => ({ ...prev, is_active: true }));
      notifications.showSuccess(t('admin.campaigns.activatedSuccess', 'Campaign has been activated.'));
      loadCampaign();
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : t('admin.campaigns.activateError', 'Failed to activate campaign');
      notifications.showError(errorMessage);
    }
  };

  const handleDeactivate = async () => {
    if (!campaignId) return;
    try {
      await campaignsService.deactivateCampaign(campaignId);
      setFormData(prev => ({ ...prev, is_active: false }));
      notifications.showSuccess(t('admin.campaigns.deactivatedSuccess', 'Campaign has been deactivated.'));
      loadCampaign();
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : t('admin.campaigns.deactivateError', 'Failed to deactivate campaign');
      notifications.showError(errorMessage);
    }
  };

  const handleDelete = () => {
    notifications.show({
      level: 'warning',
      title: t('admin.campaigns.deleteConfirm', 'Delete Campaign'),
      message: t('admin.campaigns.deleteMessage', 'Are you sure you want to delete this campaign?'),
      dismissable: true,
      action: {
        label: t('common.delete', 'Delete'),
        type: 'action',
        onPress: async () => {
          await campaignsService.deleteCampaign(campaignId!);
          navigation.goBack();
        },
      },
    });
  };

  const generatePromoCode = () => {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
    let code = '';
    for (let i = 0; i < 8; i++) {
      code += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    setFormData(prev => ({ ...prev, promo_code: code }));
  };

  if (loading) {
    return (
      <AdminLayout title={t('admin.titles.campaignDetail', 'Campaign')}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={colors.primary} />
        </View>
      </AdminLayout>
    );
  }

  return (
    <AdminLayout
      title={isNewCampaign ? t('admin.titles.newCampaign', 'New Campaign') : formData.name}
      actions={
        !isNewCampaign && (
          <View style={styles.headerActions}>
            {formData.is_active ? (
              <TouchableOpacity style={styles.deactivateButton} onPress={handleDeactivate}>
                <Text style={styles.deactivateButtonText}>⏸️ {t('admin.campaigns.deactivate', 'Deactivate')}</Text>
              </TouchableOpacity>
            ) : (
              <TouchableOpacity style={styles.activateButton} onPress={handleActivate}>
                <Text style={styles.activateButtonText}>▶️ {t('admin.campaigns.activate', 'Activate')}</Text>
              </TouchableOpacity>
            )}
            <TouchableOpacity style={styles.deleteButton} onPress={handleDelete}>
              <Text style={styles.deleteButtonText}>🗑️ {t('common.delete', 'Delete')}</Text>
            </TouchableOpacity>
          </View>
        )
      }
    >
      <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>
        {/* Basic Info */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>{t('admin.campaigns.basicInfo', 'Basic Information')}</Text>

          <View style={styles.formGroup}>
            <Text style={styles.label}>{t('admin.campaigns.name', 'Campaign Name')} *</Text>
            <TextInput
              style={styles.input}
              value={formData.name}
              onChangeText={(text) => setFormData(prev => ({ ...prev, name: text }))}
              placeholder={t('admin.campaigns.namePlaceholder', 'Enter campaign name')}
              placeholderTextColor={colors.textMuted}
            />
          </View>

          <View style={styles.formGroup}>
            <Text style={styles.label}>{t('admin.campaigns.description', 'Description')}</Text>
            <TextInput
              style={[styles.input, styles.textArea]}
              value={formData.description}
              onChangeText={(text) => setFormData(prev => ({ ...prev, description: text }))}
              placeholder={t('admin.campaigns.descriptionPlaceholder', 'Enter campaign description')}
              placeholderTextColor={colors.textMuted}
              multiline
              numberOfLines={3}
            />
          </View>

          <View style={styles.formGroup}>
            <Text style={styles.label}>{t('admin.campaigns.type', 'Campaign Type')}</Text>
            <View style={styles.typeSelector}>
              {(['discount', 'trial', 'referral', 'promotional'] as CampaignType[]).map((type) => (
                <TouchableOpacity
                  key={type}
                  style={[styles.typeOption, formData.type === type && styles.typeOptionActive]}
                  onPress={() => setFormData(prev => ({ ...prev, type }))}
                >
                  <Text style={styles.typeIcon}>
                    {type === 'discount' ? '💰' : type === 'trial' ? '🎁' : type === 'referral' ? '👥' : '🎯'}
                  </Text>
                  <Text style={[styles.typeText, formData.type === type && styles.typeTextActive]}>
                    {type}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>
        </View>

        {/* Promo Code */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>{t('admin.campaigns.promoCode', 'Promo Code')}</Text>

          <View style={styles.formGroup}>
            <Text style={styles.label}>{t('admin.campaigns.code', 'Code')}</Text>
            <View style={styles.promoCodeRow}>
              <TextInput
                style={[styles.input, styles.promoCodeInput]}
                value={formData.promo_code}
                onChangeText={(text) => setFormData(prev => ({ ...prev, promo_code: text.toUpperCase() }))}
                placeholder={t('admin.campaigns.codePlaceholder', 'e.g., SUMMER20')}
                placeholderTextColor={colors.textMuted}
                autoCapitalize="characters"
              />
              <TouchableOpacity style={styles.generateButton} onPress={generatePromoCode}>
                <Text style={styles.generateButtonText}>🎲 {t('admin.campaigns.generate', 'Generate')}</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>

        {/* Discount Configuration */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>{t('admin.campaigns.discountConfig', 'Discount Configuration')}</Text>

          <View style={styles.formGroup}>
            <Text style={styles.label}>{t('admin.campaigns.discountType', 'Discount Type')}</Text>
            <View style={styles.discountTypeSelector}>
              {(['percentage', 'fixed', 'trial_days'] as DiscountType[]).map((type) => (
                <TouchableOpacity
                  key={type}
                  style={[styles.discountTypeOption, formData.discount_type === type && styles.discountTypeOptionActive]}
                  onPress={() => setFormData(prev => ({ ...prev, discount_type: type }))}
                >
                  <Text style={[styles.discountTypeText, formData.discount_type === type && styles.discountTypeTextActive]}>
                    {type === 'percentage' ? '%' : type === 'fixed' ? '$' : '📅'}
                  </Text>
                  <Text style={[styles.discountTypeLabel, formData.discount_type === type && styles.discountTypeLabelActive]}>
                    {type === 'percentage' ? 'Percentage' : type === 'fixed' ? 'Fixed Amount' : 'Trial Days'}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>

          <View style={styles.formRow}>
            <View style={[styles.formGroup, { flex: 1 }]}>
              <Text style={styles.label}>
                {formData.discount_type === 'percentage'
                  ? t('admin.campaigns.percentOff', 'Percent Off')
                  : formData.discount_type === 'fixed'
                  ? t('admin.campaigns.amountOff', 'Amount Off')
                  : t('admin.campaigns.trialDays', 'Trial Days')}
              </Text>
              <View style={styles.valueInputRow}>
                <Text style={styles.valuePrefix}>
                  {formData.discount_type === 'percentage' ? '%' : formData.discount_type === 'fixed' ? '$' : ''}
                </Text>
                <TextInput
                  style={[styles.input, styles.valueInput]}
                  value={formData.discount_value.toString()}
                  onChangeText={(text) => setFormData(prev => ({ ...prev, discount_value: parseInt(text) || 0 }))}
                  keyboardType="numeric"
                  placeholder="0"
                  placeholderTextColor={colors.textMuted}
                />
              </View>
            </View>

            <View style={[styles.formGroup, { flex: 1 }]}>
              <Text style={styles.label}>{t('admin.campaigns.usageLimit', 'Usage Limit')}</Text>
              <TextInput
                style={styles.input}
                value={formData.usage_limit ? formData.usage_limit.toString() : ''}
                onChangeText={(text) => setFormData(prev => ({ ...prev, usage_limit: parseInt(text) || 0 }))}
                keyboardType="numeric"
                placeholder={t('admin.campaigns.unlimited', 'Unlimited')}
                placeholderTextColor={colors.textMuted}
              />
            </View>
          </View>

          {formData.discount_type === 'percentage' && (
            <View style={styles.formGroup}>
              <Text style={styles.label}>{t('admin.campaigns.maxDiscount', 'Maximum Discount Amount ($)')}</Text>
              <TextInput
                style={styles.input}
                value={formData.max_discount_amount ? formData.max_discount_amount.toString() : ''}
                onChangeText={(text) => setFormData(prev => ({ ...prev, max_discount_amount: parseInt(text) || 0 }))}
                keyboardType="numeric"
                placeholder={t('admin.campaigns.noLimit', 'No limit')}
                placeholderTextColor={colors.textMuted}
              />
            </View>
          )}

          <View style={styles.formGroup}>
            <Text style={styles.label}>{t('admin.campaigns.minimumPurchase', 'Minimum Purchase Amount ($)')}</Text>
            <TextInput
              style={styles.input}
              value={formData.minimum_purchase ? formData.minimum_purchase.toString() : ''}
              onChangeText={(text) => setFormData(prev => ({ ...prev, minimum_purchase: parseInt(text) || 0 }))}
              keyboardType="numeric"
              placeholder="0"
              placeholderTextColor={colors.textMuted}
            />
          </View>
        </View>

        {/* Schedule */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>{t('admin.campaigns.schedule', 'Schedule')}</Text>

          <View style={styles.formRow}>
            <View style={[styles.formGroup, { flex: 1 }]}>
              <Text style={styles.label}>{t('admin.campaigns.startDate', 'Start Date')}</Text>
              <TouchableOpacity
                style={styles.dateInput}
                onPress={() => setShowDatePicker('start')}
              >
                <Text style={styles.dateText}>{formData.start_date}</Text>
                <Text style={styles.dateIcon}>📅</Text>
              </TouchableOpacity>
            </View>

            <View style={[styles.formGroup, { flex: 1 }]}>
              <Text style={styles.label}>{t('admin.campaigns.endDate', 'End Date')}</Text>
              <TouchableOpacity
                style={styles.dateInput}
                onPress={() => setShowDatePicker('end')}
              >
                <Text style={styles.dateText}>{formData.end_date}</Text>
                <Text style={styles.dateIcon}>📅</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>

        {/* Options */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>{t('admin.campaigns.options', 'Options')}</Text>

          <View style={styles.switchRow}>
            <View style={styles.switchLabel}>
              <Text style={styles.switchTitle}>{t('admin.campaigns.firstPurchaseOnly', 'First Purchase Only')}</Text>
              <Text style={styles.switchDescription}>
                {t('admin.campaigns.firstPurchaseDesc', 'Only applies to users making their first purchase')}
              </Text>
            </View>
            <Switch
              value={formData.first_purchase_only}
              onValueChange={(value) => setFormData(prev => ({ ...prev, first_purchase_only: value }))}
              trackColor={{ false: colors.backgroundLighter, true: colors.primary + '50' }}
              thumbColor={formData.first_purchase_only ? colors.primary : colors.textMuted}
            />
          </View>

          <View style={styles.switchRow}>
            <View style={styles.switchLabel}>
              <Text style={styles.switchTitle}>{t('admin.campaigns.autoApply', 'Auto Apply')}</Text>
              <Text style={styles.switchDescription}>
                {t('admin.campaigns.autoApplyDesc', 'Automatically apply to eligible purchases')}
              </Text>
            </View>
            <Switch
              value={formData.auto_apply}
              onValueChange={(value) => setFormData(prev => ({ ...prev, auto_apply: value }))}
              trackColor={{ false: colors.backgroundLighter, true: colors.primary + '50' }}
              thumbColor={formData.auto_apply ? colors.primary : colors.textMuted}
            />
          </View>

          <View style={styles.switchRow}>
            <View style={styles.switchLabel}>
              <Text style={styles.switchTitle}>{t('admin.campaigns.stackable', 'Stackable')}</Text>
              <Text style={styles.switchDescription}>
                {t('admin.campaigns.stackableDesc', 'Can be combined with other promotions')}
              </Text>
            </View>
            <Switch
              value={formData.stackable}
              onValueChange={(value) => setFormData(prev => ({ ...prev, stackable: value }))}
              trackColor={{ false: colors.backgroundLighter, true: colors.primary + '50' }}
              thumbColor={formData.stackable ? colors.primary : colors.textMuted}
            />
          </View>
        </View>

        {/* Target Audience */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>{t('admin.campaigns.targetAudience', 'Target Audience')}</Text>
            <TouchableOpacity
              style={styles.audienceButton}
              onPress={() => setShowAudienceBuilder(true)}
            >
              <Text style={styles.audienceButtonText}>
                {Object.keys(formData.target_audience).length > 0
                  ? t('admin.campaigns.editAudience', 'Edit Audience')
                  : t('admin.campaigns.setAudience', 'Set Audience')}
              </Text>
            </TouchableOpacity>
          </View>

          {Object.keys(formData.target_audience).length === 0 ? (
            <Text style={styles.audienceInfo}>
              {t('admin.campaigns.allUsersTarget', 'All users are targeted by default')}
            </Text>
          ) : (
            <View style={styles.audienceFilters}>
              {Object.entries(formData.target_audience).map(([key, value]) => (
                <View key={key} style={styles.audienceChip}>
                  <Text style={styles.audienceChipText}>{key}: {String(value)}</Text>
                </View>
              ))}
            </View>
          )}
        </View>

        {/* Save Button */}
        <TouchableOpacity
          style={[styles.saveButton, saving && styles.saveButtonDisabled]}
          onPress={handleSave}
          disabled={saving}
        >
          {saving ? (
            <ActivityIndicator size="small" color={colors.text} />
          ) : (
            <Text style={styles.saveButtonText}>
              {isNewCampaign ? t('admin.campaigns.create', 'Create Campaign') : t('admin.campaigns.save', 'Save Changes')}
            </Text>
          )}
        </TouchableOpacity>

        <View style={{ height: spacing.xxl }} />
      </ScrollView>

      {/* Date Picker Modal */}
      <Modal
        visible={showDatePicker !== null}
        transparent
        animationType="fade"
        onRequestClose={() => setShowDatePicker(null)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.datePickerModal}>
            <Text style={styles.modalTitle}>
              {showDatePicker === 'start'
                ? t('admin.campaigns.selectStartDate', 'Select Start Date')
                : t('admin.campaigns.selectEndDate', 'Select End Date')}
            </Text>
            <TextInput
              style={styles.datePickerInput}
              value={showDatePicker === 'start' ? formData.start_date : formData.end_date}
              onChangeText={(text) => {
                if (showDatePicker === 'start') {
                  setFormData(prev => ({ ...prev, start_date: text }));
                } else {
                  setFormData(prev => ({ ...prev, end_date: text }));
                }
              }}
              placeholder="YYYY-MM-DD"
              placeholderTextColor={colors.textMuted}
            />
            <TouchableOpacity
              style={styles.datePickerButton}
              onPress={() => setShowDatePicker(null)}
            >
              <Text style={styles.datePickerButtonText}>{t('common.done', 'Done')}</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* Audience Builder Modal */}
      <Modal
        visible={showAudienceBuilder}
        transparent
        animationType="fade"
        onRequestClose={() => setShowAudienceBuilder(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.audienceModal}>
            <Text style={styles.modalTitle}>{t('admin.campaigns.audienceBuilder', 'Audience Builder')}</Text>

            <View style={styles.audienceOption}>
              <Text style={styles.audienceOptionLabel}>{t('admin.campaigns.subscriptionPlan', 'Subscription Plan')}</Text>
              <View style={styles.audienceOptionButtons}>
                {['all', 'free', 'basic', 'premium'].map((plan) => (
                  <TouchableOpacity
                    key={plan}
                    style={[
                      styles.audienceOptionButton,
                      (formData.target_audience as any).plan === plan && styles.audienceOptionButtonActive,
                    ]}
                    onPress={() => setFormData(prev => ({
                      ...prev,
                      target_audience: plan === 'all'
                        ? {}
                        : { ...prev.target_audience, plan },
                    }))}
                  >
                    <Text style={[
                      styles.audienceOptionButtonText,
                      (formData.target_audience as any).plan === plan && styles.audienceOptionButtonTextActive,
                    ]}>
                      {plan}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>

            <View style={styles.audienceOption}>
              <Text style={styles.audienceOptionLabel}>{t('admin.campaigns.userStatus', 'User Status')}</Text>
              <View style={styles.audienceOptionButtons}>
                {['all', 'new', 'returning', 'inactive'].map((status) => (
                  <TouchableOpacity
                    key={status}
                    style={[
                      styles.audienceOptionButton,
                      (formData.target_audience as any).user_status === status && styles.audienceOptionButtonActive,
                    ]}
                    onPress={() => setFormData(prev => ({
                      ...prev,
                      target_audience: status === 'all'
                        ? {}
                        : { ...prev.target_audience, user_status: status },
                    }))}
                  >
                    <Text style={[
                      styles.audienceOptionButtonText,
                      (formData.target_audience as any).user_status === status && styles.audienceOptionButtonTextActive,
                    ]}>
                      {status}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>

            <View style={styles.modalActions}>
              <TouchableOpacity
                style={styles.modalCancelButton}
                onPress={() => setFormData(prev => ({ ...prev, target_audience: {} }))}
              >
                <Text style={styles.modalCancelText}>{t('admin.campaigns.clearAudience', 'Clear')}</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.modalApplyButton}
                onPress={() => setShowAudienceBuilder(false)}
              >
                <Text style={styles.modalApplyText}>{t('common.apply', 'Apply')}</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </AdminLayout>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: spacing.lg,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerActions: {
    flexDirection: 'row',
    gap: spacing.sm,
  },
  activateButton: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    backgroundColor: colors.success + '20',
    borderRadius: borderRadius.md,
    borderWidth: 1,
    borderColor: colors.success,
  },
  activateButtonText: {
    fontSize: fontSize.sm,
    color: colors.success,
  },
  deactivateButton: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    backgroundColor: colors.warning + '20',
    borderRadius: borderRadius.md,
    borderWidth: 1,
    borderColor: colors.warning,
  },
  deactivateButtonText: {
    fontSize: fontSize.sm,
    color: colors.warning,
  },
  deleteButton: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    backgroundColor: colors.error + '20',
    borderRadius: borderRadius.md,
    borderWidth: 1,
    borderColor: colors.error,
  },
  deleteButtonText: {
    fontSize: fontSize.sm,
    color: colors.error,
  },
  section: {
    backgroundColor: colors.glass,
    borderRadius: borderRadius.lg,
    borderWidth: 1,
    borderColor: colors.glassBorder,
    padding: spacing.lg,
    marginBottom: spacing.lg,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.md,
  },
  sectionTitle: {
    fontSize: fontSize.lg,
    fontWeight: 'bold',
    color: colors.text,
    marginBottom: spacing.md,
  },
  formGroup: {
    marginBottom: spacing.md,
  },
  formRow: {
    flexDirection: 'row',
    gap: spacing.md,
  },
  label: {
    fontSize: fontSize.sm,
    fontWeight: '600',
    color: colors.text,
    marginBottom: spacing.xs,
  },
  input: {
    backgroundColor: colors.backgroundLighter,
    borderRadius: borderRadius.md,
    borderWidth: 1,
    borderColor: colors.glassBorder,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    fontSize: fontSize.md,
    color: colors.text,
  },
  textArea: {
    minHeight: 80,
    textAlignVertical: 'top',
  },
  typeSelector: {
    flexDirection: 'row',
    gap: spacing.sm,
  },
  typeOption: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: spacing.md,
    backgroundColor: colors.backgroundLighter,
    borderRadius: borderRadius.md,
    borderWidth: 1,
    borderColor: colors.glassBorder,
  },
  typeOptionActive: {
    backgroundColor: colors.primary + '20',
    borderColor: colors.primary,
  },
  typeIcon: {
    fontSize: 24,
    marginBottom: spacing.xs,
  },
  typeText: {
    fontSize: fontSize.xs,
    color: colors.textSecondary,
    textTransform: 'capitalize',
  },
  typeTextActive: {
    color: colors.primary.DEFAULT,
    fontWeight: '600',
  },
  promoCodeRow: {
    flexDirection: 'row',
    gap: spacing.sm,
  },
  promoCodeInput: {
    flex: 1,
  },
  generateButton: {
    paddingHorizontal: spacing.md,
    backgroundColor: colors.secondary,
    borderRadius: borderRadius.md,
    justifyContent: 'center',
  },
  generateButtonText: {
    fontSize: fontSize.sm,
    color: colors.text,
    fontWeight: '600',
  },
  discountTypeSelector: {
    flexDirection: 'row',
    gap: spacing.sm,
  },
  discountTypeOption: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: spacing.md,
    backgroundColor: colors.backgroundLighter,
    borderRadius: borderRadius.md,
    borderWidth: 1,
    borderColor: colors.glassBorder,
  },
  discountTypeOptionActive: {
    backgroundColor: colors.primary + '20',
    borderColor: colors.primary,
  },
  discountTypeText: {
    fontSize: 20,
    marginBottom: spacing.xs,
    color: colors.textSecondary,
  },
  discountTypeTextActive: {
    color: colors.primary.DEFAULT,
  },
  discountTypeLabel: {
    fontSize: fontSize.xs,
    color: colors.textSecondary,
  },
  discountTypeLabelActive: {
    color: colors.primary.DEFAULT,
    fontWeight: '600',
  },
  valueInputRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  valuePrefix: {
    fontSize: fontSize.lg,
    color: colors.textSecondary,
    marginRight: spacing.sm,
  },
  valueInput: {
    flex: 1,
  },
  dateInput: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: colors.backgroundLighter,
    borderRadius: borderRadius.md,
    borderWidth: 1,
    borderColor: colors.glassBorder,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
  },
  dateText: {
    fontSize: fontSize.md,
    color: colors.text,
  },
  dateIcon: {
    fontSize: 16,
  },
  switchRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: colors.glassBorder,
  },
  switchLabel: {
    flex: 1,
    marginRight: spacing.md,
  },
  switchTitle: {
    fontSize: fontSize.sm,
    fontWeight: '600',
    color: colors.text,
  },
  switchDescription: {
    fontSize: fontSize.xs,
    color: colors.textSecondary,
    marginTop: 2,
  },
  audienceButton: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    backgroundColor: colors.primary,
    borderRadius: borderRadius.md,
  },
  audienceButtonText: {
    fontSize: fontSize.sm,
    color: colors.text,
    fontWeight: '600',
  },
  audienceInfo: {
    fontSize: fontSize.sm,
    color: colors.textSecondary,
    fontStyle: 'italic',
  },
  audienceFilters: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.xs,
  },
  audienceChip: {
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    backgroundColor: colors.primary + '20',
    borderRadius: borderRadius.sm,
  },
  audienceChipText: {
    fontSize: fontSize.xs,
    color: colors.primary.DEFAULT,
    textTransform: 'capitalize',
  },
  saveButton: {
    backgroundColor: colors.primary,
    borderRadius: borderRadius.md,
    paddingVertical: spacing.md,
    alignItems: 'center',
    marginTop: spacing.lg,
  },
  saveButtonDisabled: {
    opacity: 0.6,
  },
  saveButtonText: {
    fontSize: fontSize.md,
    fontWeight: '600',
    color: colors.text,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: colors.overlay,
    justifyContent: 'center',
    alignItems: 'center',
  },
  datePickerModal: {
    width: '90%',
    maxWidth: 350,
    backgroundColor: colors.backgroundLight,
    borderRadius: borderRadius.lg,
    padding: spacing.lg,
    borderWidth: 1,
    borderColor: colors.glassBorder,
  },
  modalTitle: {
    fontSize: fontSize.lg,
    fontWeight: 'bold',
    color: colors.text,
    marginBottom: spacing.lg,
  },
  datePickerInput: {
    backgroundColor: colors.backgroundLighter,
    borderRadius: borderRadius.md,
    borderWidth: 1,
    borderColor: colors.glassBorder,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    fontSize: fontSize.md,
    color: colors.text,
    marginBottom: spacing.lg,
  },
  datePickerButton: {
    backgroundColor: colors.primary,
    borderRadius: borderRadius.md,
    paddingVertical: spacing.md,
    alignItems: 'center',
  },
  datePickerButtonText: {
    fontSize: fontSize.md,
    fontWeight: '600',
    color: colors.text,
  },
  audienceModal: {
    width: '90%',
    maxWidth: 450,
    backgroundColor: colors.backgroundLight,
    borderRadius: borderRadius.lg,
    padding: spacing.lg,
    borderWidth: 1,
    borderColor: colors.glassBorder,
  },
  audienceOption: {
    marginBottom: spacing.lg,
  },
  audienceOptionLabel: {
    fontSize: fontSize.sm,
    fontWeight: '600',
    color: colors.text,
    marginBottom: spacing.sm,
  },
  audienceOptionButtons: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.xs,
  },
  audienceOptionButton: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    backgroundColor: colors.backgroundLighter,
    borderRadius: borderRadius.sm,
    borderWidth: 1,
    borderColor: colors.glassBorder,
  },
  audienceOptionButtonActive: {
    backgroundColor: colors.primary + '20',
    borderColor: colors.primary,
  },
  audienceOptionButtonText: {
    fontSize: fontSize.sm,
    color: colors.textSecondary,
    textTransform: 'capitalize',
  },
  audienceOptionButtonTextActive: {
    color: colors.primary.DEFAULT,
    fontWeight: '600',
  },
  modalActions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: spacing.sm,
  },
  modalCancelButton: {
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm,
    backgroundColor: colors.backgroundLighter,
    borderRadius: borderRadius.md,
  },
  modalCancelText: {
    fontSize: fontSize.sm,
    color: colors.textSecondary,
  },
  modalApplyButton: {
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm,
    backgroundColor: colors.primary,
    borderRadius: borderRadius.md,
  },
  modalApplyText: {
    fontSize: fontSize.sm,
    color: colors.text,
    fontWeight: '600',
  },
});

export default CampaignDetailScreen;
