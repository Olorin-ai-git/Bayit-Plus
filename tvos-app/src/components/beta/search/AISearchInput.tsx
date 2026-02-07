/**
 * AISearchInput - Text input with voice search button for tvOS
 *
 * Provides a search field and voice activation button,
 * optimized for Siri Remote navigation with focus states.
 */

import React, { useState, useCallback, useRef, useEffect } from 'react';
import {
  View,
  TextInput,
  Pressable,
  StyleSheet,
  ActivityIndicator,
} from 'react-native';
import { useTranslation } from 'react-i18next';
import { GlassView } from '@bayit/shared';
import { colors, spacing } from '@olorin/design-tokens';
import { Text } from 'react-native';

interface AISearchInputProps {
  query: string;
  onQueryChange: (q: string) => void;
  onVoiceSearch: () => void;
  isListening: boolean;
}

const INPUT_DEBOUNCE_MS = 300;

export const AISearchInput: React.FC<AISearchInputProps> = ({
  query,
  onQueryChange,
  onVoiceSearch,
  isListening,
}) => {
  const { t } = useTranslation();
  const [localQuery, setLocalQuery] = useState(query);
  const [inputFocused, setInputFocused] = useState(false);
  const [voiceFocused, setVoiceFocused] = useState(false);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Sync external query changes (e.g. from voice transcript)
  useEffect(() => {
    setLocalQuery(query);
  }, [query]);

  const handleTextChange = useCallback(
    (text: string) => {
      setLocalQuery(text);

      if (debounceRef.current) {
        clearTimeout(debounceRef.current);
      }

      debounceRef.current = setTimeout(() => {
        onQueryChange(text);
      }, INPUT_DEBOUNCE_MS);
    },
    [onQueryChange],
  );

  // Cleanup debounce timer
  useEffect(() => {
    return () => {
      if (debounceRef.current) {
        clearTimeout(debounceRef.current);
      }
    };
  }, []);

  return (
    <GlassView style={styles.container}>
      <View style={styles.inputRow}>
        <TextInput
          style={[styles.input, inputFocused && styles.inputFocused]}
          value={localQuery}
          onChangeText={handleTextChange}
          placeholder={t('tvos.aiSearch.placeholder')}
          placeholderTextColor="rgba(255, 255, 255, 0.4)"
          onFocus={() => setInputFocused(true)}
          onBlur={() => setInputFocused(false)}
          returnKeyType="search"
          autoCorrect={false}
          accessible
          accessibilityLabel={t('tvos.aiSearch.inputLabel')}
        />
        <Pressable
          onPress={onVoiceSearch}
          onFocus={() => setVoiceFocused(true)}
          onBlur={() => setVoiceFocused(false)}
          style={[
            styles.voiceButton,
            voiceFocused && styles.voiceButtonFocused,
            isListening && styles.voiceButtonActive,
          ]}
          accessible
          accessibilityRole="button"
          accessibilityLabel={t('tvos.aiSearch.voiceButton')}
          accessibilityState={{ selected: isListening }}
        >
          {isListening ? (
            <ActivityIndicator size="small" color={colors.white} />
          ) : (
            <Text style={styles.voiceIcon}>M</Text>
          )}
        </Pressable>
      </View>
    </GlassView>
  );
};

const styles = StyleSheet.create({
  container: {
    marginHorizontal: spacing[8],
    marginVertical: spacing[4],
    borderRadius: 16,
    overflow: 'hidden',
  },
  inputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing[4],
    paddingVertical: spacing[2],
    gap: spacing[3],
  },
  input: {
    flex: 1,
    color: colors.white,
    fontSize: 28,
    paddingVertical: spacing[4],
    paddingHorizontal: spacing[4],
    borderRadius: 12,
    borderWidth: 2,
    borderColor: 'rgba(255, 255, 255, 0.15)',
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
  },
  inputFocused: {
    borderColor: '#A855F7',
    backgroundColor: 'rgba(168, 85, 247, 0.1)',
  },
  voiceButton: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: 'transparent',
  },
  voiceButtonFocused: {
    borderColor: '#A855F7',
    backgroundColor: 'rgba(168, 85, 247, 0.2)',
    transform: [{ scale: 1.08 }],
  },
  voiceButtonActive: {
    backgroundColor: 'rgba(239, 68, 68, 0.3)',
    borderColor: '#EF4444',
  },
  voiceIcon: {
    color: colors.white,
    fontSize: 28,
    fontWeight: 'bold',
  },
});
