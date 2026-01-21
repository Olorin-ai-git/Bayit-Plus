import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  ScrollView,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useTranslation } from 'react-i18next';
import { isTV } from '../../utils/platform';
import { useDirection } from '../../hooks/useDirection';

export interface RecentSearchesProps {
  onSearchSelect: (query: string) => void;
  onClear?: () => void;
  maxItems?: number;
}

const STORAGE_KEY = 'bayit_recent_searches';
const MAX_RECENT_SEARCHES = 10;

export const RecentSearches: React.FC<RecentSearchesProps> = ({
  onSearchSelect,
  onClear,
  maxItems = 5,
}) => {
  const { t } = useTranslation();
  const { textAlign } = useDirection();
  const [recentSearches, setRecentSearches] = useState<string[]>([]);

  useEffect(() => {
    loadRecentSearches();
  }, []);

  const loadRecentSearches = async () => {
    try {
      const saved = await AsyncStorage.getItem(STORAGE_KEY);
      if (saved) {
        const searches = JSON.parse(saved);
        setRecentSearches(searches.slice(0, maxItems));
      }
    } catch (error) {
      console.error('Failed to load recent searches:', error);
    }
  };

  const handleClear = async () => {
    try {
      await AsyncStorage.removeItem(STORAGE_KEY);
      setRecentSearches([]);
      onClear?.();
    } catch (error) {
      console.error('Failed to clear recent searches:', error);
    }
  };

  if (recentSearches.length === 0) {
    return null;
  }

  return (
    <View className={isTV ? 'px-8 pb-4' : 'px-4 pb-4'}>
      <View className="flex-row justify-between items-center mb-3">
        <Text className={`text-white font-semibold ${isTV ? 'text-xl' : 'text-lg'}`} style={{ textAlign }}>
          {t('search.recent', 'Recent Searches')}
        </Text>
        <TouchableOpacity onPress={handleClear} className="px-3 py-1">
          <Text className={`text-purple-500 font-medium ${isTV ? 'text-sm' : 'text-xs'}`}>{t('common.clear', 'Clear')}</Text>
        </TouchableOpacity>
      </View>

      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerClassName="gap-2"
      >
        {recentSearches.map((query, index) => (
          <TouchableOpacity
            key={`${query}-${index}`}
            onPress={() => onSearchSelect(query)}
            className={`flex-row items-center bg-white/5 rounded-2xl border border-purple-500/20 gap-1 ${
              isTV ? 'px-3 py-2 max-w-[300px]' : 'px-3 py-1 max-w-[200px]'
            }`}
          >
            <Text className={isTV ? 'text-base' : 'text-sm'}>🕒</Text>
            <Text className={`text-white font-medium ${isTV ? 'text-base' : 'text-sm'}`} numberOfLines={1}>
              {query}
            </Text>
          </TouchableOpacity>
        ))}
      </ScrollView>
    </View>
  );
};

/**
 * Hook to manage recent searches
 */
export const useRecentSearches = () => {
  const [recentSearches, setRecentSearches] = useState<string[]>([]);

  useEffect(() => {
    loadSearches();
  }, []);

  const loadSearches = async () => {
    try {
      const saved = await AsyncStorage.getItem(STORAGE_KEY);
      if (saved) {
        setRecentSearches(JSON.parse(saved));
      }
    } catch (error) {
      console.error('Failed to load recent searches:', error);
    }
  };

  const addSearch = async (query: string) => {
    if (!query.trim()) return;

    try {
      // Remove duplicates and add to front
      const updated = [
        query,
        ...recentSearches.filter((s) => s.toLowerCase() !== query.toLowerCase()),
      ].slice(0, MAX_RECENT_SEARCHES);

      await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
      setRecentSearches(updated);
    } catch (error) {
      console.error('Failed to add recent search:', error);
    }
  };

  const clearSearches = async () => {
    try {
      await AsyncStorage.removeItem(STORAGE_KEY);
      setRecentSearches([]);
    } catch (error) {
      console.error('Failed to clear recent searches:', error);
    }
  };

  return {
    recentSearches,
    addSearch,
    clearSearches,
    loadSearches,
  };
};

export default RecentSearches;
