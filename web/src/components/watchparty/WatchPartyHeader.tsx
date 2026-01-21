import { useState } from 'react'
import { View, Text, Pressable } from 'react-native'
import { useTranslation } from 'react-i18next'
import { Copy, Check, LogOut, X, Share2 } from 'lucide-react'
import { colors } from '@bayit/shared/theme'
import WatchPartySyncIndicator from './WatchPartySyncIndicator'

interface WatchPartyHeaderProps {
  roomCode: string
  isHost: boolean
  isSynced: boolean
  hostPaused: boolean
  onLeave: () => void
  onEnd: () => void
}

export default function WatchPartyHeader({
  roomCode,
  isHost,
  isSynced,
  hostPaused,
  onLeave,
  onEnd,
}: WatchPartyHeaderProps) {
  const { t } = useTranslation()
  const [copied, setCopied] = useState(false)

  const handleCopyCode = async () => {
    await navigator.clipboard.writeText(roomCode)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  const handleShare = async () => {
    const shareData = {
      title: t('watchParty.title'),
      text: `${t('watchParty.joinTitle')}: ${roomCode}`,
      url: `${window.location.origin}/party/${roomCode}`,
    }

    if (navigator.share && navigator.canShare(shareData)) {
      await navigator.share(shareData)
    } else {
      handleCopyCode()
    }
  }

  return (
    <View className="gap-4">
      <View className="flex-row items-center justify-between">
        <Text className="text-lg font-semibold text-white">{t('watchParty.title')}</Text>
        <WatchPartySyncIndicator
          isHost={isHost}
          isSynced={isSynced}
          hostPaused={hostPaused}
        />
      </View>

      <View className="flex-row items-center gap-3">
        <View className="flex-1 flex-row items-center gap-3 bg-white/5 border border-white/10 rounded-lg px-4 py-3">
          <Text className="text-xs text-gray-400">{t('watchParty.roomCode')}:</Text>
          <Text className="text-sm font-semibold font-mono text-white tracking-widest">{roomCode}</Text>
        </View>

        <Pressable
          onPress={handleCopyCode}
          className="w-9 h-9 items-center justify-center rounded-md hover:bg-white/10"
        >
          {copied ? (
            <Check size={16} color="#34D399" />
          ) : (
            <Copy size={16} color={colors.textSecondary} />
          )}
        </Pressable>

        <Pressable
          onPress={handleShare}
          className="w-9 h-9 items-center justify-center rounded-md hover:bg-white/10"
        >
          <Share2 size={16} color={colors.textSecondary} />
        </Pressable>
      </View>

      <View className="flex-row gap-3">
        {isHost ? (
          <Pressable
            onPress={onEnd}
            className="flex-1 flex-row items-center justify-center gap-3 py-3 rounded-md bg-red-500/10 border border-red-500/20 hover:bg-red-500/20"
          >
            <X size={16} color={colors.error} />
            <Text className="text-sm font-medium text-red-400">{t('watchParty.end')}</Text>
          </Pressable>
        ) : (
          <Pressable
            onPress={onLeave}
            className="flex-1 flex-row items-center justify-center gap-3 py-3 rounded-md bg-white/5 border border-white/10 hover:bg-white/10"
          >
            <LogOut size={16} color={colors.textSecondary} />
            <Text className="text-sm font-medium text-gray-300">{t('watchParty.leave')}</Text>
          </Pressable>
        )}
      </View>
    </View>
  )
}
