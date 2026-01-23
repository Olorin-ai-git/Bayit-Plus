/**
 * Voice Selection Modal for Live Dubbing
 *
 * Allows users to select from available ElevenLabs voices.
 */

import { useState } from 'react'
import { View, Text, ScrollView } from 'react-native'
import { StyleSheet } from 'react-native'
import { GlassModal, GlassButton } from '@bayit/glass'
import { useTranslation } from 'react-i18next'

export interface Voice {
  id: string
  name: string
  description?: string
  language?: string
}

interface VoiceSelectorProps {
  visible: boolean
  voices: Voice[]
  selectedVoiceId?: string
  onSelect: (voiceId: string) => void
  onClose: () => void
}

export function VoiceSelector({
  visible,
  voices,
  selectedVoiceId,
  onSelect,
  onClose,
}: VoiceSelectorProps) {
  const { t } = useTranslation()
  const [loading, setLoading] = useState(false)

  async function handleVoiceSelect(voiceId: string) {
    setLoading(true)
    try {
      onSelect(voiceId)
      onClose()
    } finally {
      setLoading(false)
    }
  }

  return (
    <GlassModal
      visible={visible}
      title={t('dubbing.selectVoice', 'Select Voice')}
      onClose={onClose}
    >
      <ScrollView style={styles.voiceList} scrollEnabled={true}>
        {voices.map((voice) => (
          <GlassButton
            key={voice.id}
            title={voice.name}
            variant={voice.id === selectedVoiceId ? 'primary' : 'ghost'}
            onPress={() => handleVoiceSelect(voice.id)}
            disabled={loading}
            accessibilityLabel={`${voice.name}${
              voice.description ? ` - ${voice.description}` : ''
            }`}
            style={styles.voiceButton}
          />
        ))}
      </ScrollView>

      {voices.length === 0 && (
        <Text style={styles.emptyText}>
          {t('dubbing.noVoicesAvailable', 'No voices available')}
        </Text>
      )}
    </GlassModal>
  )
}

const styles = StyleSheet.create({
  voiceList: {
    maxHeight: 400,
    marginVertical: 12,
  },
  voiceButton: {
    marginBottom: 8,
  },
  emptyText: {
    color: '#9ca3af',
    fontSize: 14,
    textAlign: 'center',
    paddingVertical: 20,
  },
})
