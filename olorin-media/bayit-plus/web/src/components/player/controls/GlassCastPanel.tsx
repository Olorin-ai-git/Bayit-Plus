/**
 * GlassCastPanel Component
 * Shows cast device information and disconnect option when casting is active
 */

import { View, Text, StyleSheet } from 'react-native'
import { useTranslation } from 'react-i18next'
import { Cast, X } from 'lucide-react'
import { colors, spacing, borderRadius } from '@olorin/design-tokens'
import { GlassView, GlassButton } from '@bayit/shared/ui'
import { CastSession } from '../types/cast'

interface GlassCastPanelProps {
  castSession: CastSession
  visible: boolean
}

export function GlassCastPanel({
  castSession,
  visible,
}: GlassCastPanelProps) {
  const { t } = useTranslation()

  if (!visible || !castSession.isConnected) {
    return null
  }

  const castTypeLabel = castSession.castType === 'airplay' ? 'AirPlay' : 'Chromecast'

  return (
    <View style={styles.container}>
      <GlassView style={styles.panel}>
        {/* Cast Icon */}
        <View style={styles.iconContainer}>
          <Cast size={20} color={colors.primary} />
        </View>

        {/* Device Info */}
        <View style={styles.infoContainer}>
          <Text style={styles.castTypeLabel}>{castTypeLabel}</Text>
          <Text style={styles.deviceName} numberOfLines={1}>
            {castSession.deviceName}
          </Text>
        </View>

        {/* Disconnect Button */}
        <GlassButton
          variant="outline"
          size="sm"
          onPress={castSession.stopCast}
          accessibilityLabel={t('player.cast.disconnect', {
            device: castSession.deviceName,
          })}
        >
          <View style={styles.disconnectButton}>
            <X size={16} color={colors.text} />
            <Text style={styles.disconnectText}>
              {t('common.disconnect', 'Disconnect')}
            </Text>
          </View>
        </GlassButton>
      </GlassView>
    </View>
  )
}

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    top: spacing.xl,
    right: spacing.xl,
    zIndex: 100,
  },
  panel: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    borderRadius: borderRadius.xl,
    minWidth: 280,
    maxWidth: 400,
  },
  iconContainer: {
    width: 32,
    height: 32,
    borderRadius: borderRadius.lg,
    backgroundColor: `${colors.primary}20`,
    alignItems: 'center',
    justifyContent: 'center',
  },
  infoContainer: {
    flex: 1,
    gap: spacing.xs,
  },
  castTypeLabel: {
    fontSize: 11,
    fontWeight: '500',
    color: colors.textSecondary,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  deviceName: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.text,
  },
  disconnectButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
  },
  disconnectText: {
    fontSize: 13,
    fontWeight: '500',
    color: colors.text,
  },
})
