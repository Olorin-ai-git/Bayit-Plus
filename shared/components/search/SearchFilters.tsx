/**
 * SearchFilters Component
 *
 * Advanced filter panel with Glass design for comprehensive search filtering.
 * Includes genre, year range, rating, subtitle languages, and kids content filters.
 */

import React, { useEffect, useState } from 'react';
import { View, Text, TouchableOpacity, ScrollView } from 'react-native';
import { useTranslation } from 'react-i18next';
import { SearchFilters as SearchFiltersType } from '../../hooks/useSearch';
import { NativeIcon } from '@olorin/shared-icons/native';
import { logger } from '../../utils/logger';

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
  const { t } = useTranslation();
  const [filterOptions, setFilterOptions] = useState<FilterOption | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadFilterOptions();
  }, []);

  const loadFilterOptions = async () => {
    try {
      const { api } = await import('../../services/api/client');
      const data = await api.get('/search/filters/options');
      setFilterOptions(data);
    } catch (error) {
      logger.error('Failed to load filter options', 'SearchFilters', error);
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
        <Text className="text-white text-lg">{t('search.filters.loading')}</Text>
      </View>
    );
  }

  return (
    <View className="flex-1 bg-black/30 backdrop-blur-xl rounded-2xl border border-white/10">
      {/* Header */}
      <View className="flex-row items-center justify-between px-6 py-4 border-b border-white/10">
        <Text className="text-white text-xl font-bold">{t('search.filters.title')}</Text>
        <View className="flex-row items-center gap-3">
          {hasActiveFilters() && (
            <TouchableOpacity
              onPress={clearFilters}
              className="px-4 py-2 bg-red-500/20 rounded-full"
              activeOpacity={0.7}
            >
              <Text className="text-red-400 text-sm font-medium">{t('search.filters.clearAll')}</Text>
            </TouchableOpacity>
          )}
          {onClose && (
            <TouchableOpacity
              onPress={onClose}
              className="w-8 h-8 items-center justify-center bg-white/10 rounded-full"
              activeOpacity={0.7}
            >
              <NativeIcon name="x" size="md" color="#ffffff" />
            </TouchableOpacity>
          )}
        </View>
      </View>

      <ScrollView className="flex-1 px-6 py-4">
        {/* Genres */}
        <FilterSection title={t('search.filters.genres')}>
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
        <FilterSection title={t('search.filters.yearRange')}>
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
                <Text className="text-white/80 text-sm text-center">{t('search.filters.decade1990s')}</Text>
              </TouchableOpacity>
              <TouchableOpacity
                onPress={() => setYearRange(2000, 2009)}
                className="flex-1 px-4 py-2 bg-white/5 rounded-full border border-white/20"
                activeOpacity={0.7}
              >
                <Text className="text-white/80 text-sm text-center">{t('search.filters.decade2000s')}</Text>
              </TouchableOpacity>
              <TouchableOpacity
                onPress={() => setYearRange(2010, 2019)}
                className="flex-1 px-4 py-2 bg-white/5 rounded-full border border-white/20"
                activeOpacity={0.7}
              >
                <Text className="text-white/80 text-sm text-center">{t('search.filters.decade2010s')}</Text>
              </TouchableOpacity>
              <TouchableOpacity
                onPress={() => setYearRange(2020, new Date().getFullYear())}
                className="flex-1 px-4 py-2 bg-white/5 rounded-full border border-white/20"
                activeOpacity={0.7}
              >
                <Text className="text-white/80 text-sm text-center">{t('search.filters.decade2020s')}</Text>
              </TouchableOpacity>
            </View>
          </View>
        </FilterSection>

        {/* Rating */}
        <FilterSection title={t('search.filters.minimumRating')}>
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
                  flex-row items-center gap-1
                `}>
                  {rating}+ <NativeIcon name="star" size="xs" color={filters.ratingMin === rating ? '#fde047' : '#9ca3af'} />
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </FilterSection>

        {/* Subtitle Languages */}
        <FilterSection title={t('search.filters.subtitleLanguages')}>
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
        <FilterSection title={t('search.filters.searchOptions')}>
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
              {t('search.filters.searchInSubtitles')}
            </Text>
            <NativeIcon
              name={filters.searchInSubtitles ? 'check' : 'circle'}
              size="lg"
              color={filters.searchInSubtitles ? '#10b981' : '#9ca3af'}
            />
          </TouchableOpacity>
        </FilterSection>

        {/* Kids Content Filter */}
        <FilterSection title={t('search.filters.contentRating')}>
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
              {filters.isKidsContent === true ? t('search.filters.kidsOnly') : filters.isKidsContent === false ? t('search.filters.excludeKids') : t('search.filters.allContent')}
            </Text>
            <NativeIcon
              name={filters.isKidsContent === true ? 'baby' : filters.isKidsContent === false ? 'slash' : 'globe'}
              size="lg"
              color={filters.isKidsContent === true ? '#ec4899' : filters.isKidsContent === false ? '#6b7280' : '#a855f7'}
            />
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
