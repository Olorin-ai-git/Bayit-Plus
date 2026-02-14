/**
 * HelpScreenMobile - Help center with searchable FAQ
 *
 * Categories: Account, Playback, Billing, Technical.
 * Search filtering, expandable FAQ items, contact support action.
 */
import React, { useEffect, useState, useCallback } from 'react';
import { View, Text, TextInput, FlatList, Pressable, SafeAreaView, StyleSheet } from 'react-native';
import { useTranslation } from 'react-i18next';
import { useDirection } from '@bayit/shared-hooks';
import { GlassButton } from '@olorin/glass-ui/native';
import { GlassLoadingSpinner } from '@bayit/shared/ui';
import { NativeIcon } from '@olorin/shared-icons/native';
import { supportService } from '@bayit/shared-services/api';
import { colors, spacing, borderRadius, fontSize } from '@olorin/design-tokens';
import logger from '@/utils/logger';

const moduleLogger = logger.scope('HelpScreenMobile');

interface FAQItem { id: string; question: string; answer: string; category: string; }
type HelpCategory = 'all' | 'account' | 'playback' | 'billing' | 'technical';
const CATEGORIES: HelpCategory[] = ['all', 'account', 'playback', 'billing', 'technical'];

export const HelpScreenMobile: React.FC = () => {
  const { t } = useTranslation();
  const { isRTL, textAlign } = useDirection();

  const [faqs, setFaqs] = useState<FAQItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<HelpCategory>('all');
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const loadFAQs = useCallback(async () => {
    setLoading(true);
    try {
      const response = await supportService.getFAQs();
      setFaqs(response?.items || response?.data || []);
    } catch (err) {
      moduleLogger.error('Failed to load FAQs', { error: err });
    } finally { setLoading(false); }
  }, []);

  useEffect(() => { loadFAQs(); }, [loadFAQs]);

  const filteredFAQs = faqs.filter((faq) => {
    const matchesCategory = selectedCategory === 'all' || faq.category === selectedCategory;
    const query = searchQuery.toLowerCase();
    const matchesSearch = query.length === 0 || faq.question.toLowerCase().includes(query) || faq.answer.toLowerCase().includes(query);
    return matchesCategory && matchesSearch;
  });

  const handleContactSupport = useCallback(async () => {
    try { await supportService.openSupportTicket(); moduleLogger.info('Support ticket initiated'); }
    catch (err) { moduleLogger.error('Failed to open support ticket', { error: err }); }
  }, []);

  const toggleExpand = useCallback((id: string) => { setExpandedId((prev) => (prev === id ? null : id)); }, []);

  const renderFAQItem = useCallback(
    ({ item }: { item: FAQItem }) => {
      const isExpanded = expandedId === item.id;
      return (
        <Pressable
          onPress={() => toggleExpand(item.id)}
          style={[styles.faqItem, isExpanded && styles.faqItemExpanded]}
          accessibilityLabel={item.question}
          accessibilityHint={t('help.faqToggleHint')}
          accessibilityRole="button"
          accessibilityState={{ expanded: isExpanded }}
        >
          <View style={[styles.faqHeader, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}>
            <Text style={[styles.faqQuestion, { textAlign, flex: 1 }]}>
              {item.question}
            </Text>
            <NativeIcon
              name={isExpanded ? 'chevronUp' : 'chevronDown'}
              size="sm"
              color={colors.textMuted}
            />
          </View>
          {isExpanded && (
            <Text style={[styles.faqAnswer, { textAlign }]}>{item.answer}</Text>
          )}
        </Pressable>
      );
    },
    [expandedId, isRTL, textAlign, toggleExpand, t],
  );

  if (loading) {
    return (
      <SafeAreaView style={styles.loadingContainer}>
        <GlassLoadingSpinner size="large" />
        <Text style={styles.loadingText}>{t('common.loading')}</Text>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.headerSection}>
        <Text style={[styles.headerTitle, { textAlign }]}>{t('help.title')}</Text>
        <TextInput
          style={[styles.searchInput, { textAlign }]}
          placeholder={t('help.searchPlaceholder')}
          placeholderTextColor={colors.textMuted}
          value={searchQuery}
          onChangeText={setSearchQuery}
          accessibilityLabel={t('help.searchLabel')}
          accessibilityHint={t('help.searchHint')}
          accessibilityRole="search"
        />
        <FlatList
          data={CATEGORIES}
          horizontal
          inverted={isRTL}
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.categoryList}
          keyExtractor={(item) => item}
          renderItem={({ item: cat }) => (
            <Pressable
              onPress={() => setSelectedCategory(cat)}
              style={[styles.categoryPill, selectedCategory === cat && styles.categoryPillActive]}
              accessibilityLabel={t(`help.categories.${cat}`)}
              accessibilityRole="button"
              accessibilityState={{ selected: selectedCategory === cat }}
            >
              <Text style={[styles.categoryText, selectedCategory === cat && styles.categoryTextActive]}>
                {t(`help.categories.${cat}`)}
              </Text>
            </Pressable>
          )}
        />
      </View>
      <FlatList
        data={filteredFAQs}
        renderItem={renderFAQItem}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.faqList}
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <Text style={[styles.emptyText, { textAlign }]}>{t('help.noResults')}</Text>
          </View>
        }
        ListFooterComponent={
          <View style={styles.footerSection}>
            <Text style={[styles.footerText, { textAlign }]}>{t('help.stillNeedHelp')}</Text>
            <GlassButton
              variant="primary"
              onPress={handleContactSupport}
              accessibilityLabel={t('help.contactSupport')}
              accessibilityHint={t('help.contactSupportHint')}
            >
              {t('help.contactSupport')}
            </GlassButton>
          </View>
        }
      />
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  loadingContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: colors.background },
  loadingText: { color: colors.textMuted, fontSize: fontSize.md, marginTop: spacing.md },
  headerSection: { paddingHorizontal: spacing.md, paddingTop: spacing.lg },
  headerTitle: { fontSize: fontSize.xxl, fontWeight: '700', color: colors.text, marginBottom: spacing.md },
  searchInput: {
    backgroundColor: colors.glassMedium, borderRadius: borderRadius.md, paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm, fontSize: fontSize.md, color: colors.text, marginBottom: spacing.sm,
    borderWidth: 1, borderColor: colors.glassBorder,
  },
  categoryList: { gap: spacing.sm, paddingVertical: spacing.sm },
  categoryPill: {
    paddingHorizontal: spacing.md, paddingVertical: spacing.xs, borderRadius: borderRadius.full,
    backgroundColor: colors.glassMedium, borderWidth: 1, borderColor: colors.glassBorder,
  },
  categoryPillActive: { backgroundColor: colors.primary, borderColor: colors.primary },
  categoryText: { fontSize: fontSize.sm, color: colors.textSecondary },
  categoryTextActive: { color: colors.text, fontWeight: '600' },
  faqList: { paddingHorizontal: spacing.md, paddingTop: spacing.sm, paddingBottom: spacing.xxl },
  faqItem: {
    backgroundColor: colors.glassMedium, borderRadius: borderRadius.md, padding: spacing.md,
    marginBottom: spacing.sm, borderWidth: 1, borderColor: colors.glassBorder,
  },
  faqItemExpanded: { borderColor: colors.primary },
  faqHeader: { alignItems: 'center', gap: spacing.sm },
  faqQuestion: { fontSize: fontSize.md, fontWeight: '600', color: colors.text },
  faqAnswer: { fontSize: fontSize.sm, color: colors.textSecondary, marginTop: spacing.sm, lineHeight: fontSize.sm * 1.6 },
  emptyContainer: { paddingVertical: spacing.xxl, alignItems: 'center' },
  emptyText: { fontSize: fontSize.md, color: colors.textMuted },
  footerSection: { paddingVertical: spacing.xl, alignItems: 'center', gap: spacing.md },
  footerText: { fontSize: fontSize.md, color: colors.textSecondary },
});

export default HelpScreenMobile;
