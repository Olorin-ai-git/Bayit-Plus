/**
 * FlowFormModal Component
 * Create and edit flow modal with Glass UI components
 * Language is determined by app-wide language setting
 */

import React, { useState, useEffect, useMemo } from 'react';
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

// Check if this is a TV build (set by webpack)
declare const __TV__: boolean;
const IS_TV_BUILD = typeof __TV__ !== 'undefined' && __TV__;
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
  initialTemplate?: Partial<Flow> | null;
  onClose: () => void;
  onSave: (flowData: any) => Promise<void>;
}

export function FlowFormModal({
  visible,
  flow,
  initialTemplate,
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
  const [showTooltip, setShowTooltip] = useState(false);

  // Real-time validation for button state
  const validationErrors = useMemo(() => {
    return validateFlowForm(formState, t);
  }, [formState, t]);

  const isFormValid = validationErrors.length === 0;

  // Initialize form state when flow changes
  useEffect(() => {
    if (visible) {
      if (flow) {
        setFormState(flowToFormState(flow));
      } else if (initialTemplate) {
        // Use template to pre-fill form for new flow
        const templateState = createEmptyFormState();
        if (initialTemplate.name) {
          if (typeof initialTemplate.name === 'object') {
            templateState.name = initialTemplate.name.he || '';
            templateState.name_en = initialTemplate.name.en || '';
          } else {
            templateState.name = initialTemplate.name;
          }
        }
        if (initialTemplate.triggers && initialTemplate.triggers.length > 0) {
          const trigger = initialTemplate.triggers[0];
          templateState.trigger = {
            type: trigger.type || 'time',
            time: trigger.time || '08:00',
            days: trigger.days || [0, 1, 2, 3, 4, 5, 6],
            shabbatOffset: trigger.shabbat_offset || 30,
          };
        }
        templateState.auto_play = initialTemplate.auto_play ?? true;
        templateState.ai_enabled = initialTemplate.ai_enabled ?? false;
        templateState.ai_brief_enabled = initialTemplate.ai_brief_enabled ?? false;
        setFormState(templateState);
      } else {
        setFormState(createEmptyFormState());
      }
      setErrors([]);
    } else {
      // Reset content picker when modal closes
      setShowContentPicker(false);
    }
  }, [visible, flow, initialTemplate]);

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

  // Handle content picker add - converts ContentItem[] to FlowItem[]
  const handleAddContent = (newItems: any[]) => {
    const existingIds = new Set(formState.items.map((item) => item.content_id));
    const filteredNew = newItems.filter(
      (item) => !existingIds.has(item.id)
    );
    const startOrder = formState.items.length;
    // Convert ContentItem to FlowItem format
    const flowItems: FlowItem[] = filteredNew.map((item, index) => ({
      content_id: item.id,
      content_type: item.type,
      title: item.title,
      thumbnail: item.thumbnail,
      duration_hint: item.duration,
      order: startOrder + index,
    }));
    updateField('items', [...formState.items, ...flowItems]);
    setShowContentPicker(false);
  };

  // Handle save
  const handleSave = async () => {
    const errors = validateFlowForm(formState, t);
    if (errors.length > 0) {
      setErrors(errors);
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
                    <Text key={index} style={[styles.errorText, isRTL && styles.textRTL]}>
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
                <View
                  style={styles.saveButtonWrapper}
                  // @ts-ignore - Web hover events
                  onMouseEnter={() => !isFormValid && setShowTooltip(true)}
                  onMouseLeave={() => setShowTooltip(false)}
                >
                  <GlassButton
                    title={saving ? t('common.saving') : t('common.save')}
                    onPress={handleSave}
                    variant="primary"
                    loading={saving}
                    disabled={saving || !isFormValid}
                    style={styles.footerButton}
                  />
                  {/* Validation Tooltip */}
                  {showTooltip && !isFormValid && (
                    <View style={[styles.tooltip, isRTL && styles.tooltipRTL]}>
                      <View style={styles.tooltipArrow} />
                      <View style={styles.tooltipContent}>
                        {validationErrors.map((error, index) => (
                          <Text key={index} style={[styles.tooltipText, isRTL && styles.textRTL]}>
                            • {error}
                          </Text>
                        ))}
                      </View>
                    </View>
                  )}
                </View>
              </View>
            </View>
          </GlassView>

          {/* Content Picker Modal - rendered inside parent modal for proper stacking */}
          <ContentPickerModal
            visible={showContentPicker}
            onClose={() => setShowContentPicker(false)}
            onAdd={handleAddContent}
            existingItems={formState.items}
          />
        </View>
      </Modal>
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
    maxWidth: IS_TV_BUILD ? 800 : 560,
    maxHeight: IS_TV_BUILD ? '85%' : '90%',
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
    fontSize: IS_TV_BUILD ? 28 : 22,
    fontWeight: '700',
    color: colors.text,
    marginBottom: spacing.xs,
  },
  subtitle: {
    fontSize: IS_TV_BUILD ? 18 : 14,
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
  saveButtonWrapper: {
    position: 'relative',
    flex: 1,
  },
  tooltip: {
    position: 'absolute',
    bottom: '100%',
    left: 0,
    right: 0,
    marginBottom: spacing.sm,
    // @ts-ignore - Web z-index
    zIndex: 100,
  },
  tooltipRTL: {
    // Same positioning for RTL
  },
  tooltipArrow: {
    position: 'absolute',
    bottom: -6,
    left: '50%',
    marginLeft: -6,
    width: 0,
    height: 0,
    borderLeftWidth: 6,
    borderRightWidth: 6,
    borderTopWidth: 6,
    borderLeftColor: 'transparent',
    borderRightColor: 'transparent',
    borderTopColor: 'rgba(239, 68, 68, 0.95)',
  },
  tooltipContent: {
    backgroundColor: 'rgba(239, 68, 68, 0.95)',
    borderRadius: borderRadius.md,
    padding: spacing.sm,
    paddingHorizontal: spacing.md,
  },
  tooltipText: {
    fontSize: 12,
    color: '#fff',
    lineHeight: 18,
  },
  textRTL: {
    textAlign: 'right',
  },
});

export default FlowFormModal;
