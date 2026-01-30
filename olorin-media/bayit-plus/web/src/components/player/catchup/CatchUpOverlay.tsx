/**
 * CatchUpOverlay Component
 * Auto-prompt overlay for Beta 500 users joining a live program in progress.
 * Glass UI card with fade-in animation, countdown timer, and credit context.
 */

import React, { useState, useEffect, useRef, useCallback } from 'react'
import { View, Text, Pressable, StyleSheet, Animated } from 'react-native'
import { useTranslation } from 'react-i18next'
import { colors, spacing, borderRadius, fontSize, glass } from '@olorin/design-tokens'
import { Clock, X, AlertTriangle } from 'lucide-react'

interface CatchUpOverlayProps {
  channelId: string
  programName?: string
  creditCost: number
  creditBalance: number
  onAccept: () => void
  onDecline: () => void
  autoDismissSeconds: number
}

const LOW_BALANCE_THRESHOLD = 10

export default function CatchUpOverlay({
  programName,
  creditCost,
  creditBalance,
  onAccept,
  onDecline,
  autoDismissSeconds,
}: CatchUpOverlayProps) {
  const { t } = useTranslation()
  const [secondsLeft, setSecondsLeft] = useState(autoDismissSeconds)
  const [isPaused, setIsPaused] = useState(false)
  const fadeAnim = useRef(new Animated.Value(0)).current
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null)
  const isLowBalance = creditBalance < LOW_BALANCE_THRESHOLD
  const progressWidth = autoDismissSeconds > 0 ? (secondsLeft / autoDismissSeconds) * 100 : 0

  useEffect(() => {
    Animated.timing(fadeAnim, {
      toValue: 1, duration: 300, useNativeDriver: true,
    }).start()
  }, [fadeAnim])

  const startTimer = useCallback(() => {
    timerRef.current = setInterval(() => {
      setSecondsLeft((prev) => {
        if (prev <= 1) {
          clearInterval(timerRef.current!)
          timerRef.current = null
          onDecline()
          return 0
        }
        return prev - 1
      })
    }, 1000)
  }, [onDecline])

  useEffect(() => {
    if (!isPaused) startTimer()
    return () => { if (timerRef.current) clearInterval(timerRef.current) }
  }, [isPaused, startTimer])

  const handleHoverIn = useCallback(() => {
    setIsPaused(true)
    if (timerRef.current) { clearInterval(timerRef.current); timerRef.current = null }
  }, [])

  const handleHoverOut = useCallback(() => { setIsPaused(false) }, [])

  return (
    <Animated.View style={[styles.container, { opacity: fadeAnim }]}>
      <Pressable
        onHoverIn={handleHoverIn}
        onHoverOut={handleHoverOut}
        accessible
        accessibilityRole="none"
      >
        <View
          style={styles.card}
          accessibilityRole="alert"
          accessibilityLabel={t('catchup.overlay.title')}
        >
          <View style={styles.header}>
            <Clock size={18} color={colors.primary.DEFAULT} />
            <Text style={styles.title}>{t('catchup.overlay.title')}</Text>
            <Pressable onPress={onDecline} accessibilityLabel={t('common.close')} style={styles.closeButton}>
              <X size={16} color={colors.textSecondary} />
            </Pressable>
          </View>

          <Text style={styles.description}>
            {t('catchup.overlay.description', { programName: programName || t('catchup.overlay.thisProgram') })}
          </Text>

          {isLowBalance && (
            <View style={styles.warningRow}>
              <AlertTriangle size={14} color={colors.warning.DEFAULT} />
              <Text style={styles.warningText}>
                {t('catchup.overlay.lowBalance', { balance: creditBalance })}
              </Text>
            </View>
          )}

          <Text style={styles.balanceText}>
            {t('catchup.overlay.balanceContext', { balance: creditBalance })}
          </Text>

          <View style={styles.actions}>
            <Pressable onPress={onAccept} style={styles.acceptButton} accessibilityRole="button">
              <Text style={styles.acceptText}>
                {t('catchup.overlay.accept', { cost: creditCost })}
              </Text>
            </Pressable>
            <Pressable onPress={onDecline} style={styles.declineButton} accessibilityRole="button">
              <Text style={styles.declineText}>{t('catchup.overlay.decline')}</Text>
            </Pressable>
          </View>

          <View style={styles.progressTrack}>
            <View style={[styles.progressFill, { width: `${progressWidth}%` }]} />
          </View>
        </View>
      </Pressable>
    </Animated.View>
  )
}

const styles = StyleSheet.create({
  container: { position: 'absolute', bottom: spacing.lg, right: spacing.lg, zIndex: 100, maxWidth: 360 },
  card: {
    backgroundColor: glass.bgStrong, borderRadius: borderRadius.lg, padding: spacing.md,
    borderWidth: 1, borderColor: glass.border,
    // @ts-expect-error backdropFilter is web-only
    backdropFilter: 'blur(20px)', WebkitBackdropFilter: 'blur(20px)',
  },
  header: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, marginBottom: spacing.sm },
  title: { flex: 1, color: colors.text, fontSize: fontSize.base, fontWeight: '600' },
  closeButton: { padding: spacing.xs },
  description: { color: colors.textSecondary, fontSize: fontSize.sm, marginBottom: spacing.sm, lineHeight: 20 },
  warningRow: {
    flexDirection: 'row', alignItems: 'center', gap: spacing.xs, marginBottom: spacing.sm,
    backgroundColor: 'rgba(245, 158, 11, 0.12)', borderRadius: borderRadius.sm, padding: spacing.xs,
  },
  warningText: { color: colors.warning.DEFAULT, fontSize: fontSize.xs, fontWeight: '500' },
  balanceText: { color: colors.textMuted, fontSize: fontSize.xs, marginBottom: spacing.md },
  actions: { flexDirection: 'row', gap: spacing.sm, marginBottom: spacing.sm },
  acceptButton: {
    flex: 1, backgroundColor: colors.primary.DEFAULT, borderRadius: borderRadius.md,
    paddingVertical: spacing.sm, alignItems: 'center',
  },
  acceptText: { color: colors.text, fontSize: fontSize.sm, fontWeight: '600' },
  declineButton: {
    flex: 1, backgroundColor: glass.bgLight, borderRadius: borderRadius.md,
    paddingVertical: spacing.sm, alignItems: 'center', borderWidth: 1, borderColor: glass.borderLight,
  },
  declineText: { color: colors.textSecondary, fontSize: fontSize.sm, fontWeight: '500' },
  progressTrack: {
    height: 3, backgroundColor: 'rgba(255,255,255,0.1)', borderRadius: borderRadius.full, overflow: 'hidden',
  },
  progressFill: { height: '100%', backgroundColor: colors.primary[400], borderRadius: borderRadius.full },
})
