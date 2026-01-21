/**
 * Wake Word Test Button Component
 * Button to test wake word detection
 */

import { useState } from 'react';
import { Text, Pressable } from 'react-native';
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
      className={`flex-row items-center justify-center gap-2 py-4 px-6 rounded-xl mt-4 ${
        testing
          ? 'bg-purple-900/30 border border-purple-500/40'
          : 'bg-white/5'
      }`}
      onPress={handleTest}
      disabled={testing}
    >
      <Volume2 size={16} color={testing ? '#A855F7' : '#ffffff'} />
      <Text className={`text-sm font-medium ${testing ? 'text-purple-500' : 'text-white'}`}>
        {testing
          ? t('profile.voice.testingWakeWord', 'Say "Hi Bayit"...')
          : t('profile.voice.testWakeWord', 'Test Wake Word')}
      </Text>
    </Pressable>
  );
}
