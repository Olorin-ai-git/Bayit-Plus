import { View, Text, Pressable, StyleSheet } from 'react-native'
import { useTranslation } from 'react-i18next'
import { colors, borderRadius, spacing } from '@olorin/design-tokens'
import { Icon } from '@olorin/shared-icons/web'

const EXTEND_MINUTES = 5;

interface SleepTimerBannerProps {
  remainingSeconds: number
  onExtend: (minutes?: number) => void
  onCancel: () => void
}

function formatCountdown(totalSeconds: number): string {
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
}

export default function SleepTimerBanner({
  remainingSeconds,
  onExtend,
  onCancel,
}: SleepTimerBannerProps) {
  const { t } = useTranslation()

  if (remainingSeconds <= 0) return null

  const timeStr = formatCountdown(remainingSeconds)

  return (
    <View style={styles.banner}>
      <View style={styles.left}>
        <Icon name="moon" size="xs" color={colors.primary.light} />
        <Text style={styles.timeText}>
          {t('player.sleepTimer.remaining', { time: timeStr })}
        </Text>
      </View>
      <View style={styles.actions}>
        <Pressable
          onPress={() => onExtend(EXTEND_MINUTES)}
          style={styles.extendBtn}
          accessibilityLabel={t('player.sleepTimer.extend', { minutes: EXTEND_MINUTES })}
          accessibilityRole="button"
        >
          <Text style={styles.extendText}>
            {t('player.sleepTimer.extend', { minutes: EXTEND_MINUTES })}
          </Text>
        </Pressable>
        <Pressable
          onPress={onCancel}
          style={styles.cancelBtn}
          accessibilityLabel={t('player.sleepTimer.cancel')}
          accessibilityRole="button"
        >
          <Icon name="x" size="xs" color={colors.textMuted} />
        </Pressable>
      </View>
    </View>
  )
}

const styles = StyleSheet.create({
  banner: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: 'rgba(126, 34, 206, 0.15)',
    borderRadius: borderRadius.md,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
    borderWidth: 1,
    borderColor: 'rgba(126, 34, 206, 0.25)',
  },
  left: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
  },
  timeText: {
    fontSize: 13,
    fontWeight: '500',
    color: colors.primary.light,
  },
  actions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  extendBtn: {
    paddingHorizontal: spacing.sm,
    paddingVertical: 2,
    borderRadius: borderRadius.sm,
    backgroundColor: 'rgba(126, 34, 206, 0.25)',
  },
  extendText: {
    fontSize: 12,
    fontWeight: '600',
    color: colors.primary.light,
  },
  cancelBtn: {
    padding: 2,
  },
})
