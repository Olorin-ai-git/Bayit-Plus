import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
  Animated,
} from 'react-native';
import { useTranslation } from 'react-i18next';
import { colors, spacing, borderRadius } from '../../theme';
import { isTV } from '../../utils/platform';
import { useDirection } from '../../hooks/useDirection';
import { searchService } from '../../services/api';

export interface SearchSuggestionsProps {
  query: string;
  visible: boolean;
  onSuggestionSelect: (suggestion: string) => void;
  maxSuggestions?: number;
  debounceMs?: number;
}

interface Suggestion {
  text: string;
  type?: string;
  highlight?: string;
}

const SuggestionItem: React.FC<{
  suggestion: Suggestion;
  query: string;
  onPress: () => void;
  index: number;
}> = ({ suggestion, query, onPress, index }) => {
  const [isFocused, setIsFocused] = useState(false);
  const scaleAnim = useRef(new Animated.Value(1)).current;

  const handleFocus = () => {
    setIsFocused(true);
    Animated.spring(scaleAnim, {
      toValue: 1.02,
      friction: 5,
      useNativeDriver: true,
    }).start();
  };

  const handleBlur = () => {
    setIsFocused(false);
    Animated.spring(scaleAnim, {
      toValue: 1,
      friction: 5,
      useNativeDriver: true,
    }).start();
  };

  // Highlight matching portion
  const renderHighlightedText = () => {
    const text = suggestion.text;
    const lowerText = text.toLowerCase();
    const lowerQuery = query.toLowerCase();
    const index = lowerText.indexOf(lowerQuery);

    if (index === -1) {
      return <Text style={styles.suggestionText}>{text}</Text>;
    }

    const before = text.substring(0, index);
    const match = text.substring(index, index + query.length);
    const after = text.substring(index + query.length);

    return (
      <Text style={styles.suggestionText}>
        {before}
        <Text style={styles.suggestionHighlight}>{match}</Text>
        {after}
      </Text>
    );
  };

  return (
    <TouchableOpacity
      onPress={onPress}
      onFocus={handleFocus}
      onBlur={handleBlur}
      activeOpacity={0.7}
      // @ts-ignore
      hasTVPreferredFocus={index === 0 && isTV}
    >
      <Animated.View
        style={[
          styles.suggestionItem,
          { transform: [{ scale: scaleAnim }] },
          isFocused && styles.suggestionItemFocused,
        ]}
      >
        <Text style={styles.suggestionIcon}>🔍</Text>
        {renderHighlightedText()}
      </Animated.View>
    </TouchableOpacity>
  );
};

export const SearchSuggestions: React.FC<SearchSuggestionsProps> = ({
  query,
  visible,
  onSuggestionSelect,
  maxSuggestions = 5,
  debounceMs = 300,
}) => {
  const { t } = useTranslation();
  const { textAlign } = useDirection();
  const [suggestions, setSuggestions] = useState<Suggestion[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const debounceTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (!visible || !query || query.length < 2) {
      setSuggestions([]);
      return;
    }

    // Debounce the API call
    if (debounceTimerRef.current) {
      clearTimeout(debounceTimerRef.current);
    }

    debounceTimerRef.current = setTimeout(() => {
      loadSuggestions(query);
    }, debounceMs);

    return () => {
      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current);
      }
    };
  }, [query, visible]);

  const loadSuggestions = async (searchQuery: string) => {
    setIsLoading(true);
    try {
      const response = await (searchService as any).getSuggestions?.(searchQuery);
      if (response && Array.isArray(response.suggestions)) {
        const items = response.suggestions
          .slice(0, maxSuggestions)
          .map((item: any) => ({
            text: typeof item === 'string' ? item : item.text,
            type: item.type,
            highlight: item.highlight,
          }));
        setSuggestions(items);
      } else {
        // Fallback to empty if API not available
        setSuggestions([]);
      }
    } catch (error) {
      console.error('Failed to load suggestions:', error);
      setSuggestions([]);
    } finally {
      setIsLoading(false);
    }
  };

  if (!visible || (!isLoading && suggestions.length === 0)) {
    return null;
  }

  return (
    <View style={styles.container}>
      {isLoading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="small" color={colors.primary} />
        </View>
      ) : (
        suggestions.map((suggestion, index) => (
          <SuggestionItem
            key={`${suggestion.text}-${index}`}
            suggestion={suggestion}
            query={query}
            onPress={() => onSuggestionSelect(suggestion.text)}
            index={index}
          />
        ))
      )}
    </View>
  );
};

/**
 * Hook for debounced search suggestions
 */
export const useSearchSuggestions = (query: string, debounceMs: number = 300) => {
  const [suggestions, setSuggestions] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const debounceTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (!query || query.length < 2) {
      setSuggestions([]);
      return;
    }

    if (debounceTimerRef.current) {
      clearTimeout(debounceTimerRef.current);
    }

    debounceTimerRef.current = setTimeout(async () => {
      setIsLoading(true);
      try {
        const response = await (searchService as any).getSuggestions?.(query);
        if (response && Array.isArray(response.suggestions)) {
          setSuggestions(
            response.suggestions.map((s: any) => (typeof s === 'string' ? s : s.text))
          );
        } else {
          setSuggestions([]);
        }
      } catch (error) {
        console.error('Failed to load suggestions:', error);
        setSuggestions([]);
      } finally {
        setIsLoading(false);
      }
    }, debounceMs);

    return () => {
      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current);
      }
    };
  }, [query, debounceMs]);

  return { suggestions, isLoading };
};

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    top: '100%',
    left: 0,
    right: 0,
    backgroundColor: 'rgba(20, 20, 20, 0.98)',
    borderRadius: borderRadius.lg,
    marginTop: spacing.xs,
    borderWidth: 2,
    borderColor: 'rgba(168, 85, 247, 0.3)',
    maxHeight: isTV ? 400 : 300,
    zIndex: 1000,
    // @ts-ignore - Web CSS property
    backdropFilter: 'blur(20px)',
  },
  loadingContainer: {
    paddingVertical: spacing.lg,
    alignItems: 'center',
  },
  suggestionItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.lg,
    paddingVertical: isTV ? spacing.md : spacing.sm,
    gap: spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255, 255, 255, 0.05)',
  },
  suggestionItemFocused: {
    backgroundColor: 'rgba(168, 85, 247, 0.15)',
  },
  suggestionIcon: {
    fontSize: isTV ? 18 : 16,
    opacity: 0.5,
  },
  suggestionText: {
    fontSize: isTV ? 18 : 16,
    color: colors.text,
    flex: 1,
  },
  suggestionHighlight: {
    color: colors.primary,
    fontWeight: '600',
  },
});

export default SearchSuggestions;
