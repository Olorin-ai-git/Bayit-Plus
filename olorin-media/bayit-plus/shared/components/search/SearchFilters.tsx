/**
 * SearchFilters Component
 *
 * Advanced filter panel with Glass design for comprehensive search filtering.
 * Includes genre, year range, rating, subtitle languages, and kids content filters.
 */

import React, { useEffect, useState } from 'react';
import { View, Text, TouchableOpacity, ScrollView } from 'react-native';
import { SearchFilters as SearchFiltersType } from '../../hooks/useSearch';

interface FilterOption {
  genres: string[];
  year_range: { min: number; max: number };
  subtitle_languages: string[];
  content_types: string[];
  subscription_tiers: string[];
}

interface SearchFiltersProps {
  filters: SearchFiltersType;
  onFiltersChange: (filters: SearchFiltersType) => void;
  onClose?: () => void;
}

export function SearchFilters({ filters, onFiltersChange, onClose }: SearchFiltersProps) {
  const [filterOptions, setFilterOptions] = useState<FilterOption | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadFilterOptions();
  }, []);

  const loadFilterOptions = async () => {
    try {
      const baseUrl = process.env.NEXT_PUBLIC_API_URL || 'https://api.bayit.tv/api/v1';
      const response = await fetch(`${baseUrl}/search/filters/options`);
      const data = await response.json();
      setFilterOptions(data);
    } catch (error) {
      console.error('Failed to load filter options:', error);
    } finally {
      setLoading(false);
    }
  };

  const toggleGenre = (genre: string) => {
    const current = filters.genres || [];
    const updated = current.includes(genre)
      ? current.filter(g => g !== genre)
      : [...current, genre];
    onFiltersChange({ ...filters, genres: updated.length > 0 ? updated : undefined });
  };

  const toggleSubtitleLanguage = (lang: string) => {
    const current = filters.subtitleLanguages || [];
    const updated = current.includes(lang)
      ? current.filter(l => l !== lang)
      : [...current, lang];
    onFiltersChange({ ...filters, subtitleLanguages: updated.length > 0 ? updated : undefined });
  };

  const setYearRange = (min: number, max: number) => {
    onFiltersChange({
      ...filters,
      yearMin: min === filterOptions?.year_range.min ? undefined : min,
      yearMax: max === filterOptions?.year_range.max ? undefined : max
    });
  };

  const setRatingMin = (rating: number | undefined) => {
    onFiltersChange({ ...filters, ratingMin: rating });
  };

  const toggleSearchInSubtitles = () => {
    onFiltersChange({ ...filters, searchInSubtitles: !filters.searchInSubtitles });
  };

  const toggleKidsContent = () => {
    onFiltersChange({
      ...filters,
      isKidsContent: filters.isKidsContent === undefined ? true : filters.isKidsContent ? false : undefined
    });
  };

  const clearFilters = () => {
    onFiltersChange({ contentTypes: ['vod'] });
  };

  const hasActiveFilters = () => {
    return filters.genres?.length ||
      filters.yearMin !== undefined ||
      filters.yearMax !== undefined ||
      filters.ratingMin !== undefined ||
      filters.subtitleLanguages?.length ||
      filters.searchInSubtitles ||
      filters.isKidsContent !== undefined;
  };

  if (loading) {
    return (
      <View className="flex-1 items-center justify-center bg-black/30 backdrop-blur-xl rounded-2xl p-6">
        <Text className="text-white text-lg">Loading filters...</Text>
      </View>
    );
  }

  return (
    <View className="flex-1 bg-black/30 backdrop-blur-xl rounded-2xl border border-white/10">
      {/* Header */}
      <View className="flex-row items-center justify-between px-6 py-4 border-b border-white/10">
        <Text className="text-white text-xl font-bold">Advanced Filters</Text>
        <View className="flex-row items-center gap-3">
          {hasActiveFilters() && (
            <TouchableOpacity
              onPress={clearFilters}
              className="px-4 py-2 bg-red-500/20 rounded-full"
              activeOpacity={0.7}
            >
              <Text className="text-red-400 text-sm font-medium">Clear All</Text>
            </TouchableOpacity>
          )}
          {onClose && (
            <TouchableOpacity
              onPress={onClose}
              className="w-8 h-8 items-center justify-center bg-white/10 rounded-full"
              activeOpacity={0.7}
            >
              <Text className="text-white text-lg">✕</Text>
            </TouchableOpacity>
          )}
        </View>
      </View>

      <ScrollView className="flex-1 px-6 py-4">
        {/* Genres */}
        <FilterSection title="Genres">
          <View className="flex-row flex-wrap gap-2">
            {filterOptions?.genres.map((genre) => (
              <TouchableOpacity
                key={genre}
                onPress={() => toggleGenre(genre)}
                className={`
                  px-4 py-2 rounded-full border
                  ${filters.genres?.includes(genre)
                    ? 'bg-blue-500/30 border-blue-400'
                    : 'bg-white/5 border-white/20'}
                `}
                activeOpacity={0.7}
              >
                <Text className={`
                  text-sm font-medium
                  ${filters.genres?.includes(genre) ? 'text-blue-300' : 'text-white/80'}
                `}>
                  {genre}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </FilterSection>

        {/* Year Range */}
        <FilterSection title="Year Range">
          <View className="gap-4">
            <View className="flex-row items-center justify-between">
              <Text className="text-white/60 text-sm">
                {filters.yearMin || filterOptions?.year_range.min || 1900} - {filters.yearMax || filterOptions?.year_range.max || new Date().getFullYear()}
              </Text>
            </View>
            <View className="flex-row gap-3">
              <TouchableOpacity
                onPress={() => setYearRange(1990, 1999)}
                className="flex-1 px-4 py-2 bg-white/5 rounded-full border border-white/20"
                activeOpacity={0.7}
              >
                <Text className="text-white/80 text-sm text-center">1990s</Text>
              </TouchableOpacity>
              <TouchableOpacity
                onPress={() => setYearRange(2000, 2009)}
                className="flex-1 px-4 py-2 bg-white/5 rounded-full border border-white/20"
                activeOpacity={0.7}
              >
                <Text className="text-white/80 text-sm text-center">2000s</Text>
              </TouchableOpacity>
              <TouchableOpacity
                onPress={() => setYearRange(2010, 2019)}
                className="flex-1 px-4 py-2 bg-white/5 rounded-full border border-white/20"
                activeOpacity={0.7}
              >
                <Text className="text-white/80 text-sm text-center">2010s</Text>
              </TouchableOpacity>
              <TouchableOpacity
                onPress={() => setYearRange(2020, new Date().getFullYear())}
                className="flex-1 px-4 py-2 bg-white/5 rounded-full border border-white/20"
                activeOpacity={0.7}
              >
                <Text className="text-white/80 text-sm text-center">2020s</Text>
              </TouchableOpacity>
            </View>
          </View>
        </FilterSection>

        {/* Rating */}
        <FilterSection title="Minimum Rating">
          <View className="flex-row gap-2">
            {[7, 8, 9].map((rating) => (
              <TouchableOpacity
                key={rating}
                onPress={() => setRatingMin(filters.ratingMin === rating ? undefined : rating)}
                className={`
                  flex-1 px-4 py-3 rounded-xl border
                  ${filters.ratingMin === rating
                    ? 'bg-yellow-500/30 border-yellow-400'
                    : 'bg-white/5 border-white/20'}
                `}
                activeOpacity={0.7}
              >
                <Text className={`
                  text-center font-medium
                  ${filters.ratingMin === rating ? 'text-yellow-300' : 'text-white/80'}
                `}>
                  {rating}+ ⭐
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </FilterSection>

        {/* Subtitle Languages */}
        <FilterSection title="Subtitle Languages">
          <View className="flex-row flex-wrap gap-2">
            {filterOptions?.subtitle_languages.map((lang) => (
              <TouchableOpacity
                key={lang}
                onPress={() => toggleSubtitleLanguage(lang)}
                className={`
                  px-4 py-2 rounded-full border
                  ${filters.subtitleLanguages?.includes(lang)
                    ? 'bg-purple-500/30 border-purple-400'
                    : 'bg-white/5 border-white/20'}
                `}
                activeOpacity={0.7}
              >
                <Text className={`
                  text-sm font-medium
                  ${filters.subtitleLanguages?.includes(lang) ? 'text-purple-300' : 'text-white/80'}
                `}>
                  {getLanguageName(lang)}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </FilterSection>

        {/* Search in Subtitles Toggle */}
        <FilterSection title="Search Options">
          <TouchableOpacity
            onPress={toggleSearchInSubtitles}
            className={`
              flex-row items-center justify-between px-4 py-3 rounded-xl border
              ${filters.searchInSubtitles
                ? 'bg-green-500/30 border-green-400'
                : 'bg-white/5 border-white/20'}
            `}
            activeOpacity={0.7}
          >
            <Text className={`
              font-medium
              ${filters.searchInSubtitles ? 'text-green-300' : 'text-white/80'}
            `}>
              Search in subtitle text (dialogue)
            </Text>
            <Text className="text-xl">{filters.searchInSubtitles ? '✓' : '○'}</Text>
          </TouchableOpacity>
        </FilterSection>

        {/* Kids Content Filter */}
        <FilterSection title="Content Rating">
          <TouchableOpacity
            onPress={toggleKidsContent}
            className={`
              flex-row items-center justify-between px-4 py-3 rounded-xl border
              ${filters.isKidsContent === true
                ? 'bg-pink-500/30 border-pink-400'
                : filters.isKidsContent === false
                ? 'bg-gray-500/30 border-gray-400'
                : 'bg-white/5 border-white/20'}
            `}
            activeOpacity={0.7}
          >
            <Text className={`
              font-medium
              ${filters.isKidsContent === true
                ? 'text-pink-300'
                : filters.isKidsContent === false
                ? 'text-gray-300'
                : 'text-white/80'}
            `}>
              {filters.isKidsContent === true ? 'Kids content only' : filters.isKidsContent === false ? 'Exclude kids content' : 'All content'}
            </Text>
            <Text className="text-xl">
              {filters.isKidsContent === true ? '👶' : filters.isKidsContent === false ? '🚫' : '🌍'}
            </Text>
          </TouchableOpacity>
        </FilterSection>
      </ScrollView>
    </View>
  );
}

function FilterSection({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <View className="mb-6">
      <Text className="text-white text-base font-semibold mb-3">{title}</Text>
      {children}
    </View>
  );
}

function getLanguageName(code: string): string {
  const names: Record<string, string> = {
    'he': 'עברית',
    'en': 'English',
    'ar': 'العربية',
    'es': 'Español',
    'ru': 'Русский',
    'fr': 'Français',
    'de': 'Deutsch',
    'yi': 'ייִדיש',
  };
  return names[code] || code.toUpperCase();
}

export default SearchFilters;
