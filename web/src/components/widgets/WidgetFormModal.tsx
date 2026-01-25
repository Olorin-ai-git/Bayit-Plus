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
} from 'react-native';
import { useTranslation } from 'react-i18next';
import { Plus } from 'lucide-react';
import { GlassModal, GlassButton, GlassInput, GlassToggle } from '@bayit/shared/ui';
import { colors, spacing, borderRadius } from '@olorin/design-tokens';
import { useDirection } from '@/hooks/useDirection';
import { adminWidgetsService } from '@/services/adminApi';
import logger from '@/utils/logger';
import type { ContentItem } from './form/ContentSelectionSection';
import ContentPickerModal from './ContentPickerModal';

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
  position_width: 640,
  position_height: 360,
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

  const [formState, setFormState] = useState<FormState>(DEFAULT_FORM_STATE);
  const [showContentPicker, setShowContentPicker] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selectedContent, setSelectedContent] = useState<ContentItem | null>(null);
  const [validatingName, setValidatingName] = useState(false);

  // Initialize form
  useEffect(() => {
    if (visible) {
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
          position_width: initialData.position?.width || 640,
          position_height: initialData.position?.height || 360,
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
    }
  }, [visible, initialData]);

  const handleUpdateField = (field: keyof FormState, value: any) => {
    setFormState((prev) => ({ ...prev, [field]: value }));
    setError(null);
  };

  const handleTitleBlur = async () => {
    // Validate title on blur for immediate feedback
    if (formState.title.trim()) {
      setValidatingName(true);
      try {
        const result = await adminWidgetsService.checkWidgetName(
          formState.title.trim(),
          initialData?.id
        );

        if (result.exists) {
          setError(t('widgets.form.errors.nameExists', 'A widget with this name already exists'));
        }
      } catch (err) {
        logger.error('Failed to check widget name on blur', 'WidgetFormModal', err);
      } finally {
        setValidatingName(false);
      }
    }
  };

  const handleSwitchToContent = () => {
    setShowContentPicker(true);
  };

  const handleSwitchToIframe = () => {
    setFormState((prev) => ({
      ...prev,
      content_type: 'iframe',
      content_id: '',
    }));
    setSelectedContent(null);
  };

  const handleContentSelected = (content: ContentItem) => {
    setSelectedContent(content);
    setFormState((prev) => ({
      ...prev,
      content_type: content.type,
      content_id: content.id,
      iframe_url: '',
      iframe_title: '',
    }));
    setShowContentPicker(false);
  };

  const validateForm = async (): Promise<boolean> => {
    // Check if title is provided
    if (!formState.title.trim()) {
      setError(t('widgets.form.errors.titleRequired', 'Title is required'));
      return false;
    }

    // Check if widget name already exists
    setValidatingName(true);
    try {
      const result = await adminWidgetsService.checkWidgetName(
        formState.title.trim(),
        initialData?.id // Exclude current widget when editing
      );

      if (result.exists) {
        setError(t('widgets.form.errors.nameExists', 'A widget with this name already exists'));
        setValidatingName(false);
        return false;
      }
    } catch (err) {
      logger.error('Failed to check widget name', 'WidgetFormModal', err);
      // Continue with validation even if check fails
    } finally {
      setValidatingName(false);
    }

    if (formState.content_type === 'iframe') {
      if (!formState.iframe_url.trim()) {
        setError(t('widgets.form.errors.iframeUrlRequired', 'iFrame URL is required'));
        return false;
      }
    } else {
      if (!formState.content_id) {
        setError(t('widgets.form.errors.contentRequired', 'Please select content'));
        return false;
      }
    }

    return true;
  };

  const handleSave = async () => {
    const isValid = await validateForm();
    if (!isValid) return;

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

  const iframeModeActive = formState.content_type === 'iframe';
  const contentModeActive = !iframeModeActive;

  return (
    <>
      <GlassModal
        visible={visible}
        title={t('widgets.form.title')}
        onClose={onClose}
        dismissable
        buttons={[]}
      >
        <ScrollView style={styles.content} contentContainerStyle={styles.contentInner}>
          {/* Basic Info */}
          <View style={styles.section}>
            <Text style={[styles.sectionTitle, { textAlign }]}>{t('widgets.form.basicInfo')}</Text>
            <GlassInput
              inputStyle={styles.input}
              placeholder={t('widgets.form.titlePlaceholder')}
              value={formState.title}
              onChangeText={(v) => handleUpdateField('title', v)}
              onBlur={handleTitleBlur}
              error={error && error.includes('name') ? error : undefined}
            />
            <GlassInput
              inputStyle={styles.input}
              placeholder={t('widgets.form.descriptionPlaceholder')}
              value={formState.description}
              onChangeText={(v) => handleUpdateField('description', v)}
              multiline
              numberOfLines={2}
            />
          </View>

          {/* Content Selection */}
          <View style={styles.section}>
            <Text style={[styles.sectionTitle, { textAlign }]}>{t('widgets.form.content')}</Text>

            {/* Content Mode Toggle */}
            <View style={[styles.modeToggle, { flexDirection }]}>
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
                  <View style={[styles.selectedContent, { flexDirection }]}>
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
                    style={[styles.selectContentButton, { flexDirection }]}
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
              <View style={styles.iframeFields}>
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
            <Text style={[styles.sectionTitle, { textAlign }]}>{t('widgets.form.positionSize')}</Text>
            <View style={[styles.positionRow, { flexDirection }]}>
              <View style={styles.positionField}>
                <Text style={[styles.positionLabel, { textAlign }]}>X</Text>
                <GlassInput
                  inputStyle={styles.positionInput}
                  value={String(formState.position_x)}
                  onChangeText={(v) => handleUpdateField('position_x', parseInt(v) || 0)}
                  keyboardType="number-pad"
                />
              </View>
              <View style={styles.positionField}>
                <Text style={[styles.positionLabel, { textAlign }]}>Y</Text>
                <GlassInput
                  inputStyle={styles.positionInput}
                  value={String(formState.position_y)}
                  onChangeText={(v) => handleUpdateField('position_y', parseInt(v) || 0)}
                  keyboardType="number-pad"
                />
              </View>
              <View style={styles.positionField}>
                <Text style={[styles.positionLabel, { textAlign }]}>Width</Text>
                <GlassInput
                  inputStyle={styles.positionInput}
                  value={String(formState.position_width)}
                  onChangeText={(v) => handleUpdateField('position_width', parseInt(v) || 640)}
                  keyboardType="number-pad"
                />
              </View>
              <View style={styles.positionField}>
                <Text style={[styles.positionLabel, { textAlign }]}>Height</Text>
                <GlassInput
                  inputStyle={styles.positionInput}
                  value={String(formState.position_height)}
                  onChangeText={(v) => handleUpdateField('position_height', parseInt(v) || 360)}
                  keyboardType="number-pad"
                />
              </View>
            </View>
          </View>

          {/* Admin Fields */}
          {isAdminWidget && (
            <>
              <View style={styles.section}>
                <Text style={[styles.sectionTitle, { textAlign }]}>{t('widgets.form.behavior')}</Text>
                <View style={styles.toggleContainer}>
                  <View style={[styles.toggleRow, { flexDirection }]}>
                    <Text style={[styles.toggleLabel, { textAlign }]}>{t('widgets.form.mutedByDefault')}</Text>
                    <GlassToggle
                      value={formState.is_muted ?? true}
                      onValueChange={(v) => handleUpdateField('is_muted', v)}
                      size="small"
                      isRTL={isRTL}
                    />
                  </View>
                  <View style={[styles.toggleRow, { flexDirection }]}>
                    <Text style={[styles.toggleLabel, { textAlign }]}>{t('widgets.form.closable')}</Text>
                    <GlassToggle
                      value={formState.is_closable ?? true}
                      onValueChange={(v) => handleUpdateField('is_closable', v)}
                      size="small"
                      isRTL={isRTL}
                    />
                  </View>
                  <View style={[styles.toggleRow, { flexDirection }]}>
                    <Text style={[styles.toggleLabel, { textAlign }]}>{t('widgets.form.draggable')}</Text>
                    <GlassToggle
                      value={formState.is_draggable ?? true}
                      onValueChange={(v) => handleUpdateField('is_draggable', v)}
                      size="small"
                      isRTL={isRTL}
                    />
                  </View>
                </View>
              </View>

              <View style={styles.section}>
                <Text style={[styles.sectionTitle, { textAlign }]}>{t('widgets.form.widgetOrder')}</Text>
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
        <View style={[styles.actions, { flexDirection }]}>
          <GlassButton
            title={t('widgets.form.cancel')}
            variant="ghost"
            onPress={onClose}
            style={styles.actionButton}
          />
          <GlassButton
            title={
              saving
                ? t('widgets.form.saving')
                : validatingName
                ? t('widgets.form.validating', 'Validating...')
                : t('widgets.form.saveWidget')
            }
            variant="primary"
            onPress={handleSave}
            loading={saving || validatingName}
            disabled={saving || validatingName}
            style={styles.actionButton}
          />
        </View>
      </GlassModal>

      {/* Content Picker Modal */}
      <ContentPickerModal
        visible={showContentPicker}
        onClose={() => setShowContentPicker(false)}
        onSelect={handleContentSelected}
      />
    </>
  );
};

const styles = StyleSheet.create({
  content: {
    maxHeight: 500,
    paddingHorizontal: spacing.sm,
  },
  contentInner: {
    gap: spacing.xl,
    paddingBottom: spacing.md,
  },
  section: {
    gap: spacing.md,
    paddingHorizontal: spacing.xs,
  },
  sectionTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: colors.primary.DEFAULT,
    textTransform: 'uppercase',
    letterSpacing: 1,
    marginBottom: spacing.xs,
  },
  input: {
    width: '100%',
    backgroundColor: 'rgba(0, 0, 0, 0.3)',
    borderWidth: 1,
    borderColor: colors.glassBorder,
    borderRadius: borderRadius.lg,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.md,
    fontSize: 15,
    color: colors.text,
    minHeight: 48,
    outlineStyle: 'none' as any,
  },
  modeToggle: {
    gap: spacing.sm,
  },
  modeButton: {
    flex: 1,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.md,
    borderRadius: borderRadius.lg,
    borderWidth: 2,
    borderColor: 'rgba(255, 255, 255, 0.1)',
    backgroundColor: 'rgba(0, 0, 0, 0.2)',
    alignItems: 'center',
  },
  modeButtonActive: {
    backgroundColor: colors.glassPurple,
    borderColor: colors.primary.DEFAULT,
  },
  modeButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.textSecondary,
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
    borderColor: colors.primary.DEFAULT,
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
    backgroundColor: colors.primary.DEFAULT,
  },
  changeButtonText: {
    fontSize: 12,
    fontWeight: '600',
    color: colors.text,
  },
  selectContentButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    borderRadius: borderRadius.lg,
    borderWidth: 2,
    borderColor: colors.primary.DEFAULT,
    backgroundColor: 'rgba(107, 33, 168, 0.1)',
    gap: spacing.sm,
    minHeight: 52,
  },
  selectContentButtonText: {
    fontSize: 15,
    color: colors.primary.DEFAULT,
    fontWeight: '600',
  },
  iframeFields: {
    gap: spacing.sm,
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
  toggleContainer: {
    gap: spacing.md,
  },
  toggleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  toggleLabel: {
    fontSize: 14,
    color: colors.text,
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
    paddingTop: spacing.lg,
    paddingHorizontal: spacing.sm,
    borderTopWidth: 1,
    borderTopColor: colors.glassBorder,
    marginTop: spacing.md,
  },
  actionButton: {
    flex: 1,
    minHeight: 48,
  },
});

export default WidgetFormModal;
