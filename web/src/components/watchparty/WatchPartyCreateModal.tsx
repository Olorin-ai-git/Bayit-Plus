/**
 * WatchPartyCreateModal Component
 * Modal for creating a new Watch Party with options
 */

import { useState } from 'react'
import { View, Text, Pressable, ActivityIndicator, StyleSheet, I18nManager } from 'react-native'
import { useTranslation } from 'react-i18next'
import { Users, MessageSquare, RefreshCw, Check, Zap } from 'lucide-react'
import { colors, spacing, borderRadius } from '@bayit/shared/theme'
import { isTV } from '@bayit/shared/utils/platform'
import { useTVFocus } from '@bayit/shared/components/hooks/useTVFocus'
import { GlassModal } from '@bayit/shared/ui'
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

  const chatFocus = useTVFocus({ styleType: 'button' })
  const syncFocus = useTVFocus({ styleType: 'button' })
  const cancelFocus = useTVFocus({ styleType: 'button' })
  const createFocus = useTVFocus({ styleType: 'button' })

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
    <GlassModal
      visible={isOpen}
      title={t('watchParty.createTitle', 'Create Watch Party')}
      onClose={onClose}
      dismissable={!loading}
    >
      <View style={styles.container}>
        {/* Content Info Card */}
        {contentTitle && (
          <View style={styles.contentCard}>
            <Zap size={isTV ? 24 : 20} color={colors.primary} />
            <View style={styles.contentInfo}>
              <Text style={styles.contentLabel}>{t('watchParty.watching', 'Watching')}</Text>
              <Text style={styles.contentTitle} numberOfLines={1}>
                {contentTitle}
              </Text>
            </View>
          </View>
        )}

        {/* Options */}
        <View style={styles.optionsContainer}>
          {/* Chat Option */}
          <Pressable
            onPress={() => toggleOption('chatEnabled')}
            onFocus={chatFocus.handleFocus}
            onBlur={chatFocus.handleBlur}
            focusable={true}
            style={({ hovered, pressed }) => [
              styles.optionCard,
              (hovered || pressed) && styles.optionCardHovered,
              chatFocus.isFocused && chatFocus.focusStyle,
            ]}
            accessibilityRole="checkbox"
            accessibilityState={{ checked: options.chatEnabled }}
            accessibilityLabel={t('watchParty.options.chatEnabled', 'Enable chat')}
          >
            <MessageSquare size={isTV ? 24 : 20} color="#3B82F6" />
            <Text style={styles.optionText}>
              {t('watchParty.options.chatEnabled', 'Enable chat')}
            </Text>
            <View
              style={[
                styles.checkbox,
                options.chatEnabled ? styles.checkboxChecked : styles.checkboxUnchecked,
              ]}
            >
              {options.chatEnabled && <Check size={isTV ? 18 : 14} color="#111122" />}
            </View>
          </Pressable>

          {/* Sync Playback Option */}
          <Pressable
            onPress={() => toggleOption('syncPlayback')}
            onFocus={syncFocus.handleFocus}
            onBlur={syncFocus.handleBlur}
            focusable={true}
            style={({ hovered, pressed }) => [
              styles.optionCard,
              (hovered || pressed) && styles.optionCardHovered,
              syncFocus.isFocused && syncFocus.focusStyle,
            ]}
            accessibilityRole="checkbox"
            accessibilityState={{ checked: options.syncPlayback }}
            accessibilityLabel={t('watchParty.options.syncPlayback', 'Sync playback')}
          >
            <RefreshCw size={isTV ? 24 : 20} color="#34D399" />
            <Text style={styles.optionText}>
              {t('watchParty.options.syncPlayback', 'Sync playback')}
            </Text>
            <View
              style={[
                styles.checkbox,
                options.syncPlayback ? styles.checkboxChecked : styles.checkboxUnchecked,
              ]}
            >
              {options.syncPlayback && <Check size={isTV ? 18 : 14} color="#111122" />}
            </View>
          </Pressable>
        </View>

        {/* Action Buttons */}
        <View style={styles.buttonRow}>
          <Pressable
            onPress={onClose}
            onFocus={cancelFocus.handleFocus}
            onBlur={cancelFocus.handleBlur}
            focusable={true}
            disabled={loading}
            style={({ hovered, pressed }) => [
              styles.cancelButton,
              (hovered || pressed) && styles.cancelButtonHovered,
              cancelFocus.isFocused && cancelFocus.focusStyle,
              loading && styles.buttonDisabled,
            ]}
            accessibilityRole="button"
            accessibilityLabel={t('common.cancel', 'Cancel')}
          >
            <Text style={styles.cancelButtonText}>{t('common.cancel', 'Cancel')}</Text>
          </Pressable>

          <Pressable
            onPress={handleCreate}
            onFocus={createFocus.handleFocus}
            onBlur={createFocus.handleBlur}
            focusable={true}
            disabled={loading}
            style={({ hovered, pressed }) => [
              styles.createButton,
              (hovered || pressed) && !loading && styles.createButtonHovered,
              createFocus.isFocused && !loading && createFocus.focusStyle,
              loading && styles.buttonDisabled,
            ]}
            accessibilityRole="button"
            accessibilityLabel={t('watchParty.create', 'Create')}
            accessibilityState={{ busy: loading }}
          >
            {loading ? (
              <ActivityIndicator size={isTV ? 'large' : 'small'} color="#111122" />
            ) : (
              <Text style={styles.createButtonText}>{t('watchParty.create', 'Create')}</Text>
            )}
          </Pressable>
        </View>
      </View>
    </GlassModal>
  )
}

const styles = StyleSheet.create({
  container: {
    gap: spacing.lg,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.lg,
  },
  contentCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    padding: spacing.md,
    backgroundColor: 'rgba(168, 85, 247, 0.1)',
    borderRadius: borderRadius.lg,
    borderWidth: 1,
    borderColor: 'rgba(168, 85, 247, 0.3)',
  },
  contentInfo: {
    flex: 1,
    minWidth: 0,
  },
  contentLabel: {
    fontSize: isTV ? 14 : 12,
    color: colors.textSecondary,
    marginBottom: 2,
  },
  contentTitle: {
    fontSize: isTV ? 16 : 14,
    fontWeight: '600',
    color: colors.text,
  },
  optionsContainer: {
    gap: spacing.md,
  },
  optionCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    padding: spacing.md,
    backgroundColor: colors.glass,
    borderRadius: borderRadius.lg,
    borderWidth: 1,
    borderColor: colors.glassBorder,
  },
  optionCardHovered: {
    backgroundColor: colors.glassLight,
    borderColor: 'rgba(168, 85, 247, 0.4)',
  },
  optionText: {
    flex: 1,
    fontSize: isTV ? 16 : 14,
    fontWeight: '500',
    color: colors.text,
  },
  checkbox: {
    width: isTV ? 26 : 22,
    height: isTV ? 26 : 22,
    borderRadius: isTV ? 6 : 4,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
  },
  checkboxChecked: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  checkboxUnchecked: {
    backgroundColor: 'transparent',
    borderColor: 'rgba(255, 255, 255, 0.2)',
  },
  buttonRow: {
    flexDirection: 'row',
    gap: spacing.md,
  },
  cancelButton: {
    flex: 1,
    paddingVertical: isTV ? spacing.md : spacing.sm,
    backgroundColor: colors.glass,
    borderRadius: borderRadius.md,
    borderWidth: 1,
    borderColor: colors.glassBorder,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cancelButtonHovered: {
    backgroundColor: colors.glassLight,
    borderColor: 'rgba(255, 255, 255, 0.3)',
  },
  cancelButtonText: {
    fontSize: isTV ? 16 : 14,
    fontWeight: '600',
    color: colors.textSecondary,
  },
  createButton: {
    flex: 1,
    paddingVertical: isTV ? spacing.md : spacing.sm,
    backgroundColor: colors.primary,
    borderRadius: borderRadius.md,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: colors.primary,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.5,
    shadowRadius: 12,
    elevation: 8,
  },
  createButtonHovered: {
    backgroundColor: '#B968F7',
    shadowOpacity: 0.7,
    shadowRadius: 16,
  },
  createButtonText: {
    fontSize: isTV ? 16 : 14,
    fontWeight: '700',
    color: '#111122',
  },
  buttonDisabled: {
    opacity: 0.5,
  },
})
