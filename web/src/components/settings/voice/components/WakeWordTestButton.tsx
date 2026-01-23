/**
 * Wake Word Test Button Component
 * Button to test wake word detection
 */

import { useState } from 'react';
import { Text, Pressable, StyleSheet } from 'react-native';
import { Volume2 } from 'lucide-react';
import { useTranslation } from 'react-i18next';

export function WakeWordTestButton() {
  const { t } = useTranslation();
  const [testing, setTesting] = useState(false);

  const handleTest = () => {
    setTesting(true);
    setTimeout(() => setTesting(false), 3000);
  };

  return (
    <Pressable
      style={[styles.button, testing && styles.buttonTesting]}
      onPress={handleTest}
      disabled={testing}
    >
      <Volume2 size={16} color={testing ? '#A855F7' : '#ffffff'} />
      <Text style={[styles.buttonText, testing && styles.buttonTextTesting]}>
        {testing
          ? t('profile.voice.testingWakeWord', 'Say "Hi Bayit"...')
          : t('profile.voice.testWakeWord', 'Test Wake Word')}
      </Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  button: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 16,
    paddingHorizontal: 24,
    borderRadius: 12,
    marginTop: 16,
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
  },
  buttonTesting: {
    backgroundColor: 'rgba(147, 51, 234, 0.15)',
    borderWidth: 1,
    borderColor: 'rgba(168, 85, 247, 0.4)',
  },
  buttonText: {
    fontSize: 14,
    fontWeight: '500',
    color: '#ffffff',
  },
  buttonTextTesting: {
    color: '#A855F7',
  },
});
