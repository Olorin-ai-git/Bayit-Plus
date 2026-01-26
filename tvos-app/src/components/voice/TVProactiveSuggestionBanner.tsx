/**
 * TV Proactive Suggestion Banner Component
 * Top banner with dismissible voice command suggestions (3 commands)
 */

import React, { useState } from 'react';
import {
  View,
  Text,
  Pressable,
  ScrollView,
  StyleSheet,
  Animated,
} from 'react-native';
import { useTranslation } from 'react-i18next';

interface Suggestion {
  id: string;
  text: string;
  icon: string;
}

interface TVProactiveSuggestionBannerProps {
  suggestions?: Suggestion[];
  onSuggestionPress?: (suggestionId: string) => void;
  onDismiss?: () => void;
  visible?: boolean;
}

const DEFAULT_SUGGESTIONS: Suggestion[] = [
  { id: 'search', text: 'voice.search_suggestion', icon: '🔍' },
  { id: 'play', text: 'voice.play_suggestion', icon: '▶️' },
  { id: 'settings', text: 'voice.settings_suggestion', icon: '⚙️' },
];

export const TVProactiveSuggestionBanner: React.FC<TVProactiveSuggestionBannerProps> = ({
  suggestions = DEFAULT_SUGGESTIONS,
  onSuggestionPress,
  onDismiss,
  visible = true,
}) => {
  const { t } = useTranslation();
  const [focusedId, setFocusedId] = useState<string | null>(null);
  const heightAnim = React.useRef(new Animated.Value(visible ? 1 : 0)).current;

  React.useEffect(() => {
    if (visible) {
      Animated.timing(heightAnim, {
        toValue: 1,
        duration: 300,
        useNativeDriver: false,
      }).start();
    } else {
      Animated.timing(heightAnim, {
        toValue: 0,
        duration: 300,
        useNativeDriver: false,
      }).start();
    }
  }, [visible, heightAnim]);

  if (!visible) {
    return null;
  }

  const height = heightAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [0, 120],
  });

  return (
    <Animated.View style={[styles.container, { height }]}>
      <View style={styles.content}>
        <Text style={styles.title}>
          {t('voice.try_saying', 'Try saying:')}
        </Text>

        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          style={styles.suggestionsScroll}
        >
          <View style={styles.suggestionsContainer}>
            {suggestions.map((suggestion) => {
              const isFocused = focusedId === suggestion.id;

              return (
                <Pressable
                  key={suggestion.id}
                  onPress={() => onSuggestionPress?.(suggestion.id)}
                  onFocus={() => setFocusedId(suggestion.id)}
                  onBlur={() => setFocusedId(null)}
                  accessible
                  accessibilityLabel={t(suggestion.text as any, suggestion.text)}
                  style={[
                    styles.suggestionButton,
                    {
                      backgroundColor: isFocused
                        ? 'rgba(168, 85, 247, 0.4)'
                        : 'rgba(168, 85, 247, 0.2)',
                      borderColor: isFocused ? '#A855F7' : 'transparent',
                      transform: [{ scale: isFocused ? 1.05 : 1 }],
                    },
                  ]}
                >
                  <Text style={styles.suggestionIcon}>
                    {suggestion.icon}
                  </Text>
                  <Text style={styles.suggestionText}>
                    {t(suggestion.text as any, suggestion.text)}
                  </Text>
                </Pressable>
              );
            })}
          </View>
        </ScrollView>

        <Pressable onPress={onDismiss} accessible accessibilityLabel={t('voice.dismiss', 'Dismiss')} style={[
            styles.dismissButton,
            {
              borderColor: focusedId === 'dismiss' ? '#A855F7' : 'transparent',
              transform: [{ scale: focusedId === 'dismiss' ? 1.05 : 1 }],
            },
          ]}
          onFocus={() => setFocusedId('dismiss')}
          onBlur={() => setFocusedId(null)}
        >
          <Text style={styles.dismissText}>✕</Text>
        </Pressable>
      </View>
    </Animated.View>
  );
};

const styles = StyleSheet.create({
  container: {
    width: '100%',
    backgroundColor: 'rgba(0, 0, 0, 0.4)',
    borderBottomWidth: 2,
    borderBottomColor: 'rgba(168, 85, 247, 0.3)',
    overflow: 'hidden',
  },
  content: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 60,
    paddingVertical: 12,
    gap: 20,
  },
  title: {
    fontSize: 24,
    fontWeight: '600',
    color: '#A855F7',
    minWidth: 180,
  },
  suggestionsScroll: {
    flex: 1,
  },
  suggestionsContainer: {
    flexDirection: 'row',
    gap: 12,
    paddingRight: 20,
  },
  suggestionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 8,
    borderWidth: 2,
    gap: 8,
    minHeight: 60,
  },
  suggestionIcon: {
    fontSize: 24,
  },
  suggestionText: {
    fontSize: 18,
    fontWeight: '500',
    color: '#FFFFFF',
  },
  dismissButton: {
    width: 60,
    height: 60,
    borderRadius: 8,
    borderWidth: 2,
    backgroundColor: 'rgba(168, 85, 247, 0.2)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  dismissText: {
    fontSize: 28,
    fontWeight: '700',
    color: '#FFFFFF',
  },
});

export default TVProactiveSuggestionBanner;
