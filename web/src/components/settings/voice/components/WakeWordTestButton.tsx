/**
 * Wake Word Test Button Component
 * Button to test wake word detection
 */

import { useState } from 'react';
import { Text, Pressable, StyleSheet } from 'react-native';
import { Volume2 } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { colors, spacing, borderRadius } from '@bayit/shared/theme';

export function WakeWordTestButton() {
  const { t } = useTranslation();
  const [testing, setTesting] = useState(false);

  const handleTest = () => {
    setTesting(true);
    setTimeout(() => setTesting(false), 3000);
  };

  return (
    <Pressable
      style={[styles.testButton, testing && styles.testButtonActive]}
      onPress={handleTest}
      disabled={testing}
    >
      <Volume2 size={16} color={testing ? colors.primary : colors.text} />
      <Text style={[styles.testButtonText, testing && styles.testButtonTextActive]}>
        {testing
          ? t('profile.voice.testingWakeWord', 'Say "Hi Bayit"...')
          : t('profile.voice.testWakeWord', 'Test Wake Word')}
      </Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  testButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.lg,
    borderRadius: borderRadius.md,
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    marginTop: spacing.md,
  },
  testButtonActive: {
    backgroundColor: 'rgba(107, 33, 168, 0.3)',
    borderWidth: 1,
    borderColor: 'rgba(168, 85, 247, 0.4)',
  },
  testButtonText: {
    fontSize: 14,
    fontWeight: '500',
    color: colors.text,
  },
  testButtonTextActive: {
    color: colors.primary,
  },
});
