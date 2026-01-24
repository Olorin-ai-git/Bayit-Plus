/**
 * SearchActionButtons Component
 *
 * Action buttons for voice search, LLM search, and filters
 */

import React from 'react';
import { View, TouchableOpacity, Text, StyleSheet, Platform } from 'react-native';
import { useTranslation } from 'react-i18next';
import { VoiceSearchButton } from '../../../../shared/components/VoiceSearchButton';

// Platform-specific touch target sizes
const TOUCH_TARGET_SIZE = Platform.select({
  ios: 44,
  android: 44,
  default: Platform.isTV ? 80 : 44,
});

interface SearchActionButtonsProps {
  /** Voice search callback */
  onVoiceTranscribe?: (audioBlob: Blob, language?: string) => void;
  /** Is voice transcribing */
  isTranscribing?: boolean;
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
  onVoiceTranscribe,
  isTranscribing = false,
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
      {onVoiceTranscribe && (
        <VoiceSearchButton
          onTranscribe={onVoiceTranscribe}
          size={36}
          disabled={isTranscribing}
        />
      )}

      {/* LLM Search Button (Premium) */}
      {showLLMSearch && onLLMSearchClick && (
        <TouchableOpacity
          style={[
            styles.button,
            focusedButton === 'llm' && Platform.isTV && styles.buttonFocused,
          ]}
          onPress={onLLMSearchClick}
          onFocus={() => setFocusedButton('llm')}
          onBlur={() => setFocusedButton(null)}
          focusable={Platform.isTV}
          accessibilityLabel={t('controls.llmSearch')}
          accessibilityHint="AI-powered contextual search"
        >
          <Text style={styles.buttonIcon}>✨</Text>
        </TouchableOpacity>
      )}

      {/* Filters Button */}
      {showFilters && onFiltersClick && (
        <TouchableOpacity
          style={[
            styles.button,
            focusedButton === 'filters' && Platform.isTV && styles.buttonFocused,
          ]}
          onPress={onFiltersClick}
          onFocus={() => setFocusedButton('filters')}
          onBlur={() => setFocusedButton(null)}
          focusable={Platform.isTV}
          accessibilityLabel={t('controls.filters')}
          accessibilityHint="Advanced search filters"
        >
          <Text style={styles.buttonIcon}>⚙️</Text>
        </TouchableOpacity>
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
    backgroundColor: 'rgba(255,255,255,0.1)',
    borderWidth: 1,
    borderColor: 'transparent',
    transition: 'background-color 0.2s',
  },
  buttonFocused: {
    borderWidth: 2,
    borderColor: 'rgba(168,85,247,1)',
    transform: [{ scale: 1.05 }],
  },
  buttonIcon: {
    fontSize: 20,
  },
});
