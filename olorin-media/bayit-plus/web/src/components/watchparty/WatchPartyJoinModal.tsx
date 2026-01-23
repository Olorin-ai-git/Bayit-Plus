import { useState } from 'react'
import { View, Text, Pressable, ActivityIndicator, StyleSheet } from 'react-native'
import { useTranslation } from 'react-i18next'
import { UserPlus } from 'lucide-react'
import { colors } from '@bayit/shared/theme'
import { GlassModal, GlassInput } from '@bayit/shared/ui'

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
      <View className="items-center">
        <View className="w-16 h-16 rounded-2xl bg-purple-700/30 items-center justify-center">
          <UserPlus size={32} color={colors.primary} />
        </View>
      </View>

      <Text className="text-sm text-gray-400 text-center">
        {t('watchParty.enterCode')}
      </Text>

      <View className="gap-3">
        <GlassInput
          value={roomCode}
          onChangeText={handleCodeChange}
          placeholder={t('placeholder.roomCode', 'ABCD1234')}
          inputClassName="bg-white/5 border rounded-lg px-6 py-4 text-2xl font-mono text-white text-center tracking-[0.375rem] outline-none"
          inputStyle={[error ? styles.inputError : styles.inputNormal]}
          autoFocus
          autoCapitalize="characters"
          maxLength={8}
          error={error}
        />
      </View>

      <View className="flex-row gap-4">
        <Pressable
          onPress={handleClose}
          className="flex-1 py-3 rounded-md bg-white/5 border border-white/10 items-center justify-center hover:bg-white/10"
        >
          <Text className="text-sm font-medium text-gray-300">{t('common.cancel')}</Text>
        </Pressable>
        <Pressable
          onPress={handleSubmit}
          disabled={loading || roomCode.length < 4}
          className="flex-1 py-3 rounded-md bg-purple-600 items-center justify-center"
          style={[(loading || roomCode.length < 4) && styles.disabled]}
        >
          {loading ? (
            <ActivityIndicator size="small" color={colors.background} />
          ) : (
            <Text className="text-sm font-semibold text-black">{t('watchParty.join')}</Text>
          )}
        </Pressable>
      </View>
    </GlassModal>
  )
}

const styles = StyleSheet.create({
  inputError: {
    borderColor: '#ef4444',
  },
  inputNormal: {
    borderColor: 'rgba(255, 255, 255, 0.1)',
  },
  disabled: {
    opacity: 0.5,
  },
})
