/**
 * WatchPartyJoinModal Component
 * Modal for joining an existing Watch Party using a room code
 */

import { useState } from 'react'
import { View, Text, Pressable, ActivityIndicator } from 'react-native'
import { useTranslation } from 'react-i18next'
import { UserPlus } from 'lucide-react'
import { colors } from '@olorin/design-tokens'
import { isTV } from '@bayit/shared/utils/platform'
import { useTVFocus } from '@bayit/shared/components/hooks/useTVFocus'
import { GlassModal, GlassInput } from '@bayit/shared/ui'
import { styles } from './WatchPartyJoinModal.styles'

interface WatchPartyJoinModalProps {
  isOpen: boolean
  onClose: () => void
  onJoin: (code: string) => Promise<void>
}

export default function WatchPartyJoinModal({
  isOpen,
  onClose,
  onJoin,
}: WatchPartyJoinModalProps) {
  const { t } = useTranslation()
  const [roomCode, setRoomCode] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const cancelFocus = useTVFocus({ styleType: 'button' })
  const joinFocus = useTVFocus({ styleType: 'button' })

  const handleSubmit = async () => {
    const code = roomCode.trim().toUpperCase()
    if (!code || code.length < 4) {
      setError(t('watchParty.errors.invalidCode', 'Invalid room code'))
      return
    }

    setLoading(true)
    setError('')

    try {
      await onJoin(code)
      onClose()
    } catch (err: any) {
      const errorKey = err.code || 'connectionError'
      setError(
        t(`watchParty.errors.${errorKey}`, t('watchParty.errors.joinFailed', 'Failed to join'))
      )
    } finally {
      setLoading(false)
    }
  }

  const handleCodeChange = (value: string) => {
    const cleaned = value.toUpperCase().replace(/[^A-Z0-9]/g, '')
    setRoomCode(cleaned.slice(0, 8))
    if (error) setError('')
  }

  const handleClose = () => {
    setRoomCode('')
    setError('')
    onClose()
  }

  if (!isOpen) return null

  const canJoin = roomCode.length >= 4 && !loading

  return (
    <GlassModal
      visible={isOpen}
      title={t('watchParty.joinTitle', 'Join Watch Party')}
      onClose={handleClose}
      dismissable={!loading}
    >
      <View style={styles.container}>
        {/* Icon Container */}
        <View style={styles.iconContainer}>
          <View style={styles.iconBackground}>
            <UserPlus size={isTV ? 40 : 32} color={colors.primary} />
          </View>
        </View>

        {/* Instructions */}
        <Text style={styles.instructions}>
          {t('watchParty.enterCode', 'Enter the room code to join the watch party')}
        </Text>

        {/* Room Code Input */}
        <View style={styles.inputContainer}>
          <GlassInput
            value={roomCode}
            onChangeText={handleCodeChange}
            placeholder={t('watchParty.placeholder.roomCode', 'ABCD1234')}
            inputStyle={[styles.input, error && styles.inputError]}
            autoFocus
            autoCapitalize="characters"
            maxLength={8}
            error={error}
            accessibilityLabel={t('watchParty.roomCodeLabel', 'Room code')}
            accessibilityHint={t('watchParty.roomCodeHint', 'Enter 4-8 character code')}
          />

          {/* Character Count */}
          <Text style={styles.characterCount}>
            {roomCode.length}/8
          </Text>
        </View>

        {/* Action Buttons */}
        <View style={styles.buttonRow}>
          <Pressable
            onPress={handleClose}
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
            onPress={handleSubmit}
            onFocus={joinFocus.handleFocus}
            onBlur={joinFocus.handleBlur}
            focusable={true}
            disabled={!canJoin}
            style={({ hovered, pressed }) => [
              styles.joinButton,
              (hovered || pressed) && canJoin && styles.joinButtonHovered,
              joinFocus.isFocused && canJoin && joinFocus.focusStyle,
              !canJoin && styles.buttonDisabled,
            ]}
            accessibilityRole="button"
            accessibilityLabel={t('watchParty.join', 'Join')}
            accessibilityState={{ disabled: !canJoin, busy: loading }}
          >
            {loading ? (
              <ActivityIndicator size={isTV ? 'large' : 'small'} color="#111122" />
            ) : (
              <Text style={styles.joinButtonText}>{t('watchParty.join', 'Join')}</Text>
            )}
          </Pressable>
        </View>
      </View>
    </GlassModal>
  )
}
