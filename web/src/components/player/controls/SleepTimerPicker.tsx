import { View, Text, Pressable, StyleSheet } from 'react-native'
import { useTranslation } from 'react-i18next'
import { colors, borderRadius, spacing } from '@olorin/design-tokens'
import { GlassView } from '@bayit/shared/ui'
import { Icon } from '@olorin/shared-icons/web'

interface SleepTimerPickerProps {
  isOpen: boolean
  onSelect: (minutes: number) => void
  onCancel: () => void
  activeDuration: number | null
  timerOptions: number[]
}

export default function SleepTimerPicker({
  isOpen,
  onSelect,
  onCancel,
  activeDuration,
  timerOptions,
}: SleepTimerPickerProps) {
  const { t } = useTranslation()

  if (!isOpen) return null

  return (
    <Pressable style={styles.backdrop} onPress={onCancel}>
      <Pressable onPress={(e) => e.stopPropagation?.()} style={styles.inner}>
        <GlassView style={styles.container}>
          <View style={styles.header}>
            <Icon name="moon" size="sm" color={colors.primary.DEFAULT} />
            <Text style={styles.title}>{t('player.sleepTimer.setTimer')}</Text>
          </View>

          <View style={styles.grid}>
            <Pressable
              onPress={onCancel}
              style={[
                styles.chip,
                !activeDuration && styles.chipActive,
              ]}
              accessibilityLabel={t('player.sleepTimer.off')}
              accessibilityRole="button"
            >
              <Text
                style={[
                  styles.chipText,
                  !activeDuration && styles.chipTextActive,
                ]}
              >
                {t('player.sleepTimer.off')}
              </Text>
            </Pressable>

            {timerOptions.map((minutes) => (
              <Pressable
                key={minutes}
                onPress={() => onSelect(minutes)}
                style={[
                  styles.chip,
                  activeDuration === minutes && styles.chipActive,
                ]}
                accessibilityLabel={t('player.sleepTimer.minutesFormat', { minutes })}
                accessibilityRole="button"
              >
                <Text
                  style={[
                    styles.chipText,
                    activeDuration === minutes && styles.chipTextActive,
                  ]}
                >
                  {t('player.sleepTimer.minutesFormat', { minutes })}
                </Text>
              </Pressable>
            ))}
          </View>
        </GlassView>
      </Pressable>
    </Pressable>
  )
}

const styles = StyleSheet.create({
  backdrop: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 50,
  } as any,
  inner: {
    maxWidth: 320,
    width: '90%',
  } as any,
  container: {
    padding: spacing.lg,
    gap: spacing.md,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  title: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.text,
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
  } as any,
  chip: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: borderRadius.lg,
    backgroundColor: 'rgba(255, 255, 255, 0.08)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.12)',
  },
  chipActive: {
    backgroundColor: colors.primary.DEFAULT,
    borderColor: colors.primary.DEFAULT,
  },
  chipText: {
    fontSize: 14,
    fontWeight: '500',
    color: colors.textSecondary,
  },
  chipTextActive: {
    color: colors.text,
    fontWeight: '600',
  },
})
