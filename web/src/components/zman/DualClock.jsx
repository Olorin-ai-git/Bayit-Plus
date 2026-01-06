import { useState, useEffect, useCallback } from 'react'
import { Clock, MapPin, Sun, Moon, Star } from 'lucide-react'
import { zmanService } from '../../services/api'

/**
 * DualClock Component
 * Displays current time in Israel alongside local time.
 * Shows Shabbat status and countdown when applicable.
 */
export default function DualClock({
  showShabbatStatus = true,
  compact = false,
  className = '',
}) {
  const [timeData, setTimeData] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  const fetchTime = useCallback(async () => {
    try {
      const data = await zmanService.getTime()
      setTimeData(data)
      setError(null)
    } catch (err) {
      console.error('Failed to fetch time:', err)
      setError('Unable to fetch time')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchTime()
    // Update every minute
    const interval = setInterval(fetchTime, 60000)
    return () => clearInterval(interval)
  }, [fetchTime])

  if (loading) {
    return (
      <div className={`glass-card-sm p-3 animate-pulse ${className}`}>
        <div className="flex gap-4">
          <div className="h-8 w-20 bg-white/10 rounded" />
          <div className="h-8 w-20 bg-white/10 rounded" />
        </div>
      </div>
    )
  }

  if (error || !timeData) {
    return null
  }

  const { israel, local, shabbat } = timeData

  // Determine if it's daytime in Israel (rough estimate)
  const israelHour = parseInt(israel.time.split(':')[0], 10)
  const isDayInIsrael = israelHour >= 6 && israelHour < 20

  if (compact) {
    return (
      <div className={`flex items-center gap-3 text-sm ${className}`}>
        <div className="flex items-center gap-1.5 text-white/80">
          <span className="text-xs">🇮🇱</span>
          <span className="font-mono">{israel.time}</span>
        </div>
        {shabbat.is_shabbat && (
          <div className="flex items-center gap-1 text-amber-400">
            <Star className="w-3 h-3" />
            <span className="text-xs">שבת</span>
          </div>
        )}
      </div>
    )
  }

  return (
    <div className={`glass-card-sm p-4 ${className}`}>
      <div className="flex items-center justify-between gap-6">
        {/* Israel Time */}
        <div className="flex items-center gap-3">
          <div className="flex items-center justify-center w-10 h-10 rounded-full bg-gradient-to-br from-blue-500/20 to-white/10">
            {isDayInIsrael ? (
              <Sun className="w-5 h-5 text-amber-400" />
            ) : (
              <Moon className="w-5 h-5 text-blue-300" />
            )}
          </div>
          <div className="text-right">
            <div className="text-xs text-white/60 flex items-center gap-1">
              <span>🇮🇱</span>
              <span>ישראל</span>
            </div>
            <div className="text-xl font-mono font-semibold text-white">
              {israel.time}
            </div>
            <div className="text-xs text-white/50">{israel.day}</div>
          </div>
        </div>

        {/* Divider */}
        <div className="w-px h-12 bg-white/10" />

        {/* Local Time */}
        <div className="flex items-center gap-3">
          <div className="flex items-center justify-center w-10 h-10 rounded-full bg-white/5">
            <MapPin className="w-5 h-5 text-cyan-400" />
          </div>
          <div className="text-right">
            <div className="text-xs text-white/60">מקומי</div>
            <div className="text-xl font-mono font-semibold text-white/80">
              {local.time}
            </div>
            <div className="text-xs text-white/50">
              {local.timezone.split('/')[1]?.replace('_', ' ')}
            </div>
          </div>
        </div>
      </div>

      {/* Shabbat Status */}
      {showShabbatStatus && (shabbat.is_shabbat || shabbat.is_erev_shabbat) && (
        <div className="mt-3 pt-3 border-t border-white/10">
          {shabbat.is_shabbat ? (
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Star className="w-4 h-4 text-amber-400" />
                <span className="text-amber-400 font-medium">שבת שלום!</span>
              </div>
              {shabbat.countdown && (
                <div className="text-xs text-white/60">
                  <span>{shabbat.countdown_label}: </span>
                  <span className="font-mono">{shabbat.countdown}</span>
                </div>
              )}
            </div>
          ) : shabbat.is_erev_shabbat ? (
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Clock className="w-4 h-4 text-purple-400" />
                <span className="text-purple-400 font-medium">ערב שבת</span>
              </div>
              <div className="text-xs text-white/60">
                {shabbat.countdown && (
                  <>
                    <span>{shabbat.countdown_label}: </span>
                    <span className="font-mono">{shabbat.countdown}</span>
                  </>
                )}
                {shabbat.candle_lighting && (
                  <span className="mr-2">הדלקת נרות: {shabbat.candle_lighting}</span>
                )}
              </div>
            </div>
          ) : null}

          {/* Parasha */}
          {shabbat.parasha_hebrew && (
            <div className="mt-2 text-xs text-white/50 text-center">
              פרשת {shabbat.parasha_hebrew}
            </div>
          )}
        </div>
      )}
    </div>
  )
}

/**
 * Minimal clock display for header/navbar
 */
export function MiniClock({ className = '' }) {
  const [time, setTime] = useState('')
  const [isShabbat, setIsShabbat] = useState(false)

  useEffect(() => {
    const fetchTime = async () => {
      try {
        const data = await zmanService.getTime()
        setTime(data.israel.time)
        setIsShabbat(data.shabbat.is_shabbat)
      } catch (err) {
        console.error('Failed to fetch time:', err)
      }
    }

    fetchTime()
    const interval = setInterval(fetchTime, 60000)
    return () => clearInterval(interval)
  }, [])

  if (!time) return null

  return (
    <div className={`flex items-center gap-2 ${className}`}>
      <span className="text-xs">🇮🇱</span>
      <span className="font-mono text-sm text-white/80">{time}</span>
      {isShabbat && <Star className="w-3 h-3 text-amber-400" />}
    </div>
  )
}
