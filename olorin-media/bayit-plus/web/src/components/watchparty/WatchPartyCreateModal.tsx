/**
 * WatchPartyCreateModal Component
 * Modal for creating a new Watch Party with options
 */

import { useState } from 'react'
import { View, Text, Pressable, ActivityIndicator } from 'react-native'
import { useTranslation } from 'react-i18next'
import { MessageSquare, RefreshCw, Check, Zap } from 'lucide-react'
import { colors } from '@bayit/shared/theme'
import { isTV } from '@bayit/shared/utils/platform'
import { useTVFocus } from '@bayit/shared/components/hooks/useTVFocus'
import { GlassModal } from '@bayit/shared/ui'
import logger from '@/utils/logger'
import { styles } from './WatchPartyCreateModal.styles'

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
