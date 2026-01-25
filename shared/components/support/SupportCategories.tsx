/**
 * Support Categories
 * Navigation component for documentation categories
 */

import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  ActivityIndicator,
} from 'react-native';
import { useTranslation } from 'react-i18next';
import { GlassView } from '../ui';
import { colors, spacing, borderRadius } from '@olorin/design-tokens';
import { useDirection } from '../../hooks/useDirection';
import { useSupportStore, DocCategory } from '../../stores/supportStore';
import { isTV } from '../../utils/platform';
import { supportConfig } from '../../config/supportConfig';

interface CategoryCardProps {
  category: DocCategory;
  onPress: () => void;
}

const CategoryCard: React.FC<CategoryCardProps> = ({ category, onPress }) => {
  const { t } = useTranslation();
  const { textAlign } = useDirection();
  const [isFocused, setIsFocused] = useState(false);

  return (
    <TouchableOpacity
      onPress={onPress}
      onFocus={() => setIsFocused(true)}
      onBlur={() => setIsFocused(false)}
      activeOpacity={0.8}
    >
      <GlassView
        className={`${isTV ? 'w-[200px]' : 'w-40'} p-4 md:p-6 rounded-2xl items-center border-2 ${isFocused ? 'border-purple-500 bg-purple-500/15' : 'border-transparent'}`}
      >
        <Text className={`${isTV ? 'text-4xl' : 'text-3xl'} mb-2`}>{category.icon}</Text>
        <Text className={`${isTV ? 'text-base' : 'text-sm'} font-semibold text-white mb-1`} style={{ textAlign }}>
          {t(category.titleKey, category.id)}
        </Text>
        <Text className={`${isTV ? 'text-sm' : 'text-xs'} text-gray-400`} style={{ textAlign }}>
          {t('support.categories.articleCount', {
            count: category.articles.length,
            defaultValue: '{{count}} articles',
          })}
        </Text>
      </GlassView>
    </TouchableOpacity>
  );
};

export const SupportCategories: React.FC = () => {
  const { t, i18n } = useTranslation();
  const { textAlign } = useDirection();
  const { docCategories, setDocCategories, setCurrentDocPath } = useSupportStore();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadCategories();
  }, [i18n.language]);

  const loadCategories = async () => {
    try {
      setLoading(true);
      setError(null);

      // Get current language
      const language = i18n.language || supportConfig.documentation.defaultLanguage;

      // Fetch documentation manifest from API
      const apiUrl = typeof window !== 'undefined' && window.location.hostname === 'localhost'
        ? 'http://localhost:8000/api/v1/support/docs'
        : '/api/v1/support/docs';

      const response = await fetch(`${apiUrl}?language=${language}`);

      if (!response.ok) {
        throw new Error('Failed to load documentation');
      }

      const data = await response.json();

      // Transform API response to DocCategory format
      const categories: DocCategory[] = (data.categories || []).map((cat: { id: string; title: string; title_key: string; icon: string }) => ({
        id: cat.id,
        titleKey: cat.title_key,
        icon: cat.icon || '📄',
        articles: (data.articles || []).filter((a: { category: string }) => a.category === cat.id).map((a: { id: string; slug: string; title_key: string; language: string }) => ({
          id: a.id,
          slug: a.slug,
          titleKey: a.title_key,
          category: cat.id,
          language: a.language,
        })),
      }));

      setDocCategories(categories);
    } catch (err) {
      console.error('[SupportCategories] Error loading categories:', err);
      setError(t('support.categories.loadError', 'Failed to load categories'));

      // Set default categories for fallback
      setDocCategories([
        {
          id: 'getting-started',
          titleKey: 'support.categories.gettingStarted',
          icon: '🚀',
          articles: [],
        },
        {
          id: 'features',
          titleKey: 'support.categories.features',
          icon: '✨',
          articles: [],
        },
        {
          id: 'troubleshooting',
          titleKey: 'support.categories.troubleshooting',
          icon: '🔧',
          articles: [],
        },
        {
          id: 'account',
          titleKey: 'support.categories.account',
          icon: '👤',
          articles: [],
        },
      ]);
    } finally {
      setLoading(false);
    }
  };

  const handleCategoryPress = (category: DocCategory) => {
    // If category has articles, show the first one
    if (category.articles.length > 0) {
      setCurrentDocPath(category.articles[0].slug);
    }
  };

  if (loading) {
    return (
      <View className="p-8 md:p-16 items-center justify-center gap-3 md:gap-4">
        <ActivityIndicator size="large" color={colors.primary} />
        <Text className={`${isTV ? 'text-base' : 'text-sm'} text-gray-400`} style={{ textAlign }}>
          {t('support.categories.loading', 'Loading documentation...')}
        </Text>
      </View>
    );
  }

  if (error) {
    return (
      <View className="p-8 md:p-16 items-center justify-center gap-3 md:gap-4">
        <Text className={`${isTV ? 'text-5xl' : 'text-4xl'}`}>⚠️</Text>
        <Text className={`${isTV ? 'text-base' : 'text-sm'} text-red-500`} style={{ textAlign }}>{error}</Text>
        <TouchableOpacity className="bg-purple-500 px-4 md:px-6 py-2 md:py-3 rounded-lg" onPress={loadCategories}>
          <Text className={`${isTV ? 'text-sm' : 'text-xs'} font-semibold text-black`}>
            {t('common.retry', 'Retry')}
          </Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <View className="gap-3 md:gap-4">
      <Text className={`${isTV ? 'text-xl' : 'text-lg'} font-semibold text-white mb-2`} style={{ textAlign }}>
        {t('support.categories.title', 'Browse Documentation')}
      </Text>
      <View className="flex-row flex-wrap gap-3 md:gap-4">
        {docCategories.map((category) => (
          <CategoryCard
            key={category.id}
            category={category}
            onPress={() => handleCategoryPress(category)}
          />
        ))}
      </View>
    </View>
  );
};

export default SupportCategories;
