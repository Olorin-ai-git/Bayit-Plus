/**
 * SearchBar Component
 *
 * Glass-design search input with autocomplete, voice search, and RTL support.
 * Used across all platforms (web, mobile, TV).
 */

import React, { useState, useRef, useEffect } from 'react';
import { View, TextInput, TouchableOpacity, Text, FlatList } from 'react-native';

interface SearchBarProps {
  value: string;
  onChange: (value: string) => void;
  onSubmit?: () => void;
  onClear?: () => void;
  suggestions?: string[];
  onSuggestionClick?: (suggestion: string) => void;
  placeholder?: string;
  showVoiceButton?: boolean;
  onVoicePress?: () => void;
  autoFocus?: boolean;
  isRTL?: boolean;
  className?: string;
}

export function SearchBar({
  value,
  onChange,
  onSubmit,
  onClear,
  suggestions = [],
  onSuggestionClick,
  placeholder = 'Search...',
  showVoiceButton = true,
  onVoicePress,
  autoFocus = false,
  isRTL = false,
  className = ''
}: SearchBarProps) {
  const [isFocused, setIsFocused] = useState(false);
  const inputRef = useRef<TextInput>(null);

  const handleClear = () => {
    onChange('');
    if (onClear) {
      onClear();
    }
    inputRef.current?.focus();
  };

  const handleSuggestionPress = (suggestion: string) => {
    onChange(suggestion);
    if (onSuggestionClick) {
      onSuggestionClick(suggestion);
    }
    setIsFocused(false);
  };

  const showSuggestions = isFocused && suggestions.length > 0 && value.length >= 2;

  return (
    <View className={`relative ${className}`}>
      {/* Search Input */}
      <View className={`
        flex-row items-center gap-3 px-4 py-3
        bg-black/20 backdrop-blur-xl rounded-2xl
        border border-white/10
        ${isFocused ? 'border-white/30' : 'border-white/10'}
      `}>
        {/* Search Icon */}
        <Text className="text-white/60 text-xl">🔍</Text>

        {/* Input Field */}
        <TextInput
          ref={inputRef}
          value={value}
          onChangeText={onChange}
          onSubmitEditing={onSubmit}
          onFocus={() => setIsFocused(true)}
          onBlur={() => setTimeout(() => setIsFocused(false), 200)}
          placeholder={placeholder}
          placeholderTextColor="rgba(255, 255, 255, 0.4)"
          autoFocus={autoFocus}
          returnKeyType="search"
          className={`
            flex-1 text-white text-base
            ${isRTL ? 'text-right' : 'text-left'}
          `}
          style={{ outlineStyle: 'none', outlineWidth: 0 } as any}
        />

        {/* Clear Button */}
        {value.length > 0 && (
          <TouchableOpacity
            onPress={handleClear}
            className="w-8 h-8 items-center justify-center rounded-full bg-white/10"
            activeOpacity={0.7}
          >
            <Text className="text-white/80 text-lg">✕</Text>
          </TouchableOpacity>
        )}

        {/* Voice Search Button */}
        {showVoiceButton && onVoicePress && (
          <TouchableOpacity
            onPress={onVoicePress}
            className="w-10 h-10 items-center justify-center rounded-full bg-white/10"
            activeOpacity={0.7}
          >
            <Text className="text-xl">🎤</Text>
          </TouchableOpacity>
        )}
      </View>

      {/* Autocomplete Suggestions */}
      {showSuggestions && (
        <View className={`
          absolute top-full left-0 right-0 mt-2 z-50
          bg-black/30 backdrop-blur-xl rounded-2xl
          border border-white/10
          overflow-hidden
        `}>
          <FlatList
            data={suggestions}
            keyExtractor={(item, index) => `suggestion-${index}`}
            renderItem={({ item, index }) => (
              <TouchableOpacity
                onPress={() => handleSuggestionPress(item)}
                className={`
                  px-4 py-3 flex-row items-center gap-3
                  ${index < suggestions.length - 1 ? 'border-b border-white/5' : ''}
                `}
                activeOpacity={0.7}
              >
                <Text className="text-white/60 text-base">🔍</Text>
                <Text className={`
                  flex-1 text-white text-base
                  ${isRTL ? 'text-right' : 'text-left'}
                `}>
                  {item}
                </Text>
              </TouchableOpacity>
            )}
            style={{ maxHeight: 300 }}
          />
        </View>
      )}
    </View>
  );
}

export default SearchBar;
