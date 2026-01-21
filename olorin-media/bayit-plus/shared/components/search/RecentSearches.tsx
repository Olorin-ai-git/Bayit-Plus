import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useTranslation } from 'react-i18next';
import { colors, spacing, borderRadius } from '../../theme';
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
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={[styles.title, { textAlign }]}>
          {t('search.recent', 'Recent Searches')}
        </Text>
        <TouchableOpacity onPress={handleClear} style={styles.clearButton}>
          <Text style={styles.clearButtonText}>{t('common.clear', 'Clear')}</Text>
        </TouchableOpacity>
      </View>

      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
      >
        {recentSearches.map((query, index) => (
          <TouchableOpacity
            key={`${query}-${index}`}
            onPress={() => onSearchSelect(query)}
            style={styles.searchChip}
          >
            <Text style={styles.searchChipIcon}>🕒</Text>
            <Text style={styles.searchChipText} numberOfLines={1}>
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

const styles = StyleSheet.create({
  container: {
    paddingHorizontal: isTV ? spacing.xxl : spacing.lg,
    paddingBottom: spacing.lg,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.md,
  },
  title: {
    fontSize: isTV ? 20 : 18,
    fontWeight: '600',
    color: colors.text,
  },
  clearButton: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
  },
  clearButtonText: {
    fontSize: isTV ? 14 : 12,
    color: colors.primary,
    fontWeight: '500',
  },
  scrollContent: {
    gap: spacing.sm,
  },
  searchChip: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    borderRadius: borderRadius.xl,
    paddingHorizontal: spacing.md,
    paddingVertical: isTV ? spacing.sm : spacing.xs,
    borderWidth: 1,
    borderColor: 'rgba(168, 85, 247, 0.2)',
    gap: spacing.xs,
    maxWidth: isTV ? 300 : 200,
  },
  searchChipIcon: {
    fontSize: isTV ? 16 : 14,
  },
  searchChipText: {
    fontSize: isTV ? 16 : 14,
    color: colors.text,
    fontWeight: '500',
  },
});

export default RecentSearches;
