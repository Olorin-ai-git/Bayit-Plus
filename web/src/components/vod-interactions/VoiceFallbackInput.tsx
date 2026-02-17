/**
 * VoiceFallbackInput
 *
 * Text input fallback shown when mic permission is denied.
 * Lets the user type a message instead of speaking.
 */

import { useState, useCallback } from 'react'
import { View, Text, TextInput, Pressable, StyleSheet } from 'react-native'
import { Send } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { colors, spacing, borderRadius } from '@olorin/design-tokens'

interface VoiceFallbackInputProps {
  onSend: (text: string) => void
  isDisabled: boolean
}

export function VoiceFallbackInput({ onSend, isDisabled }: VoiceFallbackInputProps) {
  const { t } = useTranslation()
  const [text, setText] = useState('')

  const handleSend = useCallback(() => {
    const trimmed = text.trim()
    if (!trimmed || isDisabled) return
    setText('')
    onSend(trimmed)
  }, [text, isDisabled, onSend])

  return (
    <View style={styles.container}>
      <View style={styles.row}>
        <TextInput
          style={styles.input}
          value={text}
          onChangeText={setText}
          placeholder={t('player.voice.typeInstead')}
          placeholderTextColor={colors.textSecondary}
          editable={!isDisabled}
        />
        <Pressable
          onPress={handleSend}
          style={[styles.sendBtn, (!text.trim() || isDisabled) && styles.disabled]}
          disabled={!text.trim() || isDisabled}
        >
          <Send size={16} color={colors.text} />
        </Pressable>
      </View>
      <Text style={styles.note}>{t('player.voice.micDenied')}</Text>
    </View>
  )
}

const styles = StyleSheet.create({
  container: { gap: spacing[2] },
  row: { flexDirection: 'row', alignItems: 'center', gap: spacing[2] },
  input: {
    flex: 1, height: 36, paddingHorizontal: spacing[3],
    borderRadius: borderRadius.md, backgroundColor: 'rgba(255,255,255,0.08)',
    color: colors.text, fontSize: 14,
  },
  sendBtn: {
    width: 36, height: 36, borderRadius: borderRadius.md,
    backgroundColor: colors.primary.DEFAULT,
    alignItems: 'center', justifyContent: 'center',
  },
  disabled: { opacity: 0.4 },
  note: { fontSize: 11, color: colors.textSecondary, textAlign: 'center' },
})
