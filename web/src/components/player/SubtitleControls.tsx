/**
 * SubtitleControls Component
 * Provides UI controls for subtitle selection and customization
 */

import { useState } from 'react'
import { View, Text, StyleSheet, Pressable, ScrollView } from 'react-native'
import { useTranslation } from 'react-i18next'
import { Subtitles, Settings as SettingsIcon, X } from 'lucide-react'
import {
  SubtitleTrack,
  SubtitleSettings,
  SUBTITLE_LANGUAGES,
  getLanguageInfo,
} from '@/types/subtitle'
import { colors, spacing, borderRadius } from '@bayit/shared/theme'
import { GlassView } from '@bayit/shared/ui'

interface SubtitleControlsProps {
  contentId: string
  availableLanguages: SubtitleTrack[]
  currentLanguage: string | null
  enabled: boolean
  settings: SubtitleSettings
  onLanguageChange: (language: string | null) => void
  onToggle: (enabled: boolean) => void
  onSettingsChange: (settings: SubtitleSettings) => void
}

export default function SubtitleControls({
  contentId,
  availableLanguages,
  currentLanguage,
  enabled,
  settings,
  onLanguageChange,
  onToggle,
  onSettingsChange,
}: SubtitleControlsProps) {
  const { t } = useTranslation()
  const [showLanguageMenu, setShowLanguageMenu] = useState(false)
  const [showSettingsPanel, setShowSettingsPanel] = useState(false)

  // Handle subtitle toggle
  const handleToggle = () => {
    if (enabled) {
      // Turning off subtitles
      onToggle(false)
      setShowLanguageMenu(false)
      setShowSettingsPanel(false)
    } else {
      // Turning on subtitles - show language menu if not already selected
      onToggle(true)
      if (!currentLanguage && availableLanguages.length > 0) {
        setShowLanguageMenu(true)
      }
    }
  }

  // Handle language selection
  const handleLanguageSelect = (language: string) => {
    onLanguageChange(language)
    setShowLanguageMenu(false)
    if (!enabled) {
      onToggle(true)
    }
  }

  // Get current language info
  const currentLangInfo = currentLanguage ? getLanguageInfo(currentLanguage) : null

  return (
    <>
      {/* Subtitle Button */}
      <Pressable
        onPress={handleToggle}
        style={({ pressed }) => [
          styles.button,
          pressed && styles.buttonPressed,
          enabled && styles.buttonActive,
        ]}
      >
        <Subtitles size={24} color={enabled ? colors.primary : colors.textSecondary} />
        {currentLangInfo && enabled && (
          <View style={styles.badge}>
            <Text style={styles.badgeText}>{currentLangInfo.code.toUpperCase()}</Text>
          </View>
        )}
      </Pressable>

      {/* Language Selector Button */}
      {enabled && availableLanguages.length > 0 && (
        <Pressable
          onPress={() => setShowLanguageMenu(!showLanguageMenu)}
          style={({ pressed }) => [styles.button, pressed && styles.buttonPressed]}
        >
          <Text style={styles.langText}>{currentLangInfo?.flag || '🌐'}</Text>
        </Pressable>
      )}

      {/* Settings Button */}
      {enabled && (
        <Pressable
          onPress={() => setShowSettingsPanel(!showSettingsPanel)}
          style={({ pressed }) => [styles.button, pressed && styles.buttonPressed]}
        >
          <SettingsIcon size={20} color={colors.textSecondary} />
        </Pressable>
      )}

      {/* Language Selection Menu */}
      {showLanguageMenu && (
        <GlassView style={styles.menu}>
          <View style={styles.menuHeader}>
            <Text style={styles.menuTitle}>{t('subtitles.selectLanguage')}</Text>
            <Pressable onPress={() => setShowLanguageMenu(false)} style={styles.closeButton}>
              <X size={20} color={colors.textSecondary} />
            </Pressable>
          </View>

          <ScrollView style={styles.menuContent}>
            {/* Off option */}
            <Pressable
              onPress={() => {
                onToggle(false)
                setShowLanguageMenu(false)
              }}
              style={({ pressed }) => [
                styles.menuItem,
                pressed && styles.menuItemPressed,
                !enabled && styles.menuItemActive,
              ]}
            >
              <Text style={styles.menuItemText}>{t('subtitles.off')}</Text>
            </Pressable>

            {/* Available languages */}
            {availableLanguages.map((track) => {
              const langInfo = getLanguageInfo(track.language)
              const isActive = track.language === currentLanguage

              return (
                <Pressable
                  key={track.id}
                  onPress={() => handleLanguageSelect(track.language)}
                  style={({ pressed }) => [
                    styles.menuItem,
                    pressed && styles.menuItemPressed,
                    isActive && styles.menuItemActive,
                  ]}
                >
                  <Text style={styles.menuItemIcon}>{langInfo?.flag || '🌐'}</Text>
                  <View style={styles.menuItemContent}>
                    <Text style={styles.menuItemText}>{track.language_name}</Text>
                    {track.is_auto_generated && (
                      <Text style={styles.menuItemSubtext}>{t('subtitles.autoGenerated')}</Text>
                    )}
                  </View>
                  {isActive && <View style={styles.activeIndicator} />}
                </Pressable>
              )
            })}
          </ScrollView>
        </GlassView>
      )}

      {/* Settings Panel */}
      {showSettingsPanel && (
        <GlassView style={styles.settingsPanel}>
          <View style={styles.menuHeader}>
            <Text style={styles.menuTitle}>{t('subtitles.settings')}</Text>
            <Pressable onPress={() => setShowSettingsPanel(false)} style={styles.closeButton}>
              <X size={20} color={colors.textSecondary} />
            </Pressable>
          </View>

          <ScrollView style={styles.settingsPanelContent}>
            {/* Font Size */}
            <View style={styles.settingSection}>
              <Text style={styles.settingLabel}>{t('subtitles.fontSize')}</Text>
              <View style={styles.settingOptions}>
                {['small', 'medium', 'large'].map((size) => (
                  <Pressable
                    key={size}
                    onPress={() => onSettingsChange({ ...settings, fontSize: size as any })}
                    style={({ pressed }) => [
                      styles.settingOption,
                      pressed && styles.settingOptionPressed,
                      settings.fontSize === size && styles.settingOptionActive,
                    ]}
                  >
                    <Text
                      style={[
                        styles.settingOptionText,
                        settings.fontSize === size && styles.settingOptionTextActive,
                      ]}
                    >
                      {t(`subtitles.${size}`)}
                    </Text>
                  </Pressable>
                ))}
              </View>
            </View>

            {/* Position */}
            <View style={styles.settingSection}>
              <Text style={styles.settingLabel}>{t('subtitles.position')}</Text>
              <View style={styles.settingOptions}>
                {['bottom', 'top'].map((position) => (
                  <Pressable
                    key={position}
                    onPress={() => onSettingsChange({ ...settings, position: position as any })}
                    style={({ pressed }) => [
                      styles.settingOption,
                      pressed && styles.settingOptionPressed,
                      settings.position === position && styles.settingOptionActive,
                    ]}
                  >
                    <Text
                      style={[
                        styles.settingOptionText,
                        settings.position === position && styles.settingOptionTextActive,
                      ]}
                    >
                      {t(`subtitles.${position}`)}
                    </Text>
                  </Pressable>
                ))}
              </View>
            </View>

            {/* Background Color */}
            <View style={styles.settingSection}>
              <Text style={styles.settingLabel}>{t('subtitles.backgroundColor')}</Text>
              <View style={styles.settingOptions}>
                {[
                  { label: t('subtitles.black'), value: 'rgba(0, 0, 0, 0.8)' },
                  { label: t('subtitles.white'), value: 'rgba(255, 255, 255, 0.9)' },
                  { label: t('subtitles.transparent'), value: 'rgba(0, 0, 0, 0.3)' },
                ].map((color) => (
                  <Pressable
                    key={color.value}
                    onPress={() => onSettingsChange({ ...settings, backgroundColor: color.value })}
                    style={({ pressed }) => [
                      styles.settingOption,
                      pressed && styles.settingOptionPressed,
                      settings.backgroundColor === color.value && styles.settingOptionActive,
                    ]}
                  >
                    <View
                      style={[styles.colorPreview, { backgroundColor: color.value }]}
                    />
                    <Text
                      style={[
                        styles.settingOptionText,
                        settings.backgroundColor === color.value && styles.settingOptionTextActive,
                      ]}
                    >
                      {color.label}
                    </Text>
                  </Pressable>
                ))}
              </View>
            </View>

            {/* Text Color */}
            <View style={styles.settingSection}>
              <Text style={styles.settingLabel}>{t('subtitles.textColor')}</Text>
              <View style={styles.settingOptions}>
                {[
                  { label: t('subtitles.white'), value: '#FFFFFF' },
                  { label: t('subtitles.yellow'), value: '#FFFF00' },
                  { label: t('subtitles.black'), value: '#000000' },
                ].map((color) => (
                  <Pressable
                    key={color.value}
                    onPress={() => onSettingsChange({ ...settings, textColor: color.value })}
                    style={({ pressed }) => [
                      styles.settingOption,
                      pressed && styles.settingOptionPressed,
                      settings.textColor === color.value && styles.settingOptionActive,
                    ]}
                  >
                    <View
                      style={[styles.colorPreview, { backgroundColor: color.value }]}
                    />
                    <Text
                      style={[
                        styles.settingOptionText,
                        settings.textColor === color.value && styles.settingOptionTextActive,
                      ]}
                    >
                      {color.label}
                    </Text>
                  </Pressable>
                ))}
              </View>
            </View>
          </ScrollView>
        </GlassView>
      )}
    </>
  )
}

const styles = StyleSheet.create({
  button: {
    width: 44,
    height: 44,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: borderRadius.md,
    position: 'relative',
  },
  buttonPressed: {
    opacity: 0.7,
  },
  buttonActive: {
    backgroundColor: 'rgba(255, 255, 255, 0.15)',
  },
  badge: {
    position: 'absolute',
    top: 4,
    right: 4,
    backgroundColor: colors.primary,
    borderRadius: 8,
    paddingHorizontal: 4,
    paddingVertical: 2,
    minWidth: 20,
  },
  badgeText: {
    color: colors.textPrimary,
    fontSize: 9,
    fontWeight: '700',
    textAlign: 'center',
  },
  langText: {
    fontSize: 20,
  },
  menu: {
    position: 'absolute',
    bottom: 60,
    right: spacing.md,
    width: 280,
    maxHeight: 400,
    borderRadius: borderRadius.lg,
    overflow: 'hidden',
  },
  menuHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255, 255, 255, 0.1)',
  },
  menuTitle: {
    color: colors.textPrimary,
    fontSize: 16,
    fontWeight: '600',
  },
  closeButton: {
    padding: spacing.xs,
  },
  menuContent: {
    maxHeight: 340,
  },
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255, 255, 255, 0.05)',
  },
  menuItemPressed: {
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
  },
  menuItemActive: {
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
  },
  menuItemIcon: {
    fontSize: 24,
    marginRight: spacing.md,
  },
  menuItemContent: {
    flex: 1,
  },
  menuItemText: {
    color: colors.textPrimary,
    fontSize: 15,
    fontWeight: '500',
  },
  menuItemSubtext: {
    color: colors.textSecondary,
    fontSize: 12,
    marginTop: 2,
  },
  activeIndicator: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: colors.primary,
  },
  settingsPanel: {
    position: 'absolute',
    bottom: 60,
    right: spacing.md,
    width: 320,
    maxHeight: 500,
    borderRadius: borderRadius.lg,
    overflow: 'hidden',
  },
  settingsPanelContent: {
    maxHeight: 440,
    padding: spacing.md,
  },
  settingSection: {
    marginBottom: spacing.lg,
  },
  settingLabel: {
    color: colors.textPrimary,
    fontSize: 14,
    fontWeight: '600',
    marginBottom: spacing.sm,
  },
  settingOptions: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
  },
  settingOption: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
    borderRadius: borderRadius.md,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.2)',
    backgroundColor: 'rgba(0, 0, 0, 0.2)',
  },
  settingOptionPressed: {
    opacity: 0.7,
  },
  settingOptionActive: {
    borderColor: colors.primary,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
  },
  settingOptionText: {
    color: colors.textSecondary,
    fontSize: 14,
    fontWeight: '500',
  },
  settingOptionTextActive: {
    color: colors.textPrimary,
    fontWeight: '600',
  },
  colorPreview: {
    width: 16,
    height: 16,
    borderRadius: 8,
    marginRight: spacing.xs,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.3)',
  },
})
