import { useState, useEffect } from 'react'
import { View, Text, StyleSheet, Pressable, ActivityIndicator } from 'react-native'
import { useTranslation } from 'react-i18next'
import { Sunrise, Check } from 'lucide-react'
import { NativeIcon } from '@olorin/shared-icons/native'
import { ritualService } from '@/services/api'
import logger from '@/utils/logger'
import { colors, spacing, borderRadius } from '@olorin/design-tokens'
import { GlassView, GlassSelect } from '@bayit/shared/ui'

interface Preferences {
  morning_ritual_enabled: boolean
  morning_ritual_start: number
  morning_ritual_end: number
  morning_ritual_content: string[]
  morning_ritual_auto_play: boolean
  morning_ritual_skip_weekends: boolean
}

export default function RitualSettings() {
  const { t } = useTranslation()
  const [preferences, setPreferences] = useState<Preferences | null>(null)
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
      logger.error('Failed to load preferences', 'RitualSettings', error)
    } finally {
      setLoading(false)
    }
  }

  const handleChange = (key: keyof Preferences, value: any) => {
    setPreferences((prev) => prev ? { ...prev, [key]: value } : null)
    setSaved(false)
  }

  const handleContentToggle = (contentType: string) => {
    const current = preferences?.morning_ritual_content || []
    const updated = current.includes(contentType)
      ? current.filter((c) => c !== contentType)
      : [...current, contentType]
    handleChange('morning_ritual_content', updated)
  }

  const handleSave = async () => {
    if (!preferences) return
    setSaving(true)
    try {
      await ritualService.updatePreferences(preferences)
      setSaved(true)
      setTimeout(() => setSaved(false), 2000)
    } catch (error) {
      logger.error('Failed to save preferences', 'RitualSettings', error)
    } finally {
      setSaving(false)
    }
  }

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="small" color={colors.primary} />
      </View>
    )
  }

  if (!preferences) {
    return (
      <View style={styles.errorContainer}>
        <Text style={styles.errorText}>{t('common.error')}</Text>
      </View>
    )
  }

  const Toggle = ({ value, onToggle, disabled }: { value: boolean; onToggle: () => void; disabled?: boolean }) => (
    <Pressable
      onPress={onToggle}
      disabled={disabled}
      style={[styles.toggle, value && styles.toggleActive]}
    >
      <View style={[styles.toggleKnob, value && styles.toggleKnobActive]} />
    </Pressable>
  )

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <View style={styles.headerIcon}>
          <Sunrise size={24} color="#F59E0B" />
        </View>
        <View>
          <Text style={styles.headerTitle}>{t('settings.ritual.title')}</Text>
          <Text style={styles.headerSubtitle}>
            {t('settings.ritual.description', 'הגדר את חוויית הבוקר המותאמת אישית שלך')}
          </Text>
        </View>
      </View>

      {/* Enable Toggle */}
      <GlassView style={styles.card}>
        <Pressable
          onPress={() => handleChange('morning_ritual_enabled', !preferences.morning_ritual_enabled)}
          style={styles.toggleRow}
        >
          <Text style={styles.toggleLabel}>{t('settings.ritual.enabled')}</Text>
          <Toggle
            value={preferences.morning_ritual_enabled}
            onToggle={() => handleChange('morning_ritual_enabled', !preferences.morning_ritual_enabled)}
          />
        </Pressable>
      </GlassView>

      {/* Time Settings */}
      <GlassView style={[styles.card, !preferences.morning_ritual_enabled && styles.cardDisabled]}>
        <Text style={styles.cardTitle}>{t('settings.ritual.timeRange', 'טווח זמנים')}</Text>

        <View style={styles.timeRow}>
          {/* Start Time */}
          <View style={styles.timeField}>
            <GlassSelect
              label={t('settings.ritual.startTime')}
              value={preferences.morning_ritual_start}
              onChange={(value) => handleChange('morning_ritual_start', parseInt(value))}
              options={[5, 6, 7, 8, 9, 10, 11, 12].map((hour) => ({
                value: hour.toString(),
                label: `${hour}:00`,
              }))}
              disabled={!preferences.morning_ritual_enabled}
            />
          </View>

          {/* End Time */}
          <View style={styles.timeField}>
            <GlassSelect
              label={t('settings.ritual.endTime')}
              value={preferences.morning_ritual_end}
              onChange={(value) => handleChange('morning_ritual_end', parseInt(value))}
              options={[6, 7, 8, 9, 10, 11, 12, 13, 14].map((hour) => ({
                value: hour.toString(),
                label: `${hour}:00`,
              }))}
              disabled={!preferences.morning_ritual_enabled}
            />
          </View>
        </View>
      </GlassView>

      {/* Content Types */}
      <GlassView style={[styles.card, !preferences.morning_ritual_enabled && styles.cardDisabled]}>
        <Text style={styles.cardTitle}>{t('settings.ritual.contentTypes')}</Text>

        <View style={styles.contentList}>
          {[
            { id: 'news', label: t('settings.ritual.news'), icon: 'info' },
            { id: 'radio', label: t('settings.ritual.radio'), icon: 'radio' },
            { id: 'vod', label: t('settings.ritual.videos'), icon: 'vod' },
          ].map((content) => {
            const isSelected = (preferences.morning_ritual_content || []).includes(content.id)
            return (
              <Pressable
                key={content.id}
                onPress={() => preferences.morning_ritual_enabled && handleContentToggle(content.id)}
                style={({ hovered }) => [
                  styles.contentOption,
                  isSelected && styles.contentOptionSelected,
                  hovered && preferences.morning_ritual_enabled && styles.contentOptionHovered,
                ]}
              >
                <NativeIcon
                  name={content.icon}
                  size="sm"
                  color={isSelected ? colors.primary : colors.textMuted}
                />
                <Text style={styles.contentLabel}>{content.label}</Text>
                {isSelected && <Check size={18} color={colors.primary} />}
              </Pressable>
            )
          })}
        </View>
      </GlassView>

      {/* Additional Options */}
      <GlassView style={[styles.card, !preferences.morning_ritual_enabled && styles.cardDisabled]}>
        <Text style={styles.cardTitle}>{t('settings.ritual.options', 'אפשרויות נוספות')}</Text>

        <Pressable
          onPress={() => preferences.morning_ritual_enabled && handleChange('morning_ritual_auto_play', !preferences.morning_ritual_auto_play)}
          style={styles.toggleRow}
        >
          <Text style={styles.toggleLabel}>{t('settings.ritual.autoPlay')}</Text>
          <Toggle
            value={preferences.morning_ritual_auto_play}
            onToggle={() => handleChange('morning_ritual_auto_play', !preferences.morning_ritual_auto_play)}
            disabled={!preferences.morning_ritual_enabled}
          />
        </Pressable>

        <Pressable
          onPress={() => preferences.morning_ritual_enabled && handleChange('morning_ritual_skip_weekends', !preferences.morning_ritual_skip_weekends)}
          style={styles.toggleRow}
        >
          <Text style={styles.toggleLabel}>{t('settings.ritual.skipWeekends')}</Text>
          <Toggle
            value={preferences.morning_ritual_skip_weekends}
            onToggle={() => handleChange('morning_ritual_skip_weekends', !preferences.morning_ritual_skip_weekends)}
            disabled={!preferences.morning_ritual_enabled}
          />
        </Pressable>
      </GlassView>

      {/* Save Button */}
      <Pressable
        onPress={handleSave}
        disabled={saving || saved}
        style={({ hovered }) => [
          styles.saveButton,
          saved && styles.saveButtonSaved,
          hovered && !saved && !saving && styles.saveButtonHovered,
        ]}
      >
        {saving ? (
          <ActivityIndicator size="small" color={colors.text} />
        ) : saved ? (
          <View style={styles.savedContent}>
            <Check size={20} color="#22C55E" />
            <Text style={styles.savedText}>{t('common.saved', 'נשמר!')}</Text>
          </View>
        ) : (
          <Text style={styles.saveText}>{t('common.save')}</Text>
        )}
      </Pressable>
    </View>
  )
}

const styles = StyleSheet.create({
  container: {
    gap: spacing.lg,
  },
  loadingContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    padding: spacing.xl,
  },
  errorContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    padding: spacing.xl,
  },
  errorText: {
    color: colors.textMuted,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  headerIcon: {
    padding: spacing.sm,
    borderRadius: borderRadius.md,
    backgroundColor: 'rgba(245, 158, 11, 0.2)',
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: colors.text,
  },
  headerSubtitle: {
    fontSize: 14,
    color: colors.textMuted,
  },
  card: {
    padding: spacing.md,
    gap: spacing.md,
  },
  cardDisabled: {
    opacity: 0.5,
  },
  cardTitle: {
    fontSize: 14,
    fontWeight: '500',
    color: colors.textSecondary,
  },
  toggleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  toggleLabel: {
    fontSize: 14,
    color: colors.text,
  },
  toggle: {
    width: 48,
    height: 24,
    borderRadius: 12,
    backgroundColor: colors.backgroundLighter,
    padding: 2,
  },
  toggleActive: {
    backgroundColor: colors.primary[600],
  },
  toggleKnob: {
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: colors.text,
  },
  toggleKnobActive: {
    transform: [{ translateX: 24 }],
  },
  timeRow: {
    flexDirection: 'row',
    gap: spacing.md,
  },
  timeField: {
    flex: 1,
  },
  timeLabel: {
    fontSize: 14,
    color: colors.textMuted,
    marginBottom: spacing.sm,
  },
  contentList: {
    gap: spacing.sm,
  },
  contentOption: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    padding: spacing.sm,
    borderRadius: borderRadius.md,
    backgroundColor: 'rgba(255, 255, 255, 0.03)',
  },
  contentOptionSelected: {
    backgroundColor: 'rgba(107, 33, 168, 0.3)',
    borderWidth: 1,
    borderColor: 'rgba(168, 85, 247, 0.6)',
  },
  contentOptionHovered: {
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
  },
  contentLabel: {
    flex: 1,
    fontSize: 14,
    color: colors.text,
  },
  saveButton: {
    backgroundColor: colors.primary.DEFAULT,
    paddingVertical: spacing.md,
    borderRadius: borderRadius.lg,
    alignItems: 'center',
    justifyContent: 'center',
  },
  saveButtonHovered: {
    shadowColor: colors.primary,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.5,
    shadowRadius: 12,
  },
  saveButtonSaved: {
    backgroundColor: 'rgba(34, 197, 94, 0.2)',
  },
  saveText: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.background,
  },
  savedContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  savedText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#22C55E',
  },
})
