/**
 * First-Time Onboarding Modal for Live Dubbing
 *
 * Shows once per premium user on first dubbing attempt.
 * Uses AsyncStorage to remember user choice.
 */

import { useEffect, useState } from 'react'
import { View, Text } from 'react-native'
import { StyleSheet } from 'react-native'
import { GlassModal } from '@bayit/shared/components/ui/GlassModal'
import { GlassButton } from '@bayit/shared/components/ui/GlassButton'
import { useTranslation } from 'react-i18next'
import AsyncStorage from '@react-native-async-storage/async-storage'

const ONBOARDING_KEY = 'dubbing_onboarding_seen'

interface DubbingOnboardingProps {
  visible: boolean
  isPremium: boolean
  onClose: (enableDubbing: boolean) => void
}

export function DubbingOnboarding({
  visible,
  isPremium,
  onClose,
}: DubbingOnboardingProps) {
  const { t } = useTranslation()
  const [showOnboarding, setShowOnboarding] = useState(false)

  useEffect(() => {
    checkOnboardingStatus()
  }, [visible, isPremium])

  async function checkOnboardingStatus() {
    if (!visible || !isPremium) {
      setShowOnboarding(false)
      return
    }

    const seen = await AsyncStorage.getItem(ONBOARDING_KEY)
    setShowOnboarding(!seen)
  }

  async function handleDismiss(enableDubbing: boolean) {
    await AsyncStorage.setItem(ONBOARDING_KEY, 'true')
    setShowOnboarding(false)
    onClose(enableDubbing)
  }

  if (!showOnboarding) return null

  return (
    <GlassModal
      visible={showOnboarding}
      type="info"
      title={t('dubbing.onboarding.title', 'Introducing Live Dubbing')}
      onClose={() => handleDismiss(false)}
    >
      <View style={styles.content}>
        <Text style={styles.description}>
          {t(
            'dubbing.onboarding.description',
            'Experience live content in your language. Our AI translates and plays audio in real-time as you watch.'
          )}
        </Text>

        <View style={styles.features}>
          <View style={styles.feature}>
            <Text style={styles.icon}>🌍</Text>
            <Text style={styles.featureText}>
              {t('dubbing.onboarding.feature1', '7 languages supported')}
            </Text>
          </View>

          <View style={styles.feature}>
            <Text style={styles.icon}>⚡</Text>
            <Text style={styles.featureText}>
              {t('dubbing.onboarding.feature2', 'Real-time processing')}
            </Text>
          </View>

          <View style={styles.feature}>
            <Text style={styles.icon}>🎚️</Text>
            <Text style={styles.featureText}>
              {t('dubbing.onboarding.feature3', 'Adjust audio balance')}
            </Text>
          </View>
        </View>

        <View style={styles.buttons}>
          <GlassButton
            title={t('dubbing.onboarding.tryNow', 'Try Now')}
            variant="primary"
            onPress={() => handleDismiss(true)}
            style={{ flex: 1 }}
          />
          <GlassButton
            title={t('dubbing.onboarding.later', 'Later')}
            variant="ghost"
            onPress={() => handleDismiss(false)}
            style={{ flex: 1 }}
          />
        </View>
      </View>
    </GlassModal>
  )
}

const styles = StyleSheet.create({
  content: {
    gap: 20,
    paddingVertical: 12,
  },
  description: {
    color: '#e5e7eb',
    fontSize: 14,
    lineHeight: 20,
    textAlign: 'center',
  },
  features: {
    gap: 12,
  },
  feature: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingHorizontal: 12,
  },
  icon: {
    fontSize: 24,
  },
  featureText: {
    color: '#d1d5db',
    fontSize: 14,
    flex: 1,
  },
  buttons: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 8,
  },
})
