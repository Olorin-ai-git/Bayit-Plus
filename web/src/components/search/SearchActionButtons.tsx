/**
 * SearchActionButtons Component
 *
 * Action buttons for voice search, LLM search, and filters
 */

import React from 'react';
import { View, Text, StyleSheet, Platform } from 'react-native';
import { useTranslation } from 'react-i18next';
import { GlassButton } from '@bayit/glass';
import { VoiceSearchButton } from '../../../../shared/components/VoiceSearchButton';
import { colors, borderRadius, spacing } from '../../theme/colors';

// Platform-specific touch target sizes
const TOUCH_TARGET_SIZE = Platform.select({
  ios: 44,
  android: 44,
  default: Platform.isTV ? 80 : 44,
});

interface SearchActionButtonsProps {
  /** Voice search result callback */
  onVoiceResult?: (text: string) => void;
  /** Voice transcribe audio callback */
  transcribeAudio?: (audioBlob: Blob) => Promise<{ text: string }>;
  /** Show LLM search button */
  showLLMSearch?: boolean;
  /** LLM search callback */
  onLLMSearchClick?: () => void;
  /** Show filters button */
  showFilters?: boolean;
  /** Filters callback */
  onFiltersClick?: () => void;
}

/**
 * Action buttons for enhanced search features
 */
export function SearchActionButtons({
  onVoiceResult,
  transcribeAudio,
  showLLMSearch = false,
  onLLMSearchClick,
  showFilters = true,
  onFiltersClick,
}: SearchActionButtonsProps) {
  const { t } = useTranslation('search');
  const [focusedButton, setFocusedButton] = React.useState<string | null>(null);

  return (
    <View style={styles.container}>
      {/* Voice Search Button */}
      {onVoiceResult && (
        <VoiceSearchButton
          onResult={onVoiceResult}
          transcribeAudio={transcribeAudio}
        />
      )}

      {/* LLM Search Button (Premium) */}
      {showLLMSearch && onLLMSearchClick && (
        <GlassButton
          variant="ghost"
          style={[
            styles.button,
            focusedButton === 'llm' && Platform.isTV && styles.buttonFocused,
          ]}
          onPress={onLLMSearchClick}
          onFocus={() => setFocusedButton('llm')}
          onBlur={() => setFocusedButton(null)}
          focusable={Platform.isTV}
          accessibilityLabel={t('controls.llmSearch')}
          accessibilityHint={t('controls.hints.llmSearch')}
        >
          <Text style={styles.buttonIcon}>✨</Text>
        </GlassButton>
      )}

      {/* Filters Button */}
      {showFilters && onFiltersClick && (
        <GlassButton
          variant="ghost"
          style={[
            styles.button,
            focusedButton === 'filters' && Platform.isTV && styles.buttonFocused,
          ]}
          onPress={onFiltersClick}
          onFocus={() => setFocusedButton('filters')}
          onBlur={() => setFocusedButton(null)}
          focusable={Platform.isTV}
          accessibilityLabel={t('controls.filters')}
          accessibilityHint={t('controls.hints.filters')}
        >
          <Text style={styles.buttonIcon}>⚙️</Text>
        </GlassButton>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    gap: 8,
    alignItems: 'center',
  },
  button: {
    minWidth: TOUCH_TARGET_SIZE,
    minHeight: TOUCH_TARGET_SIZE,
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: 12,
    backgroundColor: colors.inputBackground,
    borderWidth: 1,
    borderColor: 'transparent',
  },
  buttonFocused: {
    borderWidth: 2,
    borderColor: colors.primary,
    transform: [{ scale: 1.05 }],
  },
  buttonIcon: {
    fontSize: 20,
  },
});
