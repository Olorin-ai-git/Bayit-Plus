/**
 * AI Recommendations Input Controls - tvOS Platform
 *
 * Content type selector, context input, and suggestion chips
 * with TV focus navigation for 10-foot UI.
 */

import React from 'react';
import { View, Text, TextInput, ScrollView } from 'react-native';
import { FocusableButton } from '@bayit/tv-components';
import { styles } from './AIRecommendationsScreen.styles';

interface ContentTypeSelectorProps {
  types: string[];
  selected: string;
  onSelect: (type: string) => void;
  t: (key: string) => string;
}

export const ContentTypeSelector: React.FC<ContentTypeSelectorProps> = ({
  types,
  selected,
  onSelect,
  t,
}) => (
  <View style={styles.contentTypeSection}>
    <Text style={styles.sectionLabel}>{t('beta.recommendations.contentTypeLabel')}</Text>
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      contentContainerStyle={styles.contentTypeRow}
    >
      {types.map((type) => (
        <FocusableButton
          key={type}
          onPress={() => onSelect(type)}
          style={[
            styles.contentTypeButton,
            selected === type && styles.contentTypeButtonActive,
          ]}
          focusedStyle={styles.contentTypeButtonFocused}
        >
          <Text
            style={[
              styles.contentTypeText,
              selected === type && styles.contentTypeTextActive,
            ]}
          >
            {t(`beta.recommendations.contentTypes.${type}`)}
          </Text>
        </FocusableButton>
      ))}
    </ScrollView>
  </View>
);

interface ContextInputProps {
  context: string;
  onChangeContext: (text: string) => void;
  suggestions: string[];
  loading: boolean;
  t: (key: string) => string;
}

export const ContextInput: React.FC<ContextInputProps> = ({
  context,
  onChangeContext,
  suggestions,
  loading,
  t,
}) => (
  <View style={styles.contextSection}>
    <Text style={styles.sectionLabel}>{t('beta.recommendations.contextLabel')}</Text>
    <TextInput
      style={styles.contextInput}
      value={context}
      onChangeText={onChangeContext}
      placeholder={t('beta.recommendations.contextPlaceholder')}
      placeholderTextColor="rgba(255, 255, 255, 0.4)"
      returnKeyType="done"
      editable={!loading}
    />
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      contentContainerStyle={styles.suggestionsRow}
    >
      {suggestions.map((suggestion) => (
        <FocusableButton
          key={suggestion}
          onPress={() => onChangeContext(suggestion)}
          style={styles.suggestionChip}
          focusedStyle={styles.suggestionChipFocused}
        >
          <Text style={styles.suggestionChipText}>{suggestion}</Text>
        </FocusableButton>
      ))}
    </ScrollView>
  </View>
);
