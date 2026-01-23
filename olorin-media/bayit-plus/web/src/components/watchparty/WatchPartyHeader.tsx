/**
 * WatchPartyHeader Component
 * Header section for Watch Party panel with room code and controls
 */

import { useState } from 'react'
import { View, Text, Pressable } from 'react-native'
import { useTranslation } from 'react-i18next'
import { Copy, Check, LogOut, X, Share2 } from 'lucide-react'
import { colors } from '@bayit/shared/theme'
import { isTV } from '@bayit/shared/utils/platform'
import WatchPartySyncIndicator from './WatchPartySyncIndicator'
import { styles } from './WatchPartyHeader.styles'

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
    <View style={styles.container}>
      <View style={styles.headerRow}>
        <Text style={styles.title}>{t('watchParty.title')}</Text>
        <WatchPartySyncIndicator
          isHost={isHost}
          isSynced={isSynced}
          hostPaused={hostPaused}
        />
      </View>

      <View style={styles.codeRow}>
        <View style={styles.codeCard}>
          <Text style={styles.codeLabel}>{t('watchParty.roomCode')}:</Text>
          <Text style={styles.codeText}>{roomCode}</Text>
        </View>

        <Pressable
          onPress={handleCopyCode}
          style={({ hovered }) => [
            styles.iconButton,
            hovered && styles.iconButtonHovered,
          ]}
        >
          {copied ? (
            <Check size={isTV ? 18 : 16} color="#34D399" />
          ) : (
            <Copy size={isTV ? 18 : 16} color={colors.textSecondary} />
          )}
        </Pressable>

        <Pressable
          onPress={handleShare}
          style={({ hovered }) => [
            styles.iconButton,
            hovered && styles.iconButtonHovered,
          ]}
        >
          <Share2 size={isTV ? 18 : 16} color={colors.textSecondary} />
        </Pressable>
      </View>

      <View style={styles.buttonsRow}>
        {isHost ? (
          <Pressable
            onPress={onEnd}
            style={({ hovered }) => [
              styles.actionButton,
              styles.endButton,
              hovered && styles.endButtonHovered,
            ]}
          >
            <X size={isTV ? 18 : 16} color={colors.error} />
            <Text style={styles.endButtonText}>{t('watchParty.end')}</Text>
          </Pressable>
        ) : (
          <Pressable
            onPress={onLeave}
            style={({ hovered }) => [
              styles.actionButton,
              styles.leaveButton,
              hovered && styles.leaveButtonHovered,
            ]}
          >
            <LogOut size={isTV ? 18 : 16} color={colors.textSecondary} />
            <Text style={styles.leaveButtonText}>{t('watchParty.leave')}</Text>
          </Pressable>
        )}
      </View>
    </View>
  )
}
