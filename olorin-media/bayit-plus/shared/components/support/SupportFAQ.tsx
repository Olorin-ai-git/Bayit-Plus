/**
 * Support FAQ
 * Enhanced FAQ component with categories and feedback
 */

import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  Animated,
  ActivityIndicator,
} from 'react-native';
import { useTranslation } from 'react-i18next';
import { GlassView } from '../ui';
import { colors, spacing, borderRadius } from '@olorin/design-tokens';
import { useDirection } from '../../hooks/useDirection';
import { isTV } from '../../utils/platform';
import { supportConfig } from '../../config/supportConfig';

interface FAQItem {
  id: string;
  question: string;
  answer: string;
  category: string;
  views: number;
  helpful_yes: number;
  helpful_no: number;
}

interface AccordionItemProps {
  item: FAQItem;
  isExpanded: boolean;
  onToggle: () => void;
  onFeedback: (helpful: boolean) => void;
}

const AccordionItem: React.FC<AccordionItemProps> = ({
  item,
  isExpanded,
  onToggle,
  onFeedback,
}) => {
  const { textAlign } = useDirection();
  const [isFocused, setIsFocused] = useState(false);
  const [feedbackGiven, setFeedbackGiven] = useState(false);
  const heightAnim = React.useRef(new Animated.Value(0)).current;

  React.useEffect(() => {
    Animated.timing(heightAnim, {
      toValue: isExpanded ? 1 : 0,
      duration: 200,
      useNativeDriver: false,
    }).start();
  }, [isExpanded]);

  const handleFeedback = (helpful: boolean) => {
    if (!feedbackGiven) {
      setFeedbackGiven(true);
      onFeedback(helpful);
    }
  };

  return (
    <TouchableOpacity
      onPress={onToggle}
      onFocus={() => setIsFocused(true)}
      onBlur={() => setIsFocused(false)}
      activeOpacity={0.8}
    >
      <View
        style={[
          styles.accordionItem,
          isFocused && styles.accordionItemFocused,
          isExpanded && styles.accordionItemExpanded,
        ]}
      >
        <View style={styles.accordionHeader}>
          <Text style={[styles.accordionQuestion, { textAlign }]}>{item.question}</Text>
          <Text style={styles.accordionIcon}>{isExpanded ? '−' : '+'}</Text>
        </View>
        {isExpanded && (
          <Animated.View
            style={[
              styles.accordionContent,
              {
                opacity: heightAnim,
              },
            ]}
          >
            <Text style={[styles.accordionAnswer, { textAlign }]}>{item.answer}</Text>

            {/* Feedback */}
            {!feedbackGiven ? (
              <View style={styles.feedbackContainer}>
                <Text style={[styles.feedbackLabel, { textAlign }]}>
                  Was this helpful?
                </Text>
                <View style={styles.feedbackButtons}>
                  <TouchableOpacity
                    style={styles.feedbackButton}
                    onPress={() => handleFeedback(true)}
                  >
                    <Text style={styles.feedbackButtonText}>👍 Yes</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={styles.feedbackButton}
                    onPress={() => handleFeedback(false)}
                  >
                    <Text style={styles.feedbackButtonText}>👎 No</Text>
                  </TouchableOpacity>
                </View>
              </View>
            ) : (
              <View style={styles.feedbackThanks}>
                <Text style={styles.feedbackThanksText}>
                  Thanks for your feedback!
                </Text>
              </View>
            )}
          </Animated.View>
        )}
      </View>
    </TouchableOpacity>
  );
};

const categories = [
  { id: 'all', labelKey: 'support.faq.categories.all', icon: '📋' },
  { id: 'general', labelKey: 'support.faq.categories.general', icon: '❓' },
  { id: 'billing', labelKey: 'support.faq.categories.billing', icon: '💳' },
  { id: 'technical', labelKey: 'support.faq.categories.technical', icon: '🔧' },
  { id: 'features', labelKey: 'support.faq.categories.features', icon: '✨' },
];

export const SupportFAQ: React.FC = () => {
  const { t, i18n } = useTranslation();
  const { textAlign } = useDirection();

  const [faqItems, setFaqItems] = useState<FAQItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [focusedCategory, setFocusedCategory] = useState<string | null>(null);

  useEffect(() => {
    loadFAQ();
  }, [i18n.language]);

  const loadFAQ = async () => {
    try {
      setLoading(true);
      setError(null);

      const language = i18n.language || supportConfig.documentation.defaultLanguage;
      const apiUrl = typeof window !== 'undefined' && window.location.hostname === 'localhost'
        ? 'http://localhost:8000/api/v1/support'
        : '/api/v1/support';

      const response = await fetch(`${apiUrl}/faq?language=${language}`);

      if (!response.ok) {
        throw new Error('Failed to load FAQ');
      }

      const data = await response.json();
      setFaqItems(data.items || []);
    } catch (err) {
      console.error('[SupportFAQ] Error loading FAQ:', err);
      setError(t('support.faq.loadError', 'Failed to load FAQ'));

      // Set default FAQ items as fallback
      setFaqItems([
        {
          id: '1',
          question: t('help.faq.whatIsBayit.question', 'What is Bayit+?'),
          answer: t('help.faq.whatIsBayit.answer', 'Bayit+ is a streaming platform offering Israeli TV, movies, radio, and podcasts.'),
          category: 'general',
          views: 0,
          helpful_yes: 0,
          helpful_no: 0,
        },
        {
          id: '2',
          question: t('help.faq.howToWatch.question', 'How do I watch content?'),
          answer: t('help.faq.howToWatch.answer', 'Browse our library, select what you want to watch, and press play.'),
          category: 'general',
          views: 0,
          helpful_yes: 0,
          helpful_no: 0,
        },
        {
          id: '3',
          question: t('help.faq.subscription.question', 'What subscription plans are available?'),
          answer: t('help.faq.subscription.answer', 'We offer Free, Premium, and Family plans.'),
          category: 'billing',
          views: 0,
          helpful_yes: 0,
          helpful_no: 0,
        },
      ]);
    } finally {
      setLoading(false);
    }
  };

  const handleFeedback = async (faqId: string, helpful: boolean) => {
    try {
      const apiUrl = typeof window !== 'undefined' && window.location.hostname === 'localhost'
        ? 'http://localhost:8000/api/v1/support'
        : '/api/v1/support';

      await fetch(`${apiUrl}/faq/${faqId}/feedback`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ faq_id: faqId, helpful }),
      });
    } catch (err) {
      console.error('[SupportFAQ] Error submitting feedback:', err);
    }
  };

  const filteredFAQ = faqItems.filter(
    (item) => selectedCategory === 'all' || item.category === selectedCategory
  );

  const toggleItem = (id: string) => {
    setExpandedId(expandedId === id ? null : id);

    // Record view
    if (expandedId !== id) {
      const apiUrl = typeof window !== 'undefined' && window.location.hostname === 'localhost'
        ? 'http://localhost:8000/api/v1/support'
        : '/api/v1/support';

      fetch(`${apiUrl}/faq/${id}/view`, { method: 'POST' }).catch(() => {});
    }
  };

  if (loading) {
    return (
      <View className="flex-1 items-center justify-center gap-4">
        <ActivityIndicator size="large" color={colors.primary} />
        <Text style={{ textAlign }} className={`${isTV ? 'text-base' : 'text-sm'} text-[#9ca3af]`}>
          {t('support.faq.loading', 'Loading FAQ...')}
        </Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* Category Filter */}
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        style={styles.categoriesScroll}
        contentContainerStyle={styles.categoriesContent}
      >
        {categories.map((cat) => (
          <TouchableOpacity
            key={cat.id}
            onPress={() => setSelectedCategory(cat.id)}
            onFocus={() => setFocusedCategory(cat.id)}
            onBlur={() => setFocusedCategory(null)}
            style={[
              styles.categoryButton,
              selectedCategory === cat.id && styles.categoryButtonActive,
              focusedCategory === cat.id && styles.categoryButtonFocused,
            ]}
          >
            <Text style={styles.categoryIcon}>{cat.icon}</Text>
            <Text
              style={[
                styles.categoryText,
                selectedCategory === cat.id && styles.categoryTextActive,
              ]}
            >
              {t(cat.labelKey, cat.id)}
            </Text>
          </TouchableOpacity>
        ))}
      </ScrollView>

      {/* FAQ Section */}
      <View style={styles.faqSection}>
        <Text style={[styles.sectionTitle, { textAlign }]}>
          {t('support.faq.title', 'Frequently Asked Questions')}
        </Text>

        {error && (
          <View style={styles.errorContainer}>
            <Text style={[styles.errorText, { textAlign }]}>{error}</Text>
          </View>
        )}

        {filteredFAQ.map((item) => (
          <AccordionItem
            key={item.id}
            item={item}
            isExpanded={expandedId === item.id}
            onToggle={() => toggleItem(item.id)}
            onFeedback={(helpful) => handleFeedback(item.id, helpful)}
          />
        ))}

        {filteredFAQ.length === 0 && !error && (
          <View style={styles.emptyContainer}>
            <Text style={[styles.emptyText, { textAlign }]}>
              {t('support.faq.empty', 'No FAQ items in this category')}
            </Text>
          </View>
        )}
      </View>
    </View>
  );
};



export default SupportFAQ;
