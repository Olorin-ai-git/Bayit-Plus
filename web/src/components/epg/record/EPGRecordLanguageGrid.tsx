/**
 * EPGRecordLanguageGrid
 * Reusable language selection grid for recording options
 */

import React from 'react'
import { View, Text, Pressable, StyleSheet } from 'react-native'
import { Check } from 'lucide-react'
import { colors, spacing, borderRadius } from '@olorin/design-tokens'
import type { LanguageOption } from './types'

interface EPGRecordLanguageGridProps {
  languages: LanguageOption[]
  selected: string
  onSelect: (code: string) => void
  label: string
  textAlign: 'left' | 'right'
  keyPrefix?: string
}

export const EPGRecordLanguageGrid: React.FC<EPGRecordLanguageGridProps> = ({
  languages, selected, onSelect, label, textAlign, keyPrefix = '',
}) => (
  <View style={styles.languageSection}>
    <Text style={[styles.languageLabel, { textAlign }]}>{label}</Text>
    <View style={styles.languageGrid}>
      {languages.map((lang) => (
        <Pressable
          key={`${keyPrefix}${lang.code}`}
          style={[styles.languageButton, selected === lang.code && styles.languageButtonSelected]}
          onPress={() => onSelect(lang.code)}
        >
          <Text style={styles.languageFlag}>{lang.flag}</Text>
          <Text style={[styles.languageText, selected === lang.code && styles.languageTextSelected]}>
            {lang.label}
          </Text>
          {selected === lang.code && <Check size={16} color={colors.primary} />}
        </Pressable>
      ))}
    </View>
  </View>
)

const styles = StyleSheet.create({
  languageSection: { marginTop: spacing.sm },
  languageLabel: {
    fontSize: 14, fontWeight: '500', color: colors.textMuted, marginBottom: spacing.sm,
  },
  languageGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
  languageButton: {
    flexDirection: 'row', alignItems: 'center', gap: spacing.sm,
    paddingHorizontal: spacing.md, paddingVertical: spacing.sm,
    borderRadius: borderRadius.md, backgroundColor: 'rgba(255, 255, 255, 0.05)',
    borderWidth: 1, borderColor: 'rgba(255, 255, 255, 0.1)', minWidth: '45%', flex: 1,
  },
  languageButtonSelected: {
    backgroundColor: 'rgba(168, 85, 247, 0.15)', borderColor: colors.primary.DEFAULT,
  },
  languageFlag: { fontSize: 18 },
  languageText: { fontSize: 14, fontWeight: '500', color: colors.textMuted, flex: 1 },
  languageTextSelected: { color: colors.text },
})
