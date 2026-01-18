/**
 * Help Screen
 * Legacy export - redirects to SupportScreen
 * This file is kept for backwards compatibility
 */

import SupportScreen from './SupportScreen';

// Re-export SupportScreen as default for backwards compatibility
export default SupportScreen;

// Legacy implementation below (kept for reference, not used)
// =============================================================

import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Animated,
} from 'react-native';
import { useTranslation } from 'react-i18next';
import { GlassView } from '../components/ui';
import { useDirection } from '../hooks/useDirection';
import { colors, spacing, borderRadius } from '../theme';
import { isTV } from '../utils/platform';

interface FAQItem {
  id: string;
  questionKey: string;
  answerKey: string;
  category: string;
}

const faqItems: FAQItem[] = [
  {
    id: '1',
    questionKey: 'help.faq.whatIsBayit.question',
    answerKey: 'help.faq.whatIsBayit.answer',
    category: 'general',
  },
  {
    id: '2',
    questionKey: 'help.faq.howToWatch.question',
    answerKey: 'help.faq.howToWatch.answer',
    category: 'general',
  },
  {
    id: '3',
    questionKey: 'help.faq.subscription.question',
    answerKey: 'help.faq.subscription.answer',
    category: 'billing',
  },
  {
    id: '4',
    questionKey: 'help.faq.cancelSubscription.question',
    answerKey: 'help.faq.cancelSubscription.answer',
    category: 'billing',
  },
  {
    id: '5',
    questionKey: 'help.faq.devices.question',
    answerKey: 'help.faq.devices.answer',
    category: 'technical',
  },
  {
    id: '6',
    questionKey: 'help.faq.downloads.question',
    answerKey: 'help.faq.downloads.answer',
    category: 'technical',
  },
  {
    id: '7',
    questionKey: 'help.faq.voiceControl.question',
    answerKey: 'help.faq.voiceControl.answer',
    category: 'features',
  },
  {
    id: '8',
    questionKey: 'help.faq.recordings.question',
    answerKey: 'help.faq.recordings.answer',
    category: 'features',
  },
];

interface AccordionItemProps {
  question: string;
  answer: string;
  isExpanded: boolean;
  onToggle: () => void;
}

const AccordionItem: React.FC<AccordionItemProps> = ({
  question,
  answer,
  isExpanded,
  onToggle,
}) => {
  const { isRTL, textAlign } = useDirection();
  const [isFocused, setIsFocused] = useState(false);
  const heightAnim = React.useRef(new Animated.Value(0)).current;

  React.useEffect(() => {
    Animated.timing(heightAnim, {
      toValue: isExpanded ? 1 : 0,
      duration: 200,
      useNativeDriver: false,
    }).start();
  }, [isExpanded]);

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
          <Text style={[styles.accordionQuestion, { textAlign }]}>{question}</Text>
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
            <Text style={[styles.accordionAnswer, { textAlign }]}>{answer}</Text>
          </Animated.View>
        )}
      </View>
    </TouchableOpacity>
  );
};

export default function HelpScreen() {
  const { t } = useTranslation();
  const { isRTL, textAlign, flexDirection } = useDirection();
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [focusedCategory, setFocusedCategory] = useState<string | null>(null);

  const categories = [
    { id: 'all', labelKey: 'help.categories.all', icon: '📋' },
    { id: 'general', labelKey: 'help.categories.general', icon: '❓' },
    { id: 'billing', labelKey: 'help.categories.billing', icon: '💳' },
    { id: 'technical', labelKey: 'help.categories.technical', icon: '🔧' },
    { id: 'features', labelKey: 'help.categories.features', icon: '✨' },
  ];

  const filteredFAQ = faqItems.filter(
    (item) => selectedCategory === 'all' || item.category === selectedCategory
  );

  const toggleItem = (id: string) => {
    setExpandedId(expandedId === id ? null : id);
  };

  // Fallback translations
  const getFallbackTranslation = (key: string): string => {
    const fallbacks: Record<string, string> = {
      'help.faq.whatIsBayit.question': 'What is Bayit+?',
      'help.faq.whatIsBayit.answer':
        'Bayit+ is a streaming platform offering Israeli TV, movies, radio, and podcasts. Enjoy live TV, on-demand content, and exclusive features.',
      'help.faq.howToWatch.question': 'How do I watch content?',
      'help.faq.howToWatch.answer':
        'Browse our library, select what you want to watch, and press play. Use the remote to navigate and the play/pause button to control playback.',
      'help.faq.subscription.question': 'What subscription plans are available?',
      'help.faq.subscription.answer':
        'We offer Free, Premium, and Family plans. Premium includes ad-free viewing, DVR, and catch-up TV. Family adds multiple profiles.',
      'help.faq.cancelSubscription.question': 'How do I cancel my subscription?',
      'help.faq.cancelSubscription.answer':
        'Go to Settings > Subscription and select Cancel Subscription. Your access continues until the end of your billing period.',
      'help.faq.devices.question': 'What devices are supported?',
      'help.faq.devices.answer':
        'Bayit+ works on Apple TV, Android TV, iOS, Android, and web browsers. You can stream on up to 4 devices simultaneously.',
      'help.faq.downloads.question': 'Can I download content offline?',
      'help.faq.downloads.answer':
        'Premium subscribers can download select content for offline viewing on mobile devices. Downloads are available for 30 days.',
      'help.faq.voiceControl.question': 'How does voice control work?',
      'help.faq.voiceControl.answer':
        'Say "Hey Bayit" to activate voice control, then speak your command. You can search, navigate, and control playback with your voice.',
      'help.faq.recordings.question': 'How do I record live TV?',
      'help.faq.recordings.answer':
        'Premium subscribers can record live TV from the EPG. Select a program and tap Record. Recordings are stored in the cloud for 30 days.',
      'help.categories.all': 'All Topics',
      'help.categories.general': 'General',
      'help.categories.billing': 'Billing',
      'help.categories.technical': 'Technical',
      'help.categories.features': 'Features',
    };
    const translated = t(key);
    return translated === key ? fallbacks[key] || key : translated;
  };

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      {/* Header */}
      <View style={[styles.header, { flexDirection }]}>
        <View style={styles.headerIcon}>
          <Text style={styles.headerIconText}>❓</Text>
        </View>
        <View>
          <Text style={[styles.title, { textAlign }]}>{t('help.title', 'Help Center')}</Text>
          <Text style={[styles.subtitle, { textAlign }]}>
            {t('help.subtitle', 'Find answers to common questions')}
          </Text>
        </View>
      </View>

      {/* TV Remote Guide */}
      {isTV && (
        <GlassView style={styles.remoteGuide}>
          <Text style={[styles.sectionTitle, { textAlign }]}>
            {t('help.remoteGuide', 'Remote Control Guide')}
          </Text>
          <View style={styles.remoteControls}>
            <View style={styles.remoteRow}>
              <View style={styles.remoteKey}>
                <Text style={styles.remoteKeyText}>◀ ▶ ▲ ▼</Text>
              </View>
              <Text style={styles.remoteLabel}>{t('help.remote.navigate', 'Navigate')}</Text>
            </View>
            <View style={styles.remoteRow}>
              <View style={styles.remoteKey}>
                <Text style={styles.remoteKeyText}>Select</Text>
              </View>
              <Text style={styles.remoteLabel}>{t('help.remote.select', 'Select / Play')}</Text>
            </View>
            <View style={styles.remoteRow}>
              <View style={styles.remoteKey}>
                <Text style={styles.remoteKeyText}>Menu</Text>
              </View>
              <Text style={styles.remoteLabel}>{t('help.remote.back', 'Go Back')}</Text>
            </View>
            <View style={styles.remoteRow}>
              <View style={styles.remoteKey}>
                <Text style={styles.remoteKeyText}>▶⏸</Text>
              </View>
              <Text style={styles.remoteLabel}>{t('help.remote.playPause', 'Play / Pause')}</Text>
            </View>
            <View style={styles.remoteRow}>
              <View style={styles.remoteKey}>
                <Text style={styles.remoteKeyText}>🎤</Text>
              </View>
              <Text style={styles.remoteLabel}>{t('help.remote.voice', 'Voice Control')}</Text>
            </View>
          </View>
        </GlassView>
      )}

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
              {getFallbackTranslation(cat.labelKey)}
            </Text>
          </TouchableOpacity>
        ))}
      </ScrollView>

      {/* FAQ Section */}
      <View style={styles.faqSection}>
        <Text style={[styles.sectionTitle, { textAlign }]}>
          {t('help.faq.title', 'Frequently Asked Questions')}
        </Text>
        {filteredFAQ.map((item) => (
          <AccordionItem
            key={item.id}
            question={getFallbackTranslation(item.questionKey)}
            answer={getFallbackTranslation(item.answerKey)}
            isExpanded={expandedId === item.id}
            onToggle={() => toggleItem(item.id)}
          />
        ))}
      </View>

      {/* Contact Support */}
      <GlassView style={styles.contactSection}>
        <Text style={[styles.sectionTitle, { textAlign }]}>
          {t('help.contact.title', 'Need More Help?')}
        </Text>
        <Text style={[styles.contactText, { textAlign }]}>
          {t('help.contact.description', "Can't find what you're looking for? Our support team is here to help.")}
        </Text>
        <View style={styles.contactButtons}>
          <TouchableOpacity style={styles.contactButton}>
            <Text style={styles.contactButtonIcon}>📧</Text>
            <Text style={styles.contactButtonText}>{t('help.contact.email', 'Email Support')}</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.contactButton}>
            <Text style={styles.contactButtonIcon}>💬</Text>
            <Text style={styles.contactButtonText}>{t('help.contact.chat', 'Live Chat')}</Text>
          </TouchableOpacity>
        </View>
      </GlassView>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  content: {
    padding: isTV ? spacing.xl : spacing.lg,
    paddingBottom: spacing.xl * 2,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    marginBottom: spacing.xl,
  },
  headerIcon: {
    width: isTV ? 64 : 48,
    height: isTV ? 64 : 48,
    borderRadius: isTV ? 32 : 24,
    backgroundColor: 'rgba(168, 85, 247, 0.2)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerIconText: {
    fontSize: isTV ? 32 : 24,
  },
  title: {
    fontSize: isTV ? 36 : 28,
    fontWeight: 'bold',
    color: colors.text,
  },
  subtitle: {
    fontSize: isTV ? 18 : 14,
    color: colors.textSecondary,
    marginTop: 2,
  },
  remoteGuide: {
    padding: spacing.lg,
    marginBottom: spacing.lg,
    borderRadius: borderRadius.xl,
  },
  remoteControls: {
    gap: spacing.md,
  },
  remoteRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.lg,
  },
  remoteKey: {
    width: 80,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    borderRadius: borderRadius.md,
    alignItems: 'center',
  },
  remoteKeyText: {
    fontSize: isTV ? 16 : 14,
    fontWeight: '600',
    color: colors.text,
  },
  remoteLabel: {
    fontSize: isTV ? 16 : 14,
    color: colors.textSecondary,
  },
  categoriesScroll: {
    marginBottom: spacing.lg,
  },
  categoriesContent: {
    gap: spacing.sm,
    paddingBottom: spacing.sm,
  },
  categoryButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm,
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    borderRadius: borderRadius.full,
    gap: spacing.sm,
    borderWidth: 2,
    borderColor: 'transparent',
  },
  categoryButtonActive: {
    backgroundColor: 'rgba(168, 85, 247, 0.2)',
  },
  categoryButtonFocused: {
    borderColor: colors.primary,
  },
  categoryIcon: {
    fontSize: isTV ? 20 : 16,
  },
  categoryText: {
    fontSize: isTV ? 16 : 14,
    color: colors.textSecondary,
  },
  categoryTextActive: {
    color: colors.primary,
    fontWeight: '600',
  },
  faqSection: {
    marginBottom: spacing.lg,
  },
  sectionTitle: {
    fontSize: isTV ? 20 : 18,
    fontWeight: '600',
    color: colors.text,
    marginBottom: spacing.md,
  },
  accordionItem: {
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    borderRadius: borderRadius.lg,
    marginBottom: spacing.sm,
    overflow: 'hidden',
    borderWidth: 2,
    borderColor: 'transparent',
  },
  accordionItemFocused: {
    borderColor: colors.primary,
  },
  accordionItemExpanded: {
    backgroundColor: 'rgba(168, 85, 247, 0.1)',
  },
  accordionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: spacing.md,
  },
  accordionQuestion: {
    flex: 1,
    fontSize: isTV ? 18 : 16,
    fontWeight: '500',
    color: colors.text,
    paddingRight: spacing.md,
  },
  accordionIcon: {
    fontSize: isTV ? 24 : 20,
    color: colors.primary,
    fontWeight: 'bold',
  },
  accordionContent: {
    paddingHorizontal: spacing.md,
    paddingBottom: spacing.md,
  },
  accordionAnswer: {
    fontSize: isTV ? 16 : 14,
    color: colors.textSecondary,
    lineHeight: isTV ? 26 : 22,
  },
  contactSection: {
    padding: spacing.lg,
    borderRadius: borderRadius.xl,
  },
  contactText: {
    fontSize: isTV ? 16 : 14,
    color: colors.textSecondary,
    marginBottom: spacing.lg,
  },
  contactButtons: {
    flexDirection: 'row',
    gap: spacing.md,
  },
  contactButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
    paddingVertical: spacing.md,
    backgroundColor: 'rgba(168, 85, 247, 0.2)',
    borderRadius: borderRadius.lg,
  },
  contactButtonIcon: {
    fontSize: isTV ? 24 : 20,
  },
  contactButtonText: {
    fontSize: isTV ? 16 : 14,
    fontWeight: '500',
    color: colors.primary,
  },
});
