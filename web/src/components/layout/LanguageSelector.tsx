import { useState, useRef, useEffect } from 'react'
import { View, Text, StyleSheet, Pressable, Animated } from 'react-native'
import { Globe, Check, ChevronDown } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { languages, saveLanguage, getCurrentLanguage } from '@/i18n'
import { colors, spacing, borderRadius } from '@bayit/shared/theme'
import { GlassView } from '@bayit/shared/ui'

export default function LanguageSelector({ compact = false }) {
  const { i18n } = useTranslation()
  const [isOpen, setIsOpen] = useState(false)
  const dropdownRef = useRef(null)
  const currentLang = getCurrentLanguage()
  const rotateAnim = useRef(new Animated.Value(0)).current

  useEffect(() => {
    Animated.timing(rotateAnim, {
      toValue: isOpen ? 1 : 0,
      duration: 200,
      useNativeDriver: true,
    }).start()
  }, [isOpen])

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setIsOpen(false)
      }
    }

    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  const handleLanguageChange = (langCode) => {
    saveLanguage(langCode)
    setIsOpen(false)

    // Update document direction for RTL/LTR
    const lang = languages.find((l) => l.code === langCode)
    document.documentElement.dir = lang?.rtl ? 'rtl' : 'ltr'
    document.documentElement.lang = langCode
  }

  const rotate = rotateAnim.interpolate({
    inputRange: [0, 1],
    outputRange: ['0deg', '180deg'],
  })

  return (
    <View style={[styles.container, isOpen && styles.containerOpen]} ref={dropdownRef}>
      {/* Trigger Button */}
      <Pressable
        onPress={() => setIsOpen(!isOpen)}
        style={({ hovered }) => [
          styles.trigger,
          !compact && styles.triggerFull,
          isOpen && styles.triggerActive,
          hovered && styles.triggerHovered,
        ]}
        aria-label="Select language"
        aria-expanded={isOpen}
      >
        {compact ? (
          <Globe size={20} color={colors.text} />
        ) : (
          <View style={styles.triggerContent}>
            <Text style={styles.flag}>{currentLang.flag}</Text>
            <Text style={styles.langName}>{currentLang.name}</Text>
            <Animated.View style={{ transform: [{ rotate }] }}>
              <ChevronDown size={16} color={colors.textSecondary} />
            </Animated.View>
          </View>
        )}
      </Pressable>

      {/* Dropdown */}
      {isOpen && (
        <GlassView style={styles.dropdown} intensity="strong">
          {languages.map((lang) => {
            const isSelected = lang.code === i18n.language
            return (
              <Pressable
                key={lang.code}
                onPress={() => handleLanguageChange(lang.code)}
                style={({ hovered }) => [
                  styles.option,
                  isSelected && styles.optionSelected,
                  hovered && styles.optionHovered,
                ]}
              >
                <Text style={styles.optionFlag}>{lang.flag}</Text>
                <Text style={[
                  styles.optionName,
                  isSelected && styles.optionNameSelected
                ]}>
                  {lang.name}
                </Text>
                {isSelected && (
                  <Check size={16} color={colors.primary} />
                )}
              </Pressable>
            )
          })}
        </GlassView>
      )}
    </View>
  )
}

const styles = StyleSheet.create({
  container: {
    position: 'relative',
    zIndex: 100,
  },
  containerOpen: {
    zIndex: 9999,
  },
  trigger: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: spacing.sm,
    borderRadius: borderRadius.md,
  },
  triggerFull: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    gap: spacing.sm,
  },
  triggerActive: {
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
  },
  triggerHovered: {
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
  },
  triggerContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  flag: {
    fontSize: 18,
  },
  langName: {
    fontSize: 14,
    color: colors.text,
  },
  dropdown: {
    position: 'absolute',
    top: '100%',
    left: 0,
    marginTop: spacing.sm,
    minWidth: 180,
    padding: spacing.xs,
    zIndex: 9999,
  },
  option: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm + 2,
    borderRadius: borderRadius.md,
    gap: spacing.md,
  },
  optionSelected: {
    backgroundColor: 'rgba(0, 217, 255, 0.15)',
  },
  optionHovered: {
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
  },
  optionFlag: {
    fontSize: 18,
  },
  optionName: {
    flex: 1,
    fontSize: 14,
    color: colors.textSecondary,
    textAlign: 'right',
  },
  optionNameSelected: {
    color: colors.primary,
  },
})
