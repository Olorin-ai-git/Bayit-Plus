import React from 'react'
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

  // Format time display based on selected timezone
  const formatTime = (date: Date, tz: Timezone) => {
    const dt = DateTime.fromJSDate(date)
    const zonedTime = tz === 'israel' ? dt.setZone('Asia/Jerusalem') : dt.setZone('local')
    return zonedTime.toFormat('HH:mm')
  }

  const israelTime = formatTime(currentTime, 'israel')
  const localTime = formatTime(currentTime, 'local')

  return (
    <div className="flex items-center gap-3 flex-wrap">
      {/* Time Navigation */}
      <div className="flex items-center gap-2 bg-black/20 backdrop-blur-xl rounded-xl p-2">
        <button
          onClick={() => onTimeShift(-2)}
          className="flex items-center gap-1 px-3 py-2 text-white/80 hover:text-white hover:bg-white/5 rounded-lg transition-all"
          aria-label={t('epg.goBack', { hours: 2 })}
        >
          <ChevronLeft size={18} />
          <span className="text-sm font-medium">{t('epg.goBack', { hours: 2 })}</span>
        </button>

        <button
          onClick={onJumpToNow}
          className="flex items-center gap-2 px-4 py-2 bg-primary/20 text-primary hover:bg-primary/30 rounded-lg transition-all"
          aria-label={t('epg.jumpToNow')}
        >
          <Clock size={18} />
          <span className="text-sm font-medium">{t('epg.jumpToNow')}</span>
        </button>

        <button
          onClick={() => onTimeShift(2)}
          className="flex items-center gap-1 px-3 py-2 text-white/80 hover:text-white hover:bg-white/5 rounded-lg transition-all"
          aria-label={t('epg.goForward', { hours: 2 })}
        >
          <span className="text-sm font-medium">{t('epg.goForward', { hours: 2 })}</span>
          <ChevronRight size={18} />
        </button>
      </div>

      {/* Timezone Toggle */}
      <button
        onClick={onTimezoneToggle}
        className="flex items-center gap-3 px-4 py-2 bg-black/20 backdrop-blur-xl rounded-xl hover:bg-black/30 transition-all"
        aria-label={t('epg.toggleTimezone')}
      >
        <Globe size={18} className="text-primary" />
        <div className="flex flex-col items-start">
          <span className="text-xs text-white/60">
            {timezone === 'israel' ? t('epg.israelTime') : t('epg.localTime')}
          </span>
          <div className="flex items-center gap-2 text-sm font-medium text-white">
            <span className={timezone === 'israel' ? 'text-primary' : ''}>
              {t('epg.il')}: {israelTime}
            </span>
            <span className="text-white/40">|</span>
            <span className={timezone === 'local' ? 'text-primary' : ''}>
              {t('epg.local')}: {localTime}
            </span>
          </div>
        </div>
      </button>
    </div>
  )
}

export default EPGTimeControls
