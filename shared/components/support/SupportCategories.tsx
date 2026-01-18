/**
 * Support Categories
 * Navigation component for documentation categories
 */

import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
} from 'react-native';
import { useTranslation } from 'react-i18next';
import { GlassView } from '../ui';
import { colors, spacing, borderRadius } from '../../theme';
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
        style={[
          styles.categoryCard,
          isFocused && styles.categoryCardFocused,
        ]}
      >
        <Text style={styles.categoryIcon}>{category.icon}</Text>
        <Text style={[styles.categoryTitle, { textAlign }]}>
          {t(category.titleKey, category.id)}
        </Text>
        <Text style={[styles.categoryCount, { textAlign }]}>
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
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={colors.primary} />
        <Text style={[styles.loadingText, { textAlign }]}>
          {t('support.categories.loading', 'Loading documentation...')}
        </Text>
      </View>
    );
  }

  if (error) {
    return (
      <View style={styles.errorContainer}>
        <Text style={styles.errorIcon}>⚠️</Text>
        <Text style={[styles.errorText, { textAlign }]}>{error}</Text>
        <TouchableOpacity style={styles.retryButton} onPress={loadCategories}>
          <Text style={styles.retryButtonText}>
            {t('common.retry', 'Retry')}
          </Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <Text style={[styles.sectionTitle, { textAlign }]}>
        {t('support.categories.title', 'Browse Documentation')}
      </Text>
      <View style={styles.grid}>
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

const styles = StyleSheet.create({
  container: {
    gap: spacing.md,
  },
  sectionTitle: {
    fontSize: isTV ? 20 : 18,
    fontWeight: '600',
    color: colors.text,
    marginBottom: spacing.sm,
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.md,
  },
  categoryCard: {
    width: isTV ? 200 : 160,
    padding: spacing.lg,
    borderRadius: borderRadius.xl,
    alignItems: 'center',
    borderWidth: 2,
    borderColor: 'transparent',
  },
  categoryCardFocused: {
    borderColor: colors.primary,
    backgroundColor: 'rgba(168, 85, 247, 0.15)',
  },
  categoryIcon: {
    fontSize: isTV ? 36 : 28,
    marginBottom: spacing.sm,
  },
  categoryTitle: {
    fontSize: isTV ? 16 : 14,
    fontWeight: '600',
    color: colors.text,
    marginBottom: spacing.xs,
  },
  categoryCount: {
    fontSize: isTV ? 14 : 12,
    color: colors.textSecondary,
  },
  loadingContainer: {
    padding: spacing.xl,
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.md,
  },
  loadingText: {
    fontSize: isTV ? 16 : 14,
    color: colors.textSecondary,
  },
  errorContainer: {
    padding: spacing.xl,
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.md,
  },
  errorIcon: {
    fontSize: isTV ? 48 : 36,
  },
  errorText: {
    fontSize: isTV ? 16 : 14,
    color: colors.error,
  },
  retryButton: {
    backgroundColor: colors.primary,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm,
    borderRadius: borderRadius.lg,
  },
  retryButtonText: {
    fontSize: isTV ? 14 : 12,
    fontWeight: '600',
    color: colors.background,
  },
});

export default SupportCategories;
