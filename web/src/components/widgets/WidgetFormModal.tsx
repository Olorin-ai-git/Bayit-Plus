/**
 * WidgetFormModal Component
 * Modal for creating/editing widgets with content picker integration
 */

import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Pressable,
  ScrollView,
  useWindowDimensions,
} from 'react-native';
import { useTranslation } from 'react-i18next';
import { X, Plus } from 'lucide-react';
import { GlassView, GlassButton, GlassInput } from '@bayit/shared/ui';
import { colors, spacing, borderRadius } from '@bayit/shared/theme';
import { ContentPickerModal } from '@/pages/flows/components/ContentPickerModal';
import { useDirection } from '@/hooks/useDirection';
import logger from '@/utils/logger';
import type { ContentItem } from '@/pages/flows/types/flows.types';

interface WidgetFormModalProps {
  visible: boolean;
  onClose: () => void;
  onSave: (data: any) => Promise<void>;
  initialData?: any;
  isUserWidget?: boolean;
  isAdminWidget?: boolean;
}

interface FormState {
  title: string;
  description: string;
  icon: string;
  content_type: 'live_channel' | 'iframe' | 'podcast' | 'vod' | 'radio' | 'live';
  content_id: string;
  iframe_url: string;
  iframe_title: string;
  position_x: number;
  position_y: number;
  position_width: number;
  position_height: number;
  // Admin-specific fields
  is_muted?: boolean;
  is_closable?: boolean;
  is_draggable?: boolean;
  visible_to_roles?: string[];
  target_pages?: string[];
  order?: number;
}

const DEFAULT_FORM_STATE: FormState = {
  title: '',
  description: '',
  icon: '',
  content_type: 'live_channel',
  content_id: '',
  iframe_url: '',
  iframe_title: '',
  position_x: 20,
  position_y: 100,
  position_width: 350,
  position_height: 197,
  is_muted: true,
  is_closable: true,
  is_draggable: true,
  visible_to_roles: ['user'],
  target_pages: [],
  order: 0,
};

export const WidgetFormModal: React.FC<WidgetFormModalProps> = ({
  visible,
  onClose,
  onSave,
  initialData,
  isUserWidget = false,
  isAdminWidget = false,
}) => {
  const { t } = useTranslation();
  const { isRTL, textAlign, flexDirection } = useDirection();
  const { width } = useWindowDimensions();
  const isMobile = width < 768;

  const [formState, setFormState] = useState<FormState>(DEFAULT_FORM_STATE);
  const [showContentPicker, setShowContentPicker] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selectedContent, setSelectedContent] = useState<ContentItem | null>(null);

  // Initialize form
  useEffect(() => {
    console.log('[WidgetFormModal] visible changed:', visible);
    if (visible) {
      console.log('[WidgetFormModal] Modal visible, initializing');
      if (initialData) {
        setFormState({
          title: initialData.title || '',
          description: initialData.description || '',
          icon: initialData.icon || '',
          content_type: initialData.content?.content_type || 'live_channel',
          content_id: initialData.content?.live_channel_id || initialData.content?.podcast_id || initialData.content?.content_id || initialData.content?.station_id || '',
          iframe_url: initialData.content?.iframe_url || '',
          iframe_title: initialData.content?.iframe_title || '',
          position_x: initialData.position?.x || 20,
          position_y: initialData.position?.y || 100,
          position_width: initialData.position?.width || 350,
          position_height: initialData.position?.height || 197,
          is_muted: initialData.is_muted ?? true,
          is_closable: initialData.is_closable ?? true,
          is_draggable: initialData.is_draggable ?? true,
          visible_to_roles: initialData.visible_to_roles || ['user'],
          target_pages: initialData.target_pages || [],
          order: initialData.order || 0,
        });
      } else {
        setFormState(DEFAULT_FORM_STATE);
      }
      setError(null);
      setSelectedContent(null);
    }
  }, [visible, initialData]);

  const handleUpdateField = (field: keyof FormState, value: any) => {
    setFormState((prev) => ({ ...prev, [field]: value }));
    setError(null);
  };

  const handleContentSelected = (items: ContentItem[]) => {
    if (items.length > 0) {
      const item = items[0];
      let contentType = item.type as any;
      let contentId = item.id;

      // Map flow types to widget content types
      if (contentType === 'live') contentType = 'live_channel';

      setFormState((prev) => ({
        ...prev,
        content_type: contentType,
        content_id: contentId,
        title: prev.title || item.title,
        icon: prev.icon || (item.icon || ''),
      }));
      setSelectedContent(item);
    }
    setShowContentPicker(false);
  };

  const handleSwitchToIframe = () => {
    setFormState((prev) => ({
      ...prev,
      content_type: 'iframe',
      content_id: '',
    }));
    setSelectedContent(null);
  };

  const handleSwitchToContent = () => {
    setShowContentPicker(true);
  };

  const validateForm = (): boolean => {
    if (!formState.title.trim()) {
      setError('Title is required');
      return false;
    }

    if (formState.content_type === 'iframe') {
      if (!formState.iframe_url.trim()) {
        setError('iFrame URL is required');
        return false;
      }
    } else {
      if (!formState.content_id) {
        setError('Please select content');
        return false;
      }
    }

    return true;
  };

  const handleSave = async () => {
    if (!validateForm()) return;

    setSaving(true);
    try {
      const payload: any = {
        title: formState.title,
        description: formState.description || null,
        icon: formState.icon || null,
        content: {
          content_type: formState.content_type === 'live_channel' ? 'live_channel' : formState.content_type === 'iframe' ? 'iframe' : formState.content_type,
          ...(formState.content_type === 'live_channel' && { live_channel_id: formState.content_id }),
          ...(formState.content_type === 'podcast' && { podcast_id: formState.content_id }),
          ...(formState.content_type === 'vod' && { content_id: formState.content_id }),
          ...(formState.content_type === 'radio' && { station_id: formState.content_id }),
          ...(formState.content_type === 'iframe' && {
            iframe_url: formState.iframe_url,
            iframe_title: formState.iframe_title,
          }),
        },
        position: {
          x: formState.position_x,
          y: formState.position_y,
          width: formState.position_width,
          height: formState.position_height,
          z_index: 100,
        },
        is_muted: formState.is_muted ?? true,
        is_closable: formState.is_closable ?? true,
        is_draggable: formState.is_draggable ?? true,
      };

      // Add admin-specific fields if admin widget
      if (isAdminWidget) {
        payload.visible_to_roles = formState.visible_to_roles || ['user'];
        payload.visible_to_subscription_tiers = [];
        payload.target_pages = formState.target_pages || [];
        payload.order = formState.order || 0;
      }

      await onSave(payload);
      setFormState(DEFAULT_FORM_STATE);
      setSelectedContent(null);
      onClose();
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Failed to save widget';
      logger.error(msg, 'WidgetFormModal', err);
      setError(msg);
    } finally {
      setSaving(false);
    }
  };

  if (!visible) return null;

  const iframeModeActive = formState.content_type === 'iframe';
  const contentModeActive = !iframeModeActive;

  return (
    <>
      <View style={styles.overlay}>
        <Pressable style={styles.backdrop} onPress={onClose} />

        <GlassView style={[styles.modal, isMobile && styles.modalMobile]} intensity="high">
          {/* Header */}
          <View style={[styles.header, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}>
            <Text style={[styles.title, { textAlign: isRTL ? 'right' : 'left' }]}>
              {t('widgets.form.title')}
            </Text>
            <Pressable onPress={onClose} style={styles.closeButton}>
              <X size={20} color={colors.text} />
            </Pressable>
          </View>

          <ScrollView style={styles.content} contentContainerStyle={styles.contentInner}>
            {/* Basic Info */}
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>{t('widgets.form.basicInfo')}</Text>
              <GlassInput
                inputStyle={styles.input}
                placeholder={t('widgets.form.titlePlaceholder')}
                value={formState.title}
                onChangeText={(v) => handleUpdateField('title', v)}
              />
              <GlassInput
                inputStyle={styles.input}
                placeholder={t('widgets.form.descriptionPlaceholder')}
                value={formState.description}
                onChangeText={(v) => handleUpdateField('description', v)}
                multiline
                numberOfLines={2}
              />
              <GlassInput
                inputStyle={styles.input}
                placeholder={t('widgets.form.iconPlaceholder')}
                value={formState.icon}
                onChangeText={(v) => handleUpdateField('icon', v)}
                maxLength={2}
              />
            </View>

            {/* Content Selection */}
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>{t('widgets.form.content')}</Text>

              {/* Content Mode Toggle */}
              <View style={[styles.modeToggle, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}>
                <Pressable
                  style={[styles.modeButton, contentModeActive && styles.modeButtonActive]}
                  onPress={handleSwitchToContent}
                >
                  <Text style={[styles.modeButtonText, contentModeActive && styles.modeButtonTextActive]}>
                    {t('widgets.form.fromLibrary')}
                  </Text>
                </Pressable>
                <Pressable
                  style={[styles.modeButton, iframeModeActive && styles.modeButtonActive]}
                  onPress={handleSwitchToIframe}
                >
                  <Text style={[styles.modeButtonText, iframeModeActive && styles.modeButtonTextActive]}>
                    {t('widgets.form.iframe')}
                  </Text>
                </Pressable>
              </View>

              {/* Content from Library */}
              {contentModeActive && (
                <View>
                  {selectedContent ? (
                    <View style={styles.selectedContent}>
                      <Text style={styles.selectedContentText}>
                        {t('common.selected', 'Selected')}: {selectedContent.title}
                      </Text>
                      <Pressable
                        style={styles.changeButton}
                        onPress={handleSwitchToContent}
                      >
                        <Text style={styles.changeButtonText}>{t('widgets.form.change')}</Text>
                      </Pressable>
                    </View>
                  ) : (
                    <Pressable
                      style={styles.selectContentButton}
                      onPress={handleSwitchToContent}
                    >
                      <Plus size={16} color={colors.primary} />
                      <Text style={styles.selectContentButtonText}>
                        {t('widgets.form.selectContent')}
                      </Text>
                    </Pressable>
                  )}
                </View>
              )}

              {/* iFrame Mode */}
              {iframeModeActive && (
                <View>
                  <GlassInput
                    inputStyle={styles.input}
                    placeholder={t('widgets.form.iframeUrl')}
                    value={formState.iframe_url}
                    onChangeText={(v) => handleUpdateField('iframe_url', v)}
                  />
                  <GlassInput
                    inputStyle={styles.input}
                    placeholder={t('widgets.form.iframeTitle')}
                    value={formState.iframe_title}
                    onChangeText={(v) => handleUpdateField('iframe_title', v)}
                  />
                </View>
              )}
            </View>

            {/* Position */}
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>{t('widgets.form.positionSize')}</Text>
              <View style={[styles.positionRow, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}>
                <View style={styles.positionField}>
                  <Text style={styles.positionLabel}>X</Text>
                  <GlassInput
                    inputStyle={styles.positionInput}
                    value={String(formState.position_x)}
                    onChangeText={(v) => handleUpdateField('position_x', parseInt(v) || 0)}
                    keyboardType="number-pad"
                  />
                </View>
                <View style={styles.positionField}>
                  <Text style={styles.positionLabel}>Y</Text>
                  <GlassInput
                    inputStyle={styles.positionInput}
                    value={String(formState.position_y)}
                    onChangeText={(v) => handleUpdateField('position_y', parseInt(v) || 0)}
                    keyboardType="number-pad"
                  />
                </View>
                <View style={styles.positionField}>
                  <Text style={styles.positionLabel}>Width</Text>
                  <GlassInput
                    inputStyle={styles.positionInput}
                    value={String(formState.position_width)}
                    onChangeText={(v) => handleUpdateField('position_width', parseInt(v) || 350)}
                    keyboardType="number-pad"
                  />
                </View>
                <View style={styles.positionField}>
                  <Text style={styles.positionLabel}>Height</Text>
                  <GlassInput
                    inputStyle={styles.positionInput}
                    value={String(formState.position_height)}
                    onChangeText={(v) => handleUpdateField('position_height', parseInt(v) || 197)}
                    keyboardType="number-pad"
                  />
                </View>
              </View>
            </View>

            {/* Admin Fields */}
            {isAdminWidget && (
              <>
                <View style={styles.section}>
                  <Text style={styles.sectionTitle}>{t('widgets.form.behavior')}</Text>
                  <View style={styles.checkboxContainer}>
                    <View style={[styles.checkboxRow, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}>
                      <input
                        type="checkbox"
                        id="is_muted"
                        checked={formState.is_muted ?? true}
                        onChange={(e) => handleUpdateField('is_muted', e.target.checked)}
                        style={styles.checkbox}
                      />
                      <Text style={styles.checkboxLabel}>{t('widgets.form.mutedByDefault')}</Text>
                    </View>
                    <View style={[styles.checkboxRow, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}>
                      <input
                        type="checkbox"
                        id="is_closable"
                        checked={formState.is_closable ?? true}
                        onChange={(e) => handleUpdateField('is_closable', e.target.checked)}
                        style={styles.checkbox}
                      />
                      <Text style={styles.checkboxLabel}>{t('widgets.form.closable')}</Text>
                    </View>
                    <View style={[styles.checkboxRow, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}>
                      <input
                        type="checkbox"
                        id="is_draggable"
                        checked={formState.is_draggable ?? true}
                        onChange={(e) => handleUpdateField('is_draggable', e.target.checked)}
                        style={styles.checkbox}
                      />
                      <Text style={styles.checkboxLabel}>{t('widgets.form.draggable')}</Text>
                    </View>
                  </View>
                </View>

                <View style={styles.section}>
                  <Text style={styles.sectionTitle}>{t('widgets.form.widgetOrder')}</Text>
                  <GlassInput
                    inputStyle={styles.input}
                    placeholder={t('widgets.form.orderPlaceholder')}
                    value={String(formState.order || 0)}
                    onChangeText={(v) => handleUpdateField('order', parseInt(v) || 0)}
                    keyboardType="number-pad"
                  />
                </View>
              </>
            )}

            {/* Error */}
            {error && (
              <View style={styles.errorBox}>
                <Text style={styles.errorText}>{error}</Text>
              </View>
            )}
          </ScrollView>

          {/* Actions */}
          <View style={[styles.actions, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}>
            <Pressable
              style={[styles.saveButton, saving && styles.buttonDisabled]}
              onPress={handleSave}
              disabled={saving}
            >
              <Text style={styles.saveButtonText}>
                {saving ? t('widgets.form.saving') : t('widgets.form.saveWidget')}
              </Text>
            </Pressable>
            <Pressable style={styles.cancelButton} onPress={onClose}>
              <Text style={styles.cancelButtonText}>{t('widgets.form.cancel')}</Text>
            </Pressable>
          </View>
        </GlassView>
      </View>

      {/* Content Picker Modal */}
      <ContentPickerModal
        visible={showContentPicker}
        onClose={() => setShowContentPicker(false)}
        onAdd={handleContentSelected}
        existingItems={[]}
        defaultType={formState.content_type as any === 'live_channel' ? 'live' : (formState.content_type as any)}
      />
    </>
  );
};

const styles = StyleSheet.create({
  overlay: {
    position: 'fixed' as any,
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    zIndex: 9999,
  },
  backdrop: {
    ...StyleSheet.absoluteFillObject,
  },
  modal: {
    width: '90%',
    maxWidth: 600,
    borderRadius: borderRadius.xl,
    overflow: 'hidden',
  },
  modalMobile: {
    width: '95%',
    maxHeight: '90%',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255, 255, 255, 0.1)',
  },
  title: {
    fontSize: 20,
    fontWeight: '600',
    color: colors.text,
  },
  closeButton: {
    padding: spacing.sm,
  },
  content: {
    maxHeight: 400,
  },
  contentInner: {
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    gap: spacing.lg,
  },
  section: {
    gap: spacing.md,
  },
  sectionTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.textSecondary,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  input: {
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
    borderRadius: borderRadius.md,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    fontSize: 14,
    color: colors.text,
    minHeight: 44,
  },
  modeToggle: {
    gap: spacing.sm,
  },
  modeButton: {
    flex: 1,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
    borderRadius: borderRadius.md,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
    alignItems: 'center',
  },
  modeButtonActive: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  modeButtonText: {
    fontSize: 13,
    fontWeight: '500',
    color: colors.textMuted,
  },
  modeButtonTextActive: {
    color: colors.text,
  },
  selectedContent: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: borderRadius.md,
    backgroundColor: 'rgba(107, 33, 168, 0.2)',
    borderWidth: 1,
    borderColor: colors.primary,
  },
  selectedContentText: {
    fontSize: 13,
    color: colors.text,
    flex: 1,
  },
  changeButton: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
    borderRadius: borderRadius.sm,
    backgroundColor: colors.primary,
  },
  changeButtonText: {
    fontSize: 12,
    fontWeight: '600',
    color: colors.text,
  },
  selectContentButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.md,
    borderRadius: borderRadius.md,
    borderWidth: 1,
    borderColor: colors.primary,
    gap: spacing.sm,
  },
  selectContentButtonText: {
    fontSize: 14,
    color: colors.primary,
    fontWeight: '500',
  },
  positionRow: {
    gap: spacing.sm,
  },
  positionField: {
    flex: 1,
  },
  positionLabel: {
    fontSize: 12,
    color: colors.textMuted,
    marginBottom: spacing.xs,
    fontWeight: '600',
  },
  positionInput: {
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
    borderRadius: borderRadius.md,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    fontSize: 13,
    color: colors.text,
    minHeight: 36,
  },
  errorBox: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: borderRadius.md,
    backgroundColor: 'rgba(239, 68, 68, 0.1)',
  },
  errorText: {
    fontSize: 13,
    color: '#ef4444',
  },
  actions: {
    flexDirection: 'row',
    gap: spacing.md,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    borderTopWidth: 1,
    borderTopColor: 'rgba(255, 255, 255, 0.1)',
  },
  saveButton: {
    flex: 1,
    backgroundColor: colors.primary,
    paddingVertical: spacing.md,
    borderRadius: borderRadius.md,
    alignItems: 'center',
  },
  saveButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.text,
  },
  cancelButton: {
    flex: 1,
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
    paddingVertical: spacing.md,
    borderRadius: borderRadius.md,
    alignItems: 'center',
  },
  cancelButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.text,
  },
  buttonDisabled: {
    opacity: 0.5,
  },
  checkboxContainer: {
    gap: spacing.md,
  },
  checkboxRow: {
    alignItems: 'center',
    gap: spacing.sm,
  },
  checkbox: {
    width: 18,
    height: 18,
    cursor: 'pointer',
  },
  checkboxLabel: {
    fontSize: 14,
    color: colors.text,
  },
});

export default WidgetFormModal;
