import { useState } from 'react'
import { View, Text, TextInput, StyleSheet, Pressable, ActivityIndicator } from 'react-native'
import { useTranslation } from 'react-i18next'
import { UserPlus } from 'lucide-react'
import { colors, spacing, borderRadius } from '@bayit/shared/theme'
import { GlassModal } from '@bayit/shared/ui'

interface WatchPartyJoinModalProps {
  isOpen: boolean
  onClose: () => void
  onJoin: (code: string) => Promise<void>
}

export default function WatchPartyJoinModal({ isOpen, onClose, onJoin }: WatchPartyJoinModalProps) {
  const { t } = useTranslation()
  const [roomCode, setRoomCode] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const handleSubmit = async () => {
    const code = roomCode.trim().toUpperCase()
    if (!code) {
      setError(t('watchParty.errors.invalidCode'))
      return
    }

    setLoading(true)
    setError('')

    try {
      await onJoin(code)
      onClose()
    } catch (err: any) {
      const errorKey = err.code || 'connectionError'
      setError(t(`watchParty.errors.${errorKey}`, t('watchParty.errors.joinFailed')))
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

  return (
    <GlassModal
      visible={isOpen}
      title={t('watchParty.joinTitle')}
      onClose={handleClose}
      dismissable={true}
    >
      <View style={styles.iconContainer}>
        <View style={styles.icon}>
          <UserPlus size={32} color={colors.primary} />
        </View>
      </View>

      <Text style={styles.description}>
        {t('watchParty.enterCode')}
      </Text>

      <View style={styles.inputContainer}>
        <TextInput
          value={roomCode}
          onChangeText={handleCodeChange}
          placeholder={t('placeholder.roomCode', 'ABCD1234')}
          placeholderTextColor={colors.textMuted}
          style={[styles.input, error && styles.inputError]}
          autoFocus
          autoCapitalize="characters"
          maxLength={8}
        />
        {error ? (
          <Text style={styles.errorText}>{error}</Text>
        ) : null}
      </View>

      <View style={styles.actions}>
        <Pressable
          onPress={handleClose}
          style={({ hovered }) => [
            styles.button,
            styles.ghostButton,
            hovered && styles.ghostButtonHovered,
          ]}
        >
          <Text style={styles.ghostButtonText}>{t('common.cancel')}</Text>
        </Pressable>
        <Pressable
          onPress={handleSubmit}
          disabled={loading || roomCode.length < 4}
          style={({ hovered }) => [
            styles.button,
            styles.primaryButton,
            hovered && !loading && roomCode.length >= 4 && styles.primaryButtonHovered,
            (loading || roomCode.length < 4) && styles.buttonDisabled,
          ]}
        >
          {loading ? (
            <ActivityIndicator size="small" color={colors.background} />
          ) : (
            <Text style={styles.primaryButtonText}>{t('watchParty.join')}</Text>
          )}
        </Pressable>
      </View>
    </GlassModal>
  )
}

const styles = StyleSheet.create({
  iconContainer: {
    alignItems: 'center',
  },
  icon: {
    width: 64,
    height: 64,
    borderRadius: borderRadius.xl,
    backgroundColor: 'rgba(107, 33, 168, 0.3)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  description: {
    fontSize: 14,
    color: colors.textMuted,
    textAlign: 'center',
  },
  inputContainer: {
    gap: spacing.sm,
  },
  input: {
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    borderWidth: 1,
    borderColor: colors.glassBorder,
    borderRadius: borderRadius.lg,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    fontSize: 24,
    fontFamily: 'monospace',
    color: colors.text,
    textAlign: 'center',
    letterSpacing: 6,
    outlineStyle: 'none',
  } as any,
  inputError: {
    borderColor: colors.error,
  },
  errorText: {
    fontSize: 12,
    color: colors.error,
    textAlign: 'center',
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
