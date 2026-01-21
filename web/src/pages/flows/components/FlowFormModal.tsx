/**
 * FlowFormModal Component
 * Create and edit flow modal with Glass UI components
 * Language is determined by app-wide language setting
 */

import React, { useState, useEffect, useMemo } from 'react';
import {
  View,
  Text,
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
        <View className="flex-1 bg-black/85 justify-center items-center p-4 z-[1000]">
          {/* Backdrop */}
          <Pressable className="absolute inset-0" onPress={onClose} />

          {/* Modal Container */}
          <GlassView className={`w-full ${IS_TV_BUILD ? 'max-w-[800px] max-h-[85%]' : 'max-w-[560px] max-h-[90%]'} rounded-2xl overflow-hidden flex flex-col`} intensity="high">
            {/* Close Button */}
            <Pressable
              className={`absolute top-4 ${isRTL ? 'left-4' : 'right-4'} p-2 z-10 rounded-full bg-white/10`}
              onPress={onClose}
            >
              <X size={24} color={colors.textMuted} />
            </Pressable>

            {/* Header */}
            <View className="px-6 pt-6 pb-4 border-b border-white/8 flex-shrink-0">
              <Text className={`${IS_TV_BUILD ? 'text-[28px]' : 'text-[22px]'} font-bold text-white mb-1 ${isRTL ? 'text-right' : ''}`}>
                {isEditing ? t('flows.editFlow') : t('flows.createFlow')}
              </Text>
              <Text className={`${IS_TV_BUILD ? 'text-lg' : 'text-sm'} text-[${colors.textMuted}] ${isRTL ? 'text-right' : ''}`}>
                {isEditing ? t('flows.editFlowDesc') : t('flows.createFlowDesc')}
              </Text>
            </View>

            {/* Scrollable Content */}
            <ScrollView
              className="flex-1 min-h-0 w-full"
              contentContainerStyle={{ padding: spacing.lg, paddingBottom: spacing.xl, width: '100%' }}
              showsVerticalScrollIndicator={false}
            >
              {/* Errors */}
              {errors.length > 0 && (
                <GlassView className="p-4 mb-4 rounded-lg border border-[${colors.error}] bg-[rgba(255,59,48,0.1)]" intensity="low">
                  {errors.map((error, index) => (
                    <Text key={index} className={`text-sm text-[${colors.error}] leading-5 ${isRTL ? 'text-right' : ''}`}>
                      {error}
                    </Text>
                  ))}
                </GlassView>
              )}

              {/* Basic Info Section */}
              <View className="mb-6 w-full">
                <View className={`flex ${isRTL ? 'flex-row-reverse' : 'flex-row'} items-center gap-2 mb-4`}>
                  <Settings size={18} color={colors.primary} />
                  <Text className={`text-[15px] font-semibold text-white ${isRTL ? 'text-right' : ''}`}>
                    {t('flows.basicInfo')}
                  </Text>
                </View>

                {/* Name Input */}
                <GlassInput
                  label={`${t('flows.flowName')} *`}
                  value={formState[getNameField()] as string}
                  onChangeText={(value) => updateField(getNameField(), value)}
                  placeholder={t('flows.flowNamePlaceholder')}
                  containerStyle={{ marginBottom: spacing.sm }}
                />

                {/* Description Input */}
                <GlassInput
                  label={t('flows.description')}
                  value={formState[getDescriptionField()] as string}
                  onChangeText={(value) => updateField(getDescriptionField(), value)}
                  placeholder={t('flows.descriptionPlaceholder')}
                  multiline
                  numberOfLines={3}
                  containerStyle={{ marginBottom: spacing.sm }}
                />
              </View>

              {/* Trigger Section */}
              <View className="mb-6 w-full">
                <View className={`flex ${isRTL ? 'flex-row-reverse' : 'flex-row'} items-center gap-2 mb-4`}>
                  <Clock size={18} color={colors.secondary} />
                  <Text className={`text-[15px] font-semibold text-white ${isRTL ? 'text-right' : ''}`}>
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
              <View className="mb-6 w-full">
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
              <View className="mb-6 w-full">
                <View className={`flex ${isRTL ? 'flex-row-reverse' : 'flex-row'} items-center gap-2 mb-4`}>
                  <Sparkles size={18} color={colors.warning} />
                  <Text className={`text-[15px] font-semibold text-white ${isRTL ? 'text-right' : ''}`}>
                    {t('flows.options')}
                  </Text>
                </View>

                <GlassView className="rounded-lg overflow-hidden" intensity="low">
                  {/* Auto Play Option */}
                  <Pressable
                    className={`flex ${isRTL ? 'flex-row-reverse' : 'flex-row'} items-center p-4 gap-4`}
                    onPress={() => updateField('auto_play', !formState.auto_play)}
                  >
                    <View className={`w-9 h-9 rounded-lg ${formState.auto_play ? `bg-[${colors.primary}]/20` : 'bg-white/5'} justify-center items-center`}>
                      <Play
                        size={18}
                        color={formState.auto_play ? colors.primary : colors.textMuted}
                      />
                    </View>
                    <View className={`flex-1 ${isRTL ? 'items-end' : ''}`}>
                      <Text className={`text-sm font-semibold ${formState.auto_play ? 'text-white' : `text-[${colors.textMuted}]`} mb-0.5 ${isRTL ? 'text-right' : ''}`}>
                        {t('flows.autoPlay')}
                      </Text>
                      <Text className={`text-xs text-[${colors.textMuted}] leading-4 ${isRTL ? 'text-right' : ''}`}>
                        {t('flows.autoPlayDesc')}
                      </Text>
                    </View>
                    <GlassCheckbox
                      checked={formState.auto_play}
                      onChange={() => updateField('auto_play', !formState.auto_play)}
                    />
                  </Pressable>

                  <View className="h-[1px] bg-white/6 mx-4" />

                  {/* AI Enabled Option */}
                  <Pressable
                    className={`flex ${isRTL ? 'flex-row-reverse' : 'flex-row'} items-center p-4 gap-4`}
                    onPress={() => updateField('ai_enabled', !formState.ai_enabled)}
                  >
                    <View className={`w-9 h-9 rounded-lg ${formState.ai_enabled ? `bg-[${colors.warning}]/20` : 'bg-white/5'} justify-center items-center`}>
                      <Sparkles
                        size={18}
                        color={formState.ai_enabled ? colors.warning : colors.textMuted}
                      />
                    </View>
                    <View className={`flex-1 ${isRTL ? 'items-end' : ''}`}>
                      <Text className={`text-sm font-semibold ${formState.ai_enabled ? 'text-white' : `text-[${colors.textMuted}]`} mb-0.5 ${isRTL ? 'text-right' : ''}`}>
                        {t('flows.aiEnabled')}
                      </Text>
                      <Text className={`text-xs text-[${colors.textMuted}] leading-4 ${isRTL ? 'text-right' : ''}`}>
                        {t('flows.aiEnabledDesc')}
                      </Text>
                    </View>
                    <GlassCheckbox
                      checked={formState.ai_enabled}
                      onChange={() => updateField('ai_enabled', !formState.ai_enabled)}
                    />
                  </Pressable>

                  <View className="h-[1px] bg-white/6 mx-4" />

                  {/* AI Brief Option */}
                  <Pressable
                    className={`flex ${isRTL ? 'flex-row-reverse' : 'flex-row'} items-center p-4 gap-4`}
                    onPress={() => updateField('ai_brief_enabled', !formState.ai_brief_enabled)}
                  >
                    <View className={`w-9 h-9 rounded-lg ${formState.ai_brief_enabled ? `bg-[${colors.info}]/20` : 'bg-white/5'} justify-center items-center`}>
                      <FileText
                        size={18}
                        color={formState.ai_brief_enabled ? colors.info : colors.textMuted}
                      />
                    </View>
                    <View className={`flex-1 ${isRTL ? 'items-end' : ''}`}>
                      <Text className={`text-sm font-semibold ${formState.ai_brief_enabled ? 'text-white' : `text-[${colors.textMuted}]`} mb-0.5 ${isRTL ? 'text-right' : ''}`}>
                        {t('flows.aiBrief')}
                      </Text>
                      <Text className={`text-xs text-[${colors.textMuted}] leading-4 ${isRTL ? 'text-right' : ''}`}>
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
            <View className="border-t border-white/8 bg-black/20 flex-shrink-0">
              <View className={`flex ${isRTL ? 'flex-row-reverse' : 'flex-row'} p-4 gap-4`}>
                <GlassButton
                  title={t('common.cancel')}
                  onPress={onClose}
                  variant="ghost"
                  style={{ flex: 1 }}
                />
                <View
                  className="relative flex-1"
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
                    style={{ flex: 1 }}
                  />
                  {/* Validation Tooltip */}
                  {showTooltip && !isFormValid && (
                    <View className={`absolute bottom-full left-0 right-0 mb-2 z-[100] ${isRTL ? '' : ''}`}>
                      <View className="absolute bottom-[-6px] left-1/2 -ml-1.5 w-0 h-0 border-l-[6px] border-r-[6px] border-t-[6px] border-l-transparent border-r-transparent border-t-[rgba(239,68,68,0.95)]" />
                      <View className="bg-[rgba(239,68,68,0.95)] rounded-lg p-2 px-4">
                        {validationErrors.map((error, index) => (
                          <Text key={index} className={`text-xs text-white leading-[18px] ${isRTL ? 'text-right' : ''}`}>
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

export default FlowFormModal;
