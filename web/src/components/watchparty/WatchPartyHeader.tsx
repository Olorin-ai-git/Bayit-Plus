import { useState } from 'react'
import { View, Text, StyleSheet, Pressable } from 'react-native'
import { useTranslation } from 'react-i18next'
import { Copy, Check, LogOut, X, Share2 } from 'lucide-react'
import { colors, spacing, borderRadius } from '@bayit/shared/theme'
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
        <View style={styles.codeBox}>
          <Text style={styles.codeLabel}>{t('watchParty.roomCode')}:</Text>
          <Text style={styles.code}>{roomCode}</Text>
        </View>

        <Pressable
          onPress={handleCopyCode}
          style={({ hovered }) => [
            styles.iconButton,
            hovered && styles.iconButtonHovered,
          ]}
        >
          {copied ? (
            <Check size={16} color="#34D399" />
          ) : (
            <Copy size={16} color={colors.textSecondary} />
          )}
        </Pressable>

        <Pressable
          onPress={handleShare}
          style={({ hovered }) => [
            styles.iconButton,
            hovered && styles.iconButtonHovered,
          ]}
        >
          <Share2 size={16} color={colors.textSecondary} />
        </Pressable>
      </View>

      <View style={styles.actionsRow}>
        {isHost ? (
          <Pressable
            onPress={onEnd}
            style={({ hovered }) => [
              styles.actionButton,
              styles.dangerButton,
              hovered && styles.dangerButtonHovered,
            ]}
          >
            <X size={16} color={colors.error} />
            <Text style={styles.dangerText}>{t('watchParty.end')}</Text>
          </Pressable>
        ) : (
          <Pressable
            onPress={onLeave}
            style={({ hovered }) => [
              styles.actionButton,
              styles.secondaryButton,
              hovered && styles.secondaryButtonHovered,
            ]}
          >
            <LogOut size={16} color={colors.textSecondary} />
            <Text style={styles.secondaryText}>{t('watchParty.leave')}</Text>
          </Pressable>
        )}
      </View>
    </View>
  )
}

const styles = StyleSheet.create({
  container: {
    gap: spacing.md,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  title: {
    fontSize: 18,
    fontWeight: '600',
    color: colors.text,
  },
  codeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  codeBox: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
    borderRadius: borderRadius.lg,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
  },
  codeLabel: {
    fontSize: 12,
    color: colors.textMuted,
  },
  code: {
    fontSize: 14,
    fontWeight: '600',
    fontFamily: 'monospace',
    color: colors.text,
    letterSpacing: 2,
  },
  iconButton: {
    width: 36,
    height: 36,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: borderRadius.md,
  },
  iconButtonHovered: {
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
  },
  actionsRow: {
    flexDirection: 'row',
    gap: spacing.sm,
  },
  actionButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
    paddingVertical: spacing.sm,
    borderRadius: borderRadius.md,
  },
  dangerButton: {
    backgroundColor: 'rgba(239, 68, 68, 0.1)',
    borderWidth: 1,
    borderColor: 'rgba(239, 68, 68, 0.2)',
  },
  dangerButtonHovered: {
    backgroundColor: 'rgba(239, 68, 68, 0.2)',
  },
  dangerText: {
    fontSize: 14,
    fontWeight: '500',
    color: colors.error,
  },
  secondaryButton: {
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
  },
  secondaryButtonHovered: {
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
  },
  secondaryText: {
    fontSize: 14,
    fontWeight: '500',
    color: colors.textSecondary,
  },
})
