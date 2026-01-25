/**
 * SearchControls Component (Refactored)
 *
 * Consolidated search interface composed from modular sub-components:
 * - SearchInput: Text input with clear button
 * - SearchActionButtons: Voice, LLM, and filters buttons
 * - ContentTypePills: Content type filter pills
 */

import React from 'react';
import { View, StyleSheet } from 'react-native';
import { SearchInput } from './SearchInput';
import { SearchActionButtons } from './SearchActionButtons';
import { ContentTypePills } from './ContentTypePills';
import { useVoiceSearch } from '../../hooks/useVoiceSearch';
import logger from '../../../../shared/utils/logger';
import { colors, borderRadius, spacing } from '@olorin/design-tokens';

const LOG_CONTEXT = 'SearchControls';

export type ContentType = 'all' | 'vod' | 'live' | 'radio' | 'podcast';

interface SearchControlsProps {
  /** Current search query */
  query: string;
  /** Callback when query changes */
  onQueryChange: (query: string) => void;
  /** Currently selected content type */
  contentType?: ContentType;
  /** Callback when content type changes */
  onContentTypeChange?: (type: ContentType) => void;
  /** Show advanced filters button */
  showFiltersButton?: boolean;
  /** Callback when filters button clicked */
  onFiltersClick?: () => void;
  /** Show LLM search button (premium feature) */
  showLLMSearch?: boolean;
  /** Callback when LLM search clicked */
  onLLMSearchClick?: () => void;
  /** Placeholder text for search input */
  placeholder?: string;
}

/**
 * Main search controls with text input, voice search, and filters
 */
export function SearchControls({
  query,
  onQueryChange,
  contentType = 'all',
  onContentTypeChange,
  showFiltersButton = true,
  onFiltersClick,
  showLLMSearch = false,
  onLLMSearchClick,
  placeholder,
}: SearchControlsProps) {
  // Voice search integration
  // Note: VoiceSearchButton will call onVoiceResult with transcribed text
  // We provide transcribeAudio for custom backend integration
  const { transcribe } = useVoiceSearch({
    onTranscriptionComplete: () => {
      // No-op: onVoiceResult callback will handle setting query
    },
    defaultLanguage: 'he',
  });

  return (
    <View style={styles.container}>
      {/* Search Input Row */}
      <View style={styles.searchRow}>
        <SearchInput
          value={query}
          onChangeText={onQueryChange}
          placeholder={placeholder}
        />

        <SearchActionButtons
          onVoiceResult={(text) => onQueryChange(text)}
          transcribeAudio={transcribe}
          showLLMSearch={showLLMSearch}
          onLLMSearchClick={onLLMSearchClick}
          showFilters={showFiltersButton}
          onFiltersClick={onFiltersClick}
        />
      </View>

      {/* Content Type Pills */}
      {onContentTypeChange && (
        <ContentTypePills
          selected={contentType}
          onChange={onContentTypeChange}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    gap: 0,
  },
  searchRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    gap: 8,
  },
});
