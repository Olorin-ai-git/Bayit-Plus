import React, { useState, useEffect } from 'react'
import { View, Text, StyleSheet, Pressable, ScrollView, TextInput, Image, KeyboardAvoidingView, Platform } from 'react-native'
import { Check, AlertTriangle, AlertCircle } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { GlassModal } from '@bayit/shared/ui'
import { colors, spacing, borderRadius } from '@bayit/shared/theme'
import { useDirection } from '@/hooks/useDirection'

export interface ContentItem {
  id: string
  title: string
  description?: string
  thumbnail?: string
  year?: number
  is_series: boolean
  episode_count?: number
}

interface MergeConfirmationModalProps {
  visible: boolean
  selectedItems: ContentItem[]
  onClose: () => void
  onConfirm: (keepId: string, action: 'unpublish' | 'delete', reason: string) => Promise<void>
}

const MergeConfirmationModal: React.FC<MergeConfirmationModalProps> = ({
  visible,
  selectedItems,
  onClose,
  onConfirm
}) => {
  const { t } = useTranslation()
  const { isRTL, flexDirection, textAlign } = useDirection()

  const [selectedKeepId, setSelectedKeepId] = useState<string>(selectedItems[0]?.id || '')
  const [action, setAction] = useState<'unpublish' | 'delete'>('unpublish')
  const [reason, setReason] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  console.log('[MergeConfirmationModal] Rendering:', {
    visible,
    selectedItemsCount: selectedItems.length,
    selectedKeepId,
    hasItems: selectedItems.length > 0
  })

  // Update selectedKeepId when selectedItems change
  useEffect(() => {
    if (selectedItems.length > 0 && !selectedItems.find(item => item.id === selectedKeepId)) {
      setSelectedKeepId(selectedItems[0].id)
    }
  }, [selectedItems, selectedKeepId])

  const removedItems = selectedItems.filter(item => item.id !== selectedKeepId)
  const keptItem = selectedItems.find(item => item.id === selectedKeepId)

  const canSubmit = reason.trim().length >= 10 && selectedKeepId

  const handleConfirm = async () => {
    if (!canSubmit) {
      setError(t('admin.content.mergeReasonTooShort', 'Reason must be at least 10 characters'))
      return
    }

    setLoading(true)
    setError(null)
    try {
      await onConfirm(selectedKeepId, action, reason)
    } catch (err: any) {
      setError(err?.message || err?.detail || 'Failed to merge content')
    } finally {
      setLoading(false)
    }
  }

  if (!visible) {
    console.log('[MergeConfirmationModal] Not visible, returning null')
    return null
  }

  console.log('[MergeConfirmationModal] About to render GlassModal')

  return (
    <GlassModal
      visible={visible}
      title={t('admin.content.mergeContent', 'Merge Content')}
      onClose={onClose}
      dismissable={!loading}
      buttons={[]}
    >
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.keyboardAvoid}
      >
        <ScrollView style={styles.scrollView}>
        {/* Header */}
        <View style={styles.section}>
          <View style={[styles.headerRow, { flexDirection }]}>
            <Text style={[styles.headerTitle, { textAlign }]}>
              {t('admin.content.selectItemToKeep', 'Select item to keep')}
            </Text>
            <View style={styles.countBadge}>
              <Text style={styles.countBadgeText}>{selectedItems.length}</Text>
            </View>
          </View>
        </View>

        {/* Item Selection */}
        <View style={styles.section}>
          {selectedItems.map((item) => (
            <Pressable
              key={item.id}
              style={[
                styles.itemCard,
                { flexDirection },
                selectedKeepId === item.id && styles.itemCardSelected
              ]}
              onPress={() => setSelectedKeepId(item.id)}
            >
              {item.thumbnail && (
                <View style={styles.thumbnailContainer}>
                  <Image
                    source={{ uri: item.thumbnail }}
                    style={styles.thumbnail}
                    resizeMode="cover"
                    accessibilityLabel={item.title}
                  />
                </View>
              )}
              <View style={styles.itemInfo}>
                <Text style={[styles.itemTitle, { textAlign }]}>{item.title}</Text>
                {item.year && (
                  <Text style={[styles.itemMeta, { textAlign }]}>
                    {item.year}
                  </Text>
                )}
                {item.is_series && item.episode_count !== undefined && (
                  <Text style={[styles.itemMeta, { textAlign }]}>
                    {item.episode_count} {t('admin.content.episodes', 'episodes')}
                  </Text>
                )}
              </View>
              {selectedKeepId === item.id && (
                <View style={styles.checkIcon}>
                  <Check size={20} color={colors.primary} />
                </View>
              )}
            </Pressable>
          ))}
        </View>

        {/* Action Selection */}
        <View style={styles.section}>
          <Text style={[styles.sectionLabel, { textAlign }]}>
            {t('admin.content.removeAction', 'What to do with removed items?')}
          </Text>
          <Pressable
            style={[
              styles.actionCard,
              { flexDirection },
              action === 'unpublish' && styles.actionCardSelected
            ]}
            onPress={() => setAction('unpublish')}
          >
            <View style={styles.radioButton}>
              {action === 'unpublish' && <View style={styles.radioButtonInner} />}
            </View>
            <View style={styles.actionInfo}>
              <Text style={styles.actionTitle}>
                {t('admin.content.removeActionUnpublish', 'Unpublish (recommended)')}
              </Text>
              <Text style={styles.actionDescription}>
                {t('admin.content.unpublishDescription', 'Items will be hidden but can be restored later')}
              </Text>
            </View>
          </Pressable>

          <Pressable
            style={[
              styles.actionCard,
              { flexDirection },
              action === 'delete' && styles.actionCardSelected
            ]}
            onPress={() => setAction('delete')}
          >
            <View style={styles.radioButton}>
              {action === 'delete' && <View style={styles.radioButtonInner} />}
            </View>
            <View style={styles.actionInfo}>
              <Text style={styles.actionTitle}>
                {t('admin.content.removeActionDelete', 'Delete permanently')}
              </Text>
              <Text style={[styles.actionDescription, { color: colors.error }]}>
                {t('admin.content.deleteWarning', '⚠️ Deleted items cannot be recovered')}
              </Text>
            </View>
          </Pressable>
        </View>

        {/* Reason Input */}
        <View style={styles.section}>
          <Text style={[styles.sectionLabel, { textAlign }]}>
            {t('admin.content.mergeReason', 'Reason for merge')}
          </Text>
          <TextInput
            style={[styles.reasonInput, { textAlign }]}
            placeholder={t('admin.content.mergeReasonPlaceholder', 'Enter reason (min 10 characters)...')}
            placeholderTextColor={colors.textMuted}
            value={reason}
            onChangeText={setReason}
            multiline
            numberOfLines={3}
            editable={!loading}
          />
          <Text style={[styles.charCount, { textAlign: isRTL ? 'left' : 'right' }]}>
            {reason.length}/500
          </Text>
        </View>

        {/* Preview */}
        <View style={styles.previewCard}>
          <View style={[styles.previewRow, { flexDirection }]}>
            <Check size={16} color={colors.success} />
            <Text style={styles.previewText}>
              {t('admin.content.itemWillBeKept', 'This item will be kept')}:
            </Text>
          </View>
          {keptItem && (
            <Text style={[styles.previewTitle, { textAlign }]}>
              {keptItem.title}
            </Text>
          )}

          <View style={[styles.previewRow, { flexDirection, marginTop: spacing.md }]}>
            <AlertTriangle size={16} color={colors.warning} />
            <Text style={styles.previewText}>
              {t('admin.content.itemsWillBeRemoved', {
                count: removedItems.length,
                action: action === 'unpublish' ? 'unpublished' : 'deleted',
                defaultValue: `${removedItems.length} items will be ${action === 'unpublish' ? 'unpublished' : 'deleted'}`
              })}:
            </Text>
          </View>
          {removedItems.map((item) => (
            <Text key={item.id} style={[styles.previewSubtitle, { textAlign }]}>
              • {item.title}
            </Text>
          ))}
        </View>

        {/* Error Message */}
        {error && (
          <View style={[styles.errorCard, { flexDirection }]}>
            <AlertCircle size={20} color={colors.error} />
            <Text style={styles.errorText}>{error}</Text>
          </View>
        )}
        </ScrollView>
      </KeyboardAvoidingView>

      {/* Actions */}
      <View style={[styles.actions, { flexDirection }]}>
        <Pressable
          style={({ pressed }) => [
            styles.button,
            styles.cancelButton,
            pressed && styles.buttonPressed
          ]}
          onPress={onClose}
          disabled={loading}
        >
          <Text style={styles.cancelButtonText}>
            {t('common.cancel', 'Cancel')}
          </Text>
        </Pressable>
        <Pressable
          style={({ pressed }) => [
            styles.button,
            action === 'delete' ? styles.dangerButton : styles.confirmButton,
            pressed && styles.buttonPressed,
            (!canSubmit || loading) && styles.buttonDisabled
          ]}
          onPress={handleConfirm}
          disabled={!canSubmit || loading}
        >
          <Text style={styles.confirmButtonText}>
            {loading
              ? t('common.processing', 'Processing...')
              : t('admin.content.confirmMerge', 'Merge Items')}
          </Text>
        </Pressable>
      </View>
    </GlassModal>
  )
}

const styles = StyleSheet.create({
  keyboardAvoid: {
    flex: 1,
  },
  scrollView: {
    maxHeight: 600,
  },
  section: {
    marginBottom: spacing.lg,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  headerTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.text,
  },
  countBadge: {
    backgroundColor: colors.primary,
    borderRadius: borderRadius.full,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    minWidth: 28,
    alignItems: 'center',
  },
  countBadgeText: {
    fontSize: 12,
    fontWeight: '700',
    color: colors.text,
  },
  itemCard: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: spacing.md,
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    borderRadius: borderRadius.lg,
    borderWidth: 2,
    borderColor: 'rgba(255, 255, 255, 0.1)',
    marginBottom: spacing.sm,
  },
  itemCardSelected: {
    backgroundColor: 'rgba(168, 85, 247, 0.15)',
    borderColor: colors.primary,
  },
  thumbnailContainer: {
    marginHorizontal: spacing.md,
  },
  thumbnail: {
    width: 60,
    height: 90,
    borderRadius: borderRadius.md,
  },
  itemInfo: {
    flex: 1,
  },
  itemTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.text,
    marginBottom: spacing.xs,
  },
  itemMeta: {
    fontSize: 14,
    color: colors.textMuted,
  },
  checkIcon: {
    marginHorizontal: spacing.sm,
  },
  sectionLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.text,
    marginBottom: spacing.sm,
  },
  actionCard: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    padding: spacing.md,
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    borderRadius: borderRadius.lg,
    borderWidth: 2,
    borderColor: 'rgba(255, 255, 255, 0.1)',
    marginBottom: spacing.sm,
    minHeight: 44,
  },
  actionCardSelected: {
    backgroundColor: 'rgba(168, 85, 247, 0.1)',
    borderColor: colors.primary,
  },
  radioButton: {
    width: 44,
    height: 44,
    borderRadius: borderRadius.full,
    borderWidth: 2,
    borderColor: colors.textMuted,
    marginHorizontal: spacing.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  radioButtonInner: {
    width: 16,
    height: 16,
    borderRadius: borderRadius.full,
    backgroundColor: colors.primary,
  },
  actionInfo: {
    flex: 1,
  },
  actionTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.text,
    marginBottom: spacing.xs,
  },
  actionDescription: {
    fontSize: 13,
    color: colors.textMuted,
    lineHeight: 18,
  },
  reasonInput: {
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
    borderRadius: borderRadius.lg,
    padding: spacing.md,
    fontSize: 14,
    color: colors.text,
    minHeight: 80,
    textAlignVertical: 'top',
  },
  charCount: {
    fontSize: 12,
    color: colors.textMuted,
    marginTop: spacing.xs,
  },
  previewCard: {
    backgroundColor: 'rgba(168, 85, 247, 0.1)',
    borderRadius: borderRadius.lg,
    padding: spacing.md,
    marginBottom: spacing.md,
  },
  previewRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    marginBottom: spacing.xs,
  },
  previewText: {
    fontSize: 13,
    fontWeight: '500',
    color: colors.textMuted,
  },
  previewTitle: {
    fontSize: 15,
    fontWeight: '600',
    color: colors.text,
    marginStart: spacing.lg + spacing.sm,
  },
  previewSubtitle: {
    fontSize: 14,
    color: colors.textSecondary,
    marginStart: spacing.lg + spacing.sm,
    marginTop: spacing.xs,
  },
  errorCard: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: spacing.md,
    padding: spacing.md,
    backgroundColor: 'rgba(239, 68, 68, 0.1)',
    borderWidth: 1,
    borderColor: 'rgba(239, 68, 68, 0.3)',
    borderRadius: borderRadius.lg,
    marginBottom: spacing.md,
  },
  errorText: {
    flex: 1,
    fontSize: 13,
    color: colors.error,
    lineHeight: 18,
  },
  actions: {
    flexDirection: 'row',
    gap: spacing.md,
    paddingTop: spacing.md,
    borderTopWidth: 1,
    borderTopColor: 'rgba(255, 255, 255, 0.1)',
  },
  button: {
    flex: 1,
    paddingVertical: spacing.md,
    borderRadius: borderRadius.lg,
    alignItems: 'center',
    justifyContent: 'center',
  },
  buttonPressed: {
    opacity: 0.8,
  },
  buttonDisabled: {
    opacity: 0.5,
  },
  cancelButton: {
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
  },
  cancelButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.text,
  },
  confirmButton: {
    backgroundColor: colors.primary,
  },
  dangerButton: {
    backgroundColor: colors.error,
  },
  confirmButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.text,
  },
})

export default MergeConfirmationModal
