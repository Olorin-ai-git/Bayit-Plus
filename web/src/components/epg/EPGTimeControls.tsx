import React from 'react'
import { View, Pressable, Text, StyleSheet } from 'react-native'
import { ChevronLeft, ChevronRight, Clock, Globe } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { DateTime } from 'luxon'

export type Timezone = 'israel' | 'local'

interface EPGTimeControlsProps {
  currentTime: Date
  timezone: Timezone
  onTimeShift: (hours: number) => void
  onJumpToNow: () => void
  onTimezoneToggle: () => void
}

const EPGTimeControls: React.FC<EPGTimeControlsProps> = ({
  currentTime,
  timezone,
  onTimeShift,
  onJumpToNow,
  onTimezoneToggle
}) => {
  const { t } = useTranslation()

  const formatTime = (date: Date, tz: Timezone) => {
    const dt = DateTime.fromJSDate(date)
    const zonedTime = tz === 'israel' ? dt.setZone('Asia/Jerusalem') : dt.setZone('local')
    return zonedTime.toFormat('HH:mm')
  }

  const israelTime = formatTime(currentTime, 'israel')
  const localTime = formatTime(currentTime, 'local')

  return (
    <View style={styles.container}>
      <View style={styles.navigationContainer}>
        <Pressable
          onPress={() => onTimeShift(-2)}
          style={styles.navButton}
          aria-label={t('epg.goBack', { hours: 2 })}
        >
          <ChevronLeft size={18} color="rgba(255, 255, 255, 0.8)" />
          <Text style={styles.navButtonText}>{t('epg.goBack', { hours: 2 })}</Text>
        </Pressable>

        <Pressable
          onPress={onJumpToNow}
          style={styles.nowButton}
          aria-label={t('epg.jumpToNow')}
        >
          <Clock size={18} color="#a855f7" />
          <Text style={styles.nowButtonText}>{t('epg.jumpToNow')}</Text>
        </Pressable>

        <Pressable
          onPress={() => onTimeShift(2)}
          style={styles.navButton}
          aria-label={t('epg.goForward', { hours: 2 })}
        >
          <Text style={styles.navButtonText}>{t('epg.goForward', { hours: 2 })}</Text>
          <ChevronRight size={18} color="rgba(255, 255, 255, 0.8)" />
        </Pressable>
      </View>

      <Pressable
        onPress={onTimezoneToggle}
        style={styles.timezoneButton}
        aria-label={t('epg.toggleTimezone')}
      >
        <Globe size={18} color="#a855f7" />
        <View style={styles.timezoneContent}>
          <Text style={styles.timezoneLabel}>
            {timezone === 'israel' ? t('epg.israelTime') : t('epg.localTime')}
          </Text>
          <View style={styles.timezoneRow}>
            <Text style={[styles.timeValue, timezone === 'israel' && styles.timeValueActive]}>
              {t('epg.il')}: {israelTime}
            </Text>
            <Text style={styles.timeDivider}>|</Text>
            <Text style={[styles.timeValue, timezone === 'local' && styles.timeValueActive]}>
              {t('epg.local')}: {localTime}
            </Text>
          </View>
        </View>
      </Pressable>
    </View>
  )
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    flexWrap: 'wrap',
  },
  navigationContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: 'rgba(0, 0, 0, 0.2)',
    backdropFilter: 'blur(16px)',
    borderRadius: 12,
    padding: 8,
  },
  navButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
  },
  navButtonText: {
    fontSize: 14,
    fontWeight: '500',
    color: 'rgba(255, 255, 255, 0.8)',
  },
  nowButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 16,
    paddingVertical: 8,
    backgroundColor: 'rgba(168, 85, 247, 0.2)',
    borderRadius: 8,
  },
  nowButtonText: {
    fontSize: 14,
    fontWeight: '500',
    color: '#a855f7',
  },
  timezoneButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingHorizontal: 16,
    paddingVertical: 8,
    backgroundColor: 'rgba(0, 0, 0, 0.2)',
    backdropFilter: 'blur(16px)',
    borderRadius: 12,
  },
  timezoneContent: {
    flexDirection: 'column',
    alignItems: 'flex-start',
  },
  timezoneLabel: {
    fontSize: 12,
    color: 'rgba(255, 255, 255, 0.6)',
  },
  timezoneRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  timeValue: {
    fontSize: 14,
    fontWeight: '500',
    color: '#ffffff',
  },
  timeValueActive: {
    color: '#a855f7',
  },
  timeDivider: {
    fontSize: 14,
    color: 'rgba(255, 255, 255, 0.4)',
  },
})

export default EPGTimeControls
