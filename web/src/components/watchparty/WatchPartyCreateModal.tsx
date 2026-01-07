import { useState } from 'react'
import { View, Text, StyleSheet, Pressable, ActivityIndicator, Modal } from 'react-native'
import { useTranslation } from 'react-i18next'
import { Users, MessageSquare, RefreshCw, X, Check } from 'lucide-react'
import { colors, spacing, borderRadius } from '@bayit/shared/theme'
import { GlassView } from '@bayit/shared/ui'
import logger from '@/utils/logger'

interface WatchPartyCreateModalProps {
  isOpen: boolean
  onClose: () => void
  onCreate: (options: { chatEnabled: boolean; syncPlayback: boolean }) => Promise<void>
  contentTitle?: string
}

export default function WatchPartyCreateModal({
  isOpen,
  onClose,
  onCreate,
  contentTitle,
}: WatchPartyCreateModalProps) {
  const { t } = useTranslation()
  const [loading, setLoading] = useState(false)
  const [options, setOptions] = useState({
    chatEnabled: true,
    syncPlayback: true,
  })

  const handleCreate = async () => {
    setLoading(true)
    try {
      await onCreate(options)
      onClose()
    } catch (err) {
      logger.error('Failed to create party', 'WatchPartyCreateModal', err)
    } finally {
      setLoading(false)
    }
  }

  const toggleOption = (key: 'chatEnabled' | 'syncPlayback') => {
    setOptions((prev) => ({ ...prev, [key]: !prev[key] }))
  }

  if (!isOpen) return null

  return (
    <Modal
      transparent
      visible={isOpen}
      animationType="fade"
      onRequestClose={onClose}
    >
      <Pressable style={styles.overlay} onPress={onClose}>
        <Pressable onPress={(e) => e.stopPropagation()}>
          <GlassView style={styles.modal} intensity="high">
            <View style={styles.header}>
              <Text style={styles.title}>{t('watchParty.createTitle')}</Text>
              <Pressable
                onPress={onClose}
                style={({ hovered }) => [
                  styles.closeButton,
                  hovered && styles.closeButtonHovered,
                ]}
              >
                <X size={20} color={colors.textSecondary} />
              </Pressable>
            </View>

            <View style={styles.content}>
              {contentTitle && (
                <View style={styles.contentInfo}>
                  <Users size={20} color={colors.primary} />
                  <View style={styles.contentInfoText}>
                    <Text style={styles.contentLabel}>{t('watchParty.title')}</Text>
                    <Text style={styles.contentTitle} numberOfLines={1}>{contentTitle}</Text>
                  </View>
                </View>
              )}

              <View style={styles.options}>
                <Pressable
                  onPress={() => toggleOption('chatEnabled')}
                  style={({ hovered }) => [
                    styles.optionRow,
                    hovered && styles.optionRowHovered,
                  ]}
                >
                  <MessageSquare size={20} color="#3B82F6" />
                  <Text style={styles.optionLabel}>
                    {t('watchParty.options.chatEnabled')}
                  </Text>
                  <View style={[styles.checkbox, options.chatEnabled && styles.checkboxActive]}>
                    {options.chatEnabled && <Check size={14} color={colors.background} />}
                  </View>
                </Pressable>

                <Pressable
                  onPress={() => toggleOption('syncPlayback')}
                  style={({ hovered }) => [
                    styles.optionRow,
                    hovered && styles.optionRowHovered,
                  ]}
                >
                  <RefreshCw size={20} color="#34D399" />
                  <Text style={styles.optionLabel}>
                    {t('watchParty.options.syncPlayback')}
                  </Text>
                  <View style={[styles.checkbox, options.syncPlayback && styles.checkboxActive]}>
                    {options.syncPlayback && <Check size={14} color={colors.background} />}
                  </View>
                </Pressable>
              </View>

              <View style={styles.actions}>
                <Pressable
                  onPress={onClose}
                  style={({ hovered }) => [
                    styles.button,
                    styles.ghostButton,
                    hovered && styles.ghostButtonHovered,
                  ]}
                >
                  <Text style={styles.ghostButtonText}>{t('common.cancel')}</Text>
                </Pressable>
                <Pressable
                  onPress={handleCreate}
                  disabled={loading}
                  style={({ hovered }) => [
                    styles.button,
                    styles.primaryButton,
                    hovered && !loading && styles.primaryButtonHovered,
                    loading && styles.buttonDisabled,
                  ]}
                >
                  {loading ? (
                    <ActivityIndicator size="small" color={colors.background} />
                  ) : (
                    <Text style={styles.primaryButtonText}>{t('watchParty.create')}</Text>
                  )}
                </Pressable>
              </View>
            </View>
          </GlassView>
        </Pressable>
      </Pressable>
    </Modal>
  )
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
    alignItems: 'center',
    justifyContent: 'center',
    padding: spacing.lg,
  },
  modal: {
    width: 360,
    maxWidth: '100%',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255, 255, 255, 0.1)',
  },
  title: {
    fontSize: 18,
    fontWeight: '600',
    color: colors.text,
  },
  closeButton: {
    width: 32,
    height: 32,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: borderRadius.md,
  },
  closeButtonHovered: {
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
  },
  content: {
    padding: spacing.lg,
    gap: spacing.lg,
  },
  contentInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    padding: spacing.md,
    borderRadius: borderRadius.lg,
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
  },
  contentInfoText: {
    flex: 1,
    minWidth: 0,
  },
  contentLabel: {
    fontSize: 12,
    color: colors.textMuted,
  },
  contentTitle: {
    fontSize: 14,
    fontWeight: '500',
    color: colors.text,
  },
  options: {
    gap: spacing.sm,
  },
  optionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    padding: spacing.md,
    borderRadius: borderRadius.lg,
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
  },
  optionRowHovered: {
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
  },
  optionLabel: {
    flex: 1,
    fontSize: 14,
    fontWeight: '500',
    color: colors.text,
    textAlign: 'right',
  },
  checkbox: {
    width: 22,
    height: 22,
    borderRadius: borderRadius.sm,
    borderWidth: 2,
    borderColor: colors.glassBorder,
    alignItems: 'center',
    justifyContent: 'center',
  },
  checkboxActive: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  actions: {
    flexDirection: 'row',
    gap: spacing.md,
  },
  button: {
    flex: 1,
    paddingVertical: spacing.sm + 2,
    borderRadius: borderRadius.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  ghostButton: {
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
  },
  ghostButtonHovered: {
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
  },
  ghostButtonText: {
    fontSize: 14,
    fontWeight: '500',
    color: colors.textSecondary,
  },
  primaryButton: {
    backgroundColor: colors.primary,
  },
  primaryButtonHovered: {
    shadowColor: colors.primary,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.5,
    shadowRadius: 12,
  },
  primaryButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.background,
  },
  buttonDisabled: {
    opacity: 0.5,
  },
})
