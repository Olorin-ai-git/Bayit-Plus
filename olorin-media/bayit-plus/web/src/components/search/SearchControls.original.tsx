/**
 * SearchControls Component
 *
 * Consolidated search inputs including text input, voice search, and filters
 * Provides a unified search interface with multi-modal input options
 */

import React, { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet } from 'react-native';
import { VoiceSearchButton } from '../../../../shared/components/VoiceSearchButton';
import { useVoiceSearch } from '../../hooks/useVoiceSearch';
import logger from '../../../../shared/utils/logger';

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

const CONTENT_TYPES: { type: ContentType; label: string; emoji: string }[] = [
  { type: 'all', label: 'All', emoji: '🎬' },
  { type: 'vod', label: 'VOD', emoji: '📺' },
  { type: 'live', label: 'Live', emoji: '📡' },
  { type: 'radio', label: 'Radio', emoji: '📻' },
  { type: 'podcast', label: 'Podcast', emoji: '🎙️' },
];

/**
 * Search controls with text input, voice search, and filter options
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
  placeholder = 'Search movies, series, and more...',
}: SearchControlsProps) {
  const [isFocused, setIsFocused] = useState(false);

  // Voice search integration
  const { transcribe, isTranscribing } = useVoiceSearch({
    onTranscriptionComplete: (text) => {
      logger.info('Voice search transcription received', LOG_CONTEXT, {
        textLength: text.length,
      });
      onQueryChange(text);
    },
    defaultLanguage: 'he',
  });

  return (
    <View style={styles.container}>
      {/* Search Input Row */}
      <View style={styles.searchRow}>
        {/* Text Search Input */}
        <View style={[styles.searchInputContainer, isFocused && styles.searchInputFocused]}>
          <Text style={styles.searchIcon}>🔍</Text>
          <TextInput
            style={styles.searchInput}
            value={query}
            onChangeText={onQueryChange}
            onFocus={() => setIsFocused(true)}
            onBlur={() => setIsFocused(false)}
            placeholder={placeholder}
            placeholderTextColor="rgba(255,255,255,0.5)"
            accessibilityLabel="Search input"
            accessibilityHint="Enter keywords to search"
          />
          {query.length > 0 && (
            <TouchableOpacity
              onPress={() => onQueryChange('')}
              style={styles.clearButton}
              accessibilityLabel="Clear search"
            >
              <Text style={styles.clearIcon}>✕</Text>
            </TouchableOpacity>
          )}
        </View>

        {/* Voice Search Button */}
        <VoiceSearchButton onResult={onQueryChange} transcribeAudio={transcribe} />

        {/* LLM Search Button (Premium) */}
        {showLLMSearch && (
          <TouchableOpacity
            style={styles.llmButton}
            onPress={onLLMSearchClick}
            accessibilityLabel="AI-powered search"
            accessibilityHint="Use artificial intelligence for advanced search"
          >
            <Text style={styles.llmIcon}>✨</Text>
          </TouchableOpacity>
        )}

        {/* Advanced Filters Button */}
        {showFiltersButton && (
          <TouchableOpacity
            style={styles.filterButton}
            onPress={onFiltersClick}
            accessibilityLabel="Advanced filters"
            accessibilityHint="Open advanced search filters"
          >
            <Text style={styles.filterIcon}>⚙️</Text>
          </TouchableOpacity>
        )}
      </View>

      {/* Content Type Pills */}
      {onContentTypeChange && (
        <View style={styles.contentTypesRow}>
          {CONTENT_TYPES.map(({ type, label, emoji }) => (
            <TouchableOpacity
              key={type}
              style={[
                styles.contentTypePill,
                contentType === type && styles.contentTypePillActive,
              ]}
              onPress={() => onContentTypeChange(type)}
              accessibilityLabel={`Filter by ${label}`}
              accessibilityRole="button"
              accessibilityState={{ selected: contentType === type }}
            >
              <Text style={styles.contentTypeEmoji}>{emoji}</Text>
              <Text
                style={[
                  styles.contentTypeLabel,
                  contentType === type && styles.contentTypeLabelActive,
                ]}
              >
                {label}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    padding: 16,
    gap: 12,
  },
  searchRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  searchInputContainer: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.1)',
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderWidth: 2,
    borderColor: 'transparent',
  },
  searchInputFocused: {
    borderColor: 'rgba(168,85,247,0.5)',
    backgroundColor: 'rgba(255,255,255,0.15)',
  },
  searchIcon: {
    fontSize: 18,
    marginRight: 8,
  },
  searchInput: {
    flex: 1,
    color: '#fff',
    fontSize: 16,
    outlineStyle: 'none',
  },
  clearButton: {
    padding: 4,
  },
  clearIcon: {
    color: 'rgba(255,255,255,0.6)',
    fontSize: 16,
  },
  llmButton: {
    width: 44,
    height: 44,
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: 12,
    backgroundColor: 'rgba(168,85,247,0.2)',
    borderWidth: 1,
    borderColor: 'rgba(168,85,247,0.5)',
  },
  llmIcon: {
    fontSize: 20,
  },
  filterButton: {
    width: 44,
    height: 44,
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: 12,
    backgroundColor: 'rgba(255,255,255,0.05)',
    borderWidth: 1,
    borderColor: 'transparent',
  },
  filterIcon: {
    fontSize: 20,
  },
  contentTypesRow: {
    flexDirection: 'row',
    gap: 8,
    flexWrap: 'wrap',
  },
  contentTypePill: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    backgroundColor: 'rgba(255,255,255,0.05)',
    borderWidth: 1,
    borderColor: 'transparent',
    gap: 6,
  },
  contentTypePillActive: {
    backgroundColor: 'rgba(168,85,247,0.2)',
    borderColor: 'rgba(168,85,247,0.5)',
  },
  contentTypeEmoji: {
    fontSize: 14,
  },
  contentTypeLabel: {
    color: 'rgba(255,255,255,0.7)',
    fontSize: 14,
    fontWeight: '500',
  },
  contentTypeLabelActive: {
    color: '#fff',
  },
});
