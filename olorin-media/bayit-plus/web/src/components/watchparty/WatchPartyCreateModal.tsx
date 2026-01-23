import { useState } from 'react'
import { View, Text, Pressable, ActivityIndicator, StyleSheet } from 'react-native'
import { useTranslation } from 'react-i18next'
import { Users, MessageSquare, RefreshCw, Check } from 'lucide-react'
import { colors } from '@bayit/shared/theme'
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
      title={t('watchParty.createTitle')}
      onClose={onClose}
      dismissable={true}
    >
      {contentTitle && (
        <View className="flex-row items-center gap-4 p-4 rounded-lg bg-white/5 border border-white/10">
          <Users size={20} color={colors.primary} />
          <View className="flex-1 min-w-0">
            <Text className="text-xs text-gray-400">{t('watchParty.title')}</Text>
            <Text className="text-sm font-medium text-white" numberOfLines={1}>{contentTitle}</Text>
          </View>
        </View>
      )}

      <View className="gap-3">
        <Pressable
          onPress={() => toggleOption('chatEnabled')}
          className="flex-row items-center gap-4 p-4 rounded-lg bg-white/5 border border-white/10 hover:bg-white/10"
        >
          <MessageSquare size={20} color="#3B82F6" />
          <Text className="flex-1 text-sm font-medium text-white text-right">
            {t('watchParty.options.chatEnabled')}
          </Text>
          <View className="w-[22px] h-[22px] rounded items-center justify-center border-2"
            style={[options.chatEnabled ? styles.checkboxChecked : styles.checkboxUnchecked]}>
            {options.chatEnabled && <Check size={14} color={colors.background} />}
          </View>
        </Pressable>

        <Pressable
          onPress={() => toggleOption('syncPlayback')}
          className="flex-row items-center gap-4 p-4 rounded-lg bg-white/5 border border-white/10 hover:bg-white/10"
        >
          <RefreshCw size={20} color="#34D399" />
          <Text className="flex-1 text-sm font-medium text-white text-right">
            {t('watchParty.options.syncPlayback')}
          </Text>
          <View className="w-[22px] h-[22px] rounded items-center justify-center border-2"
            style={[options.syncPlayback ? styles.checkboxChecked : styles.checkboxUnchecked]}>
            {options.syncPlayback && <Check size={14} color={colors.background} />}
          </View>
        </Pressable>
      </View>

      <View className="flex-row gap-4">
        <Pressable
          onPress={onClose}
          className="flex-1 py-3 rounded-md bg-white/5 border border-white/10 items-center justify-center hover:bg-white/10"
        >
          <Text className="text-sm font-medium text-gray-300">{t('common.cancel')}</Text>
        </Pressable>
        <Pressable
          onPress={handleCreate}
          disabled={loading}
          className="flex-1 py-3 rounded-md bg-purple-600 items-center justify-center hover:shadow-[0_0_12px_rgba(168,85,247,0.5)]"
          style={[loading && styles.buttonLoading]}
        >
          {loading ? (
            <ActivityIndicator size="small" color={colors.background} />
          ) : (
            <Text className="text-sm font-semibold text-black">{t('watchParty.create')}</Text>
          )}
        </Pressable>
      </View>
    </GlassModal>
  )
}

const styles = StyleSheet.create({
  checkboxChecked: {
    backgroundColor: '#9333ea',
    borderColor: '#9333ea',
  },
  checkboxUnchecked: {
    borderColor: 'rgba(255, 255, 255, 0.2)',
  },
  buttonLoading: {
    opacity: 0.5,
  },
});
