import { useState, useEffect } from 'react'
import { useTranslation } from 'react-i18next'
import { Sunrise, Loader2, Check } from 'lucide-react'
import { ritualService } from '@/services/api'

export default function RitualSettings() {
  const { t } = useTranslation()
  const [preferences, setPreferences] = useState(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)

  useEffect(() => {
    loadPreferences()
  }, [])

  const loadPreferences = async () => {
    try {
      const data = await ritualService.getPreferences()
      setPreferences(data)
    } catch (error) {
      console.error('Failed to load preferences:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleChange = (key, value) => {
    setPreferences((prev) => ({
      ...prev,
      [key]: value,
    }))
    setSaved(false)
  }

  const handleContentToggle = (contentType) => {
    const current = preferences.morning_ritual_content || []
    const updated = current.includes(contentType)
      ? current.filter((c) => c !== contentType)
      : [...current, contentType]
    handleChange('morning_ritual_content', updated)
  }

  const handleSave = async () => {
    setSaving(true)
    try {
      await ritualService.updatePreferences(preferences)
      setSaved(true)
      setTimeout(() => setSaved(false), 2000)
    } catch (error) {
      console.error('Failed to save preferences:', error)
    } finally {
      setSaving(false)
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <Loader2 size={24} className="animate-spin text-primary-400" />
      </div>
    )
  }

  if (!preferences) {
    return (
      <div className="text-center p-8 text-dark-400">
        {t('common.error')}
      </div>
    )
  }

  return (
    <div className="space-y-6" dir="rtl">
      {/* Header */}
      <div className="flex items-center gap-3">
        <div className="p-2 rounded-lg bg-amber-500/20">
          <Sunrise size={24} className="text-amber-400" />
        </div>
        <div>
          <h3 className="text-lg font-semibold">{t('settings.ritual.title')}</h3>
          <p className="text-sm text-dark-400">
            {t('settings.ritual.description', 'הגדר את חוויית הבוקר המותאמת אישית שלך')}
          </p>
        </div>
      </div>

      {/* Enable Toggle */}
      <div className="glass-card p-4">
        <label className="flex items-center justify-between cursor-pointer">
          <span className="font-medium">{t('settings.ritual.enabled')}</span>
          <div
            className={`
              relative w-12 h-6 rounded-full transition-colors duration-300
              ${preferences.morning_ritual_enabled ? 'bg-primary-500' : 'bg-dark-600'}
            `}
            onClick={() => handleChange('morning_ritual_enabled', !preferences.morning_ritual_enabled)}
          >
            <div
              className={`
                absolute top-1 w-4 h-4 rounded-full bg-white transition-transform duration-300
                ${preferences.morning_ritual_enabled ? 'left-7' : 'left-1'}
              `}
            />
          </div>
        </label>
      </div>

      {/* Time Settings */}
      <div className={`glass-card p-4 space-y-4 transition-opacity ${!preferences.morning_ritual_enabled ? 'opacity-50 pointer-events-none' : ''}`}>
        <h4 className="font-medium text-dark-300">{t('settings.ritual.timeRange', 'טווח זמנים')}</h4>

        <div className="grid grid-cols-2 gap-4">
          {/* Start Time */}
          <div>
            <label className="block text-sm text-dark-400 mb-2">
              {t('settings.ritual.startTime')}
            </label>
            <select
              value={preferences.morning_ritual_start}
              onChange={(e) => handleChange('morning_ritual_start', parseInt(e.target.value))}
              className="glass-input w-full"
            >
              {[5, 6, 7, 8, 9, 10, 11, 12].map((hour) => (
                <option key={hour} value={hour}>
                  {hour}:00
                </option>
              ))}
            </select>
          </div>

          {/* End Time */}
          <div>
            <label className="block text-sm text-dark-400 mb-2">
              {t('settings.ritual.endTime')}
            </label>
            <select
              value={preferences.morning_ritual_end}
              onChange={(e) => handleChange('morning_ritual_end', parseInt(e.target.value))}
              className="glass-input w-full"
            >
              {[6, 7, 8, 9, 10, 11, 12, 13, 14].map((hour) => (
                <option key={hour} value={hour}>
                  {hour}:00
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* Content Types */}
      <div className={`glass-card p-4 space-y-4 transition-opacity ${!preferences.morning_ritual_enabled ? 'opacity-50 pointer-events-none' : ''}`}>
        <h4 className="font-medium text-dark-300">{t('settings.ritual.contentTypes')}</h4>

        <div className="space-y-2">
          {[
            { id: 'news', label: t('settings.ritual.news'), icon: '📰' },
            { id: 'radio', label: t('settings.ritual.radio'), icon: '📻' },
            { id: 'vod', label: t('settings.ritual.videos'), icon: '🎬' },
          ].map((content) => {
            const isSelected = (preferences.morning_ritual_content || []).includes(content.id)
            return (
              <label
                key={content.id}
                className={`
                  flex items-center gap-3 p-3 rounded-lg cursor-pointer transition-all
                  ${isSelected ? 'glass-strong ring-1 ring-primary-500/50' : 'glass hover:bg-white/5'}
                `}
              >
                <input
                  type="checkbox"
                  checked={isSelected}
                  onChange={() => handleContentToggle(content.id)}
                  className="sr-only"
                />
                <span className="text-xl">{content.icon}</span>
                <span className="flex-1">{content.label}</span>
                {isSelected && (
                  <Check size={18} className="text-primary-400" />
                )}
              </label>
            )
          })}
        </div>
      </div>

      {/* Additional Options */}
      <div className={`glass-card p-4 space-y-4 transition-opacity ${!preferences.morning_ritual_enabled ? 'opacity-50 pointer-events-none' : ''}`}>
        <h4 className="font-medium text-dark-300">{t('settings.ritual.options', 'אפשרויות נוספות')}</h4>

        {/* Auto Play */}
        <label className="flex items-center justify-between cursor-pointer">
          <span>{t('settings.ritual.autoPlay')}</span>
          <div
            className={`
              relative w-12 h-6 rounded-full transition-colors duration-300
              ${preferences.morning_ritual_auto_play ? 'bg-primary-500' : 'bg-dark-600'}
            `}
            onClick={() => handleChange('morning_ritual_auto_play', !preferences.morning_ritual_auto_play)}
          >
            <div
              className={`
                absolute top-1 w-4 h-4 rounded-full bg-white transition-transform duration-300
                ${preferences.morning_ritual_auto_play ? 'left-7' : 'left-1'}
              `}
            />
          </div>
        </label>

        {/* Skip Weekends */}
        <label className="flex items-center justify-between cursor-pointer">
          <span>{t('settings.ritual.skipWeekends')}</span>
          <div
            className={`
              relative w-12 h-6 rounded-full transition-colors duration-300
              ${preferences.morning_ritual_skip_weekends ? 'bg-primary-500' : 'bg-dark-600'}
            `}
            onClick={() => handleChange('morning_ritual_skip_weekends', !preferences.morning_ritual_skip_weekends)}
          >
            <div
              className={`
                absolute top-1 w-4 h-4 rounded-full bg-white transition-transform duration-300
                ${preferences.morning_ritual_skip_weekends ? 'left-7' : 'left-1'}
              `}
            />
          </div>
        </label>
      </div>

      {/* Save Button */}
      <button
        onClick={handleSave}
        disabled={saving || saved}
        className={`
          w-full py-3 rounded-xl font-medium transition-all duration-300
          ${saved
            ? 'bg-green-500/20 text-green-400'
            : 'glass-btn-primary'
          }
        `}
      >
        {saving ? (
          <Loader2 size={20} className="animate-spin mx-auto" />
        ) : saved ? (
          <span className="flex items-center justify-center gap-2">
            <Check size={20} />
            {t('common.saved', 'נשמר!')}
          </span>
        ) : (
          t('common.save')
        )}
      </button>
    </div>
  )
}
