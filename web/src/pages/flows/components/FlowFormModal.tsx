/**
 * FlowFormModal Component
 * Create and edit flow modal with Glass UI components
 * Language is determined by app-wide language setting
 */

import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Pressable,
  ScrollView,
  Modal,
} from 'react-native';
import { useTranslation } from 'react-i18next';
import { X, Play, Sparkles, FileText, Clock, Settings } from 'lucide-react';
import { colors, spacing, borderRadius } from '@bayit/shared/theme';
import {
  GlassView,
  GlassButton,
  GlassInput,
  GlassCheckbox,
} from '@bayit/shared/ui';
import { TriggerConfigPanel } from './TriggerConfigPanel';
import { FlowItemList } from './FlowItemList';
import { ContentPickerModal } from './ContentPickerModal';
import type { Flow, FlowFormState, FlowItem } from '../types/flows.types';
import {
  createEmptyFormState,
  flowToFormState,
  formStateToPayload,
  validateFlowForm,
} from '../utils/flowHelpers';

interface FlowFormModalProps {
  visible: boolean;
  flow?: Flow | null;
  onClose: () => void;
  onSave: (flowData: any) => Promise<void>;
}

export function FlowFormModal({
  visible,
  flow,
  onClose,
  onSave,
}: FlowFormModalProps) {
  const { t, i18n } = useTranslation();
  const isRTL = i18n.language === 'he' || i18n.language === 'ar';
  const currentLang = i18n.language;
  const isEditing = !!flow;

  // Form state
  const [formState, setFormState] = useState<FlowFormState>(createEmptyFormState());
  const [saving, setSaving] = useState(false);
  const [errors, setErrors] = useState<string[]>([]);
  const [showContentPicker, setShowContentPicker] = useState(false);

  // Initialize form state when flow changes
  useEffect(() => {
    if (visible) {
      if (flow) {
        setFormState(flowToFormState(flow));
      } else {
        setFormState(createEmptyFormState());
      }
      setErrors([]);
    }
  }, [visible, flow]);

  // Update form field
  const updateField = <K extends keyof FlowFormState>(
    field: K,
    value: FlowFormState[K]
  ) => {
    setFormState((prev) => ({ ...prev, [field]: value }));
    setErrors([]);
  };

  // Get name field based on current language
  const getNameField = (): keyof FlowFormState => {
    if (currentLang === 'en') return 'name_en';
    if (currentLang === 'es') return 'name_es';
    return 'name';
  };

  // Get description field based on current language
  const getDescriptionField = (): keyof FlowFormState => {
    if (currentLang === 'en') return 'description_en';
    if (currentLang === 'es') return 'description_es';
    return 'description';
  };

  // Handle trigger change
  const handleTriggerChange = (trigger: FlowFormState['trigger']) => {
    updateField('trigger', trigger);
  };

  // Handle items change from FlowItemList
  const handleItemsChange = (items: FlowItem[]) => {
    updateField('items', items);
  };

  // Handle content picker add
  const handleAddContent = (newItems: FlowItem[]) => {
    const existingIds = new Set(formState.items.map((item) => item.content_id));
    const filteredNew = newItems.filter(
      (item) => !existingIds.has(item.content_id)
    );
    const startOrder = formState.items.length;
    const itemsWithOrder = filteredNew.map((item, index) => ({
      ...item,
      order: startOrder + index,
    }));
    updateField('items', [...formState.items, ...itemsWithOrder]);
    setShowContentPicker(false);
  };

  // Handle save
  const handleSave = async () => {
    const validationErrors = validateFlowForm(formState, t);
    if (validationErrors.length > 0) {
      setErrors(validationErrors);
      return;
    }

    setSaving(true);
    try {
      const payload = formStateToPayload(formState);
      await onSave(payload);
      onClose();
    } catch (error) {
      setErrors([t('common.error')]);
    } finally {
      setSaving(false);
    }
  };

  return (
    <>
      <Modal visible={visible} transparent animationType="fade">
        <View style={styles.overlay}>
          {/* Backdrop */}
          <Pressable style={styles.backdrop} onPress={onClose} />

          {/* Modal Container */}
          <GlassView style={styles.modal} intensity="high">
            {/* Close Button */}
            <Pressable
              style={[styles.closeButton, isRTL && styles.closeButtonRTL]}
              onPress={onClose}
            >
              <X size={24} color={colors.textMuted} />
            </Pressable>

            {/* Header */}
            <View style={styles.header}>
              <Text style={[styles.title, isRTL && styles.textRTL]}>
                {isEditing ? t('flows.editFlow') : t('flows.createFlow')}
              </Text>
              <Text style={[styles.subtitle, isRTL && styles.textRTL]}>
                {isEditing ? t('flows.editFlowDesc') : t('flows.createFlowDesc')}
              </Text>
            </View>

            {/* Scrollable Content */}
            <ScrollView
              style={styles.scroll}
              contentContainerStyle={styles.scrollContent}
              showsVerticalScrollIndicator={false}
            >
              {/* Errors */}
              {errors.length > 0 && (
                <GlassView style={styles.errorBox} intensity="low">
                  {errors.map((error, index) => (
                    <Text key={index} style={styles.errorText}>
                      {error}
                    </Text>
                  ))}
                </GlassView>
              )}

              {/* Basic Info Section */}
              <View style={styles.section}>
                <View style={[styles.sectionHeaderRow, isRTL && styles.rowRTL]}>
                  <Settings size={18} color={colors.primary} />
                  <Text style={[styles.sectionTitle, isRTL && styles.textRTL]}>
                    {t('flows.basicInfo')}
                  </Text>
                </View>

                {/* Name Input */}
                <GlassInput
                  label={`${t('flows.flowName')} *`}
                  value={formState[getNameField()] as string}
                  onChangeText={(value) => updateField(getNameField(), value)}
                  placeholder={t('flows.flowNamePlaceholder')}
                  containerStyle={styles.inputContainer}
                />

                {/* Description Input */}
                <GlassInput
                  label={t('flows.description')}
                  value={formState[getDescriptionField()] as string}
                  onChangeText={(value) => updateField(getDescriptionField(), value)}
                  placeholder={t('flows.descriptionPlaceholder')}
                  multiline
                  numberOfLines={3}
                  containerStyle={styles.inputContainer}
                />
              </View>

              {/* Trigger Section */}
              <View style={styles.section}>
                <View style={[styles.sectionHeaderRow, isRTL && styles.rowRTL]}>
                  <Clock size={18} color={colors.secondary} />
                  <Text style={[styles.sectionTitle, isRTL && styles.textRTL]}>
                    {t('flows.trigger.type')}
                  </Text>
                </View>
                <TriggerConfigPanel
                  trigger={formState.trigger}
                  onChange={handleTriggerChange}
                  isRTL={isRTL}
                />
              </View>

              {/* Content Section */}
              <View style={styles.section}>
                <FlowItemList
                  items={formState.items}
                  onItemsChange={handleItemsChange}
                  onAddContent={() => setShowContentPicker(true)}
                  maxItems={20}
                  aiEnabled={formState.ai_enabled}
                  compact
                  isRTL={isRTL}
                />
              </View>

              {/* Options Section */}
              <View style={styles.section}>
                <View style={[styles.sectionHeaderRow, isRTL && styles.rowRTL]}>
                  <Sparkles size={18} color={colors.warning} />
                  <Text style={[styles.sectionTitle, isRTL && styles.textRTL]}>
                    {t('flows.options')}
                  </Text>
                </View>

                <GlassView style={styles.optionsCard} intensity="low">
                  {/* Auto Play Option */}
                  <Pressable
                    style={[styles.optionRow, isRTL && styles.optionRowRTL]}
                    onPress={() => updateField('auto_play', !formState.auto_play)}
                  >
                    <View
                      style={[
                        styles.optionIconBox,
                        formState.auto_play && styles.optionIconBoxActive,
                      ]}
                    >
                      <Play
                        size={18}
                        color={formState.auto_play ? colors.primary : colors.textMuted}
                      />
                    </View>
                    <View style={[styles.optionTextContainer, isRTL && styles.optionTextContainerRTL]}>
                      <Text
                        style={[
                          styles.optionLabel,
                          formState.auto_play && styles.optionLabelActive,
                          isRTL && styles.textRTL,
                        ]}
                      >
                        {t('flows.autoPlay')}
                      </Text>
                      <Text style={[styles.optionDesc, isRTL && styles.textRTL]}>
                        {t('flows.autoPlayDesc')}
                      </Text>
                    </View>
                    <GlassCheckbox
                      checked={formState.auto_play}
                      onChange={() => updateField('auto_play', !formState.auto_play)}
                    />
                  </Pressable>

                  <View style={styles.optionDivider} />

                  {/* AI Enabled Option */}
                  <Pressable
                    style={[styles.optionRow, isRTL && styles.optionRowRTL]}
                    onPress={() => updateField('ai_enabled', !formState.ai_enabled)}
                  >
                    <View
                      style={[
                        styles.optionIconBox,
                        formState.ai_enabled && styles.optionIconBoxWarning,
                      ]}
                    >
                      <Sparkles
                        size={18}
                        color={formState.ai_enabled ? colors.warning : colors.textMuted}
                      />
                    </View>
                    <View style={[styles.optionTextContainer, isRTL && styles.optionTextContainerRTL]}>
                      <Text
                        style={[
                          styles.optionLabel,
                          formState.ai_enabled && styles.optionLabelActive,
                          isRTL && styles.textRTL,
                        ]}
                      >
                        {t('flows.aiEnabled')}
                      </Text>
                      <Text style={[styles.optionDesc, isRTL && styles.textRTL]}>
                        {t('flows.aiEnabledDesc')}
                      </Text>
                    </View>
                    <GlassCheckbox
                      checked={formState.ai_enabled}
                      onChange={() => updateField('ai_enabled', !formState.ai_enabled)}
                    />
                  </Pressable>

                  <View style={styles.optionDivider} />

                  {/* AI Brief Option */}
                  <Pressable
                    style={[styles.optionRow, isRTL && styles.optionRowRTL]}
                    onPress={() => updateField('ai_brief_enabled', !formState.ai_brief_enabled)}
                  >
                    <View
                      style={[
                        styles.optionIconBox,
                        formState.ai_brief_enabled && styles.optionIconBoxInfo,
                      ]}
                    >
                      <FileText
                        size={18}
                        color={formState.ai_brief_enabled ? colors.info : colors.textMuted}
                      />
                    </View>
                    <View style={[styles.optionTextContainer, isRTL && styles.optionTextContainerRTL]}>
                      <Text
                        style={[
                          styles.optionLabel,
                          formState.ai_brief_enabled && styles.optionLabelActive,
                          isRTL && styles.textRTL,
                        ]}
                      >
                        {t('flows.aiBrief')}
                      </Text>
                      <Text style={[styles.optionDesc, isRTL && styles.textRTL]}>
                        {t('flows.aiBriefDesc')}
                      </Text>
                    </View>
                    <GlassCheckbox
                      checked={formState.ai_brief_enabled}
                      onChange={() => updateField('ai_brief_enabled', !formState.ai_brief_enabled)}
                    />
                  </Pressable>
                </GlassView>
              </View>
            </ScrollView>

            {/* Footer Actions */}
            <View style={styles.footer}>
              <View style={[styles.footerButtons, isRTL && styles.footerButtonsRTL]}>
                <GlassButton
                  title={t('common.cancel')}
                  onPress={onClose}
                  variant="ghost"
                  style={styles.footerButton}
                />
                <GlassButton
                  title={saving ? t('common.saving') : t('common.save')}
                  onPress={handleSave}
                  variant="primary"
                  loading={saving}
                  disabled={saving}
                  style={styles.footerButton}
                />
              </View>
            </View>
          </GlassView>
        </View>
      </Modal>

      {/* Content Picker Modal */}
      <ContentPickerModal
        visible={showContentPicker}
        onClose={() => setShowContentPicker(false)}
        onAdd={handleAddContent}
        existingItems={formState.items}
      />
    </>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.85)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: spacing.lg,
    // @ts-ignore - Web z-index
    zIndex: 1000,
  },
  backdrop: {
    ...StyleSheet.absoluteFillObject,
  },
  modal: {
    width: '100%',
    maxWidth: 560,
    maxHeight: '90%',
    borderRadius: borderRadius.xl,
    overflow: 'hidden',
    // Explicit flex layout for proper child rendering
    display: 'flex' as any,
    flexDirection: 'column' as any,
  },
  closeButton: {
    position: 'absolute',
    top: spacing.md,
    right: spacing.md,
    padding: spacing.sm,
    zIndex: 10,
    borderRadius: borderRadius.full,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
  },
  closeButtonRTL: {
    right: 'auto' as any,
    left: spacing.md,
  },
  header: {
    padding: spacing.xl,
    paddingBottom: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255, 255, 255, 0.08)',
    flexShrink: 0,
  },
  title: {
    fontSize: 22,
    fontWeight: '700',
    color: colors.text,
    marginBottom: spacing.xs,
  },
  subtitle: {
    fontSize: 14,
    color: colors.textMuted,
  },
  scroll: {
    flex: 1,
    minHeight: 0, // Required for scrolling in flex container
    width: '100%' as any,
  },
  scrollContent: {
    padding: spacing.lg,
    paddingBottom: spacing.xl,
    width: '100%' as any,
  },
  errorBox: {
    padding: spacing.md,
    marginBottom: spacing.lg,
    borderRadius: borderRadius.md,
    borderWidth: 1,
    borderColor: colors.error,
    backgroundColor: 'rgba(255, 59, 48, 0.1)',
  },
  errorText: {
    fontSize: 14,
    color: colors.error,
    lineHeight: 20,
  },
  section: {
    marginBottom: spacing.xl,
    width: '100%' as any,
  },
  sectionHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    marginBottom: spacing.md,
  },
  rowRTL: {
    flexDirection: 'row-reverse',
  },
  sectionTitle: {
    fontSize: 15,
    fontWeight: '600',
    color: colors.text,
  },
  inputContainer: {
    marginBottom: spacing.sm,
  },
  optionsCard: {
    borderRadius: borderRadius.lg,
    overflow: 'hidden',
  },
  optionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: spacing.md,
    gap: spacing.md,
  },
  optionRowRTL: {
    flexDirection: 'row-reverse',
  },
  optionIconBox: {
    width: 36,
    height: 36,
    borderRadius: borderRadius.md,
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  optionIconBoxActive: {
    backgroundColor: `${colors.primary}20`,
  },
  optionIconBoxWarning: {
    backgroundColor: `${colors.warning}20`,
  },
  optionIconBoxInfo: {
    backgroundColor: `${colors.info}20`,
  },
  optionTextContainer: {
    flex: 1,
  },
  optionTextContainerRTL: {
    alignItems: 'flex-end',
  },
  optionLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.textMuted,
    marginBottom: 2,
  },
  optionLabelActive: {
    color: colors.text,
  },
  optionDesc: {
    fontSize: 12,
    color: colors.textMuted,
    lineHeight: 16,
  },
  optionDivider: {
    height: 1,
    backgroundColor: 'rgba(255, 255, 255, 0.06)',
    marginHorizontal: spacing.md,
  },
  footer: {
    borderTopWidth: 1,
    borderTopColor: 'rgba(255, 255, 255, 0.08)',
    backgroundColor: 'rgba(0, 0, 0, 0.2)',
    flexShrink: 0,
  },
  footerButtons: {
    flexDirection: 'row',
    padding: spacing.lg,
    gap: spacing.md,
  },
  footerButtonsRTL: {
    flexDirection: 'row-reverse',
  },
  footerButton: {
    flex: 1,
  },
  textRTL: {
    textAlign: 'right',
  },
});

export default FlowFormModal;
