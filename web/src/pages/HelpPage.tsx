import { View, Text, StyleSheet, ScrollView, Pressable } from 'react-native';
import { useTranslation } from 'react-i18next';
import { useDirection } from '@/hooks/useDirection';
import { colors, spacing, borderRadius } from '@bayit/shared/theme';
import { GlassView } from '@bayit/shared/ui';
import { HelpCircle, Mail, Phone, MessageCircle, ChevronDown, ChevronUp } from 'lucide-react';
import { useState } from 'react';

interface FAQItem {
  questionKey: string;
  answerKey: string;
}

const faqItems: FAQItem[] = [
  { questionKey: 'help.faq.q1', answerKey: 'help.faq.a1' },
  { questionKey: 'help.faq.q2', answerKey: 'help.faq.a2' },
  { questionKey: 'help.faq.q3', answerKey: 'help.faq.a3' },
  { questionKey: 'help.faq.q4', answerKey: 'help.faq.a4' },
];

export default function HelpPage() {
  const { t } = useTranslation();
  const { isRTL, textAlign, flexDirection } = useDirection();
  const [expandedFaq, setExpandedFaq] = useState<number | null>(null);

  const toggleFaq = (index: number) => {
    setExpandedFaq(expandedFaq === index ? null : index);
  };

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <Text style={[styles.pageTitle, { textAlign }]}>{t('nav.help')}</Text>
      <Text style={[styles.subtitle, { textAlign }]}>{t('help.subtitle', 'How can we help you?')}</Text>

      {/* Contact Options */}
      <View style={[styles.contactGrid, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}>
        <GlassView style={styles.contactCard}>
          <Mail size={32} color={colors.primary} />
          <Text style={[styles.contactTitle, { textAlign }]}>{t('help.email', 'Email Support')}</Text>
          <Text style={[styles.contactInfo, { textAlign }]}>support@bayitplus.com</Text>
        </GlassView>

        <GlassView style={styles.contactCard}>
          <Phone size={32} color={colors.primary} />
          <Text style={[styles.contactTitle, { textAlign }]}>{t('help.phone', 'Phone Support')}</Text>
          <Text style={[styles.contactInfo, { textAlign }]}>+972-3-XXX-XXXX</Text>
        </GlassView>

        <GlassView style={styles.contactCard}>
          <MessageCircle size={32} color={colors.primary} />
          <Text style={[styles.contactTitle, { textAlign }]}>{t('help.chat', 'Live Chat')}</Text>
          <Text style={[styles.contactInfo, { textAlign }]}>{t('help.chatAvailable', 'Available 24/7')}</Text>
        </GlassView>
      </View>

      {/* FAQ Section */}
      <Text style={[styles.sectionTitle, { textAlign }]}>{t('help.faq.title', 'Frequently Asked Questions')}</Text>
      <GlassView style={styles.faqContainer}>
        {faqItems.map((item, index) => (
          <View key={index}>
            <Pressable
              style={[styles.faqItem, { flexDirection }]}
              onPress={() => toggleFaq(index)}
            >
              <HelpCircle size={20} color={colors.primary} />
              <Text style={[styles.faqQuestion, { textAlign, flex: 1 }]}>
                {t(item.questionKey, `Question ${index + 1}`)}
              </Text>
              {expandedFaq === index ? (
                <ChevronUp size={20} color={colors.textMuted} />
              ) : (
                <ChevronDown size={20} color={colors.textMuted} />
              )}
            </Pressable>
            {expandedFaq === index && (
              <Text style={[styles.faqAnswer, { textAlign, paddingLeft: isRTL ? 0 : 32, paddingRight: isRTL ? 32 : 0 }]}>
                {t(item.answerKey, `Answer ${index + 1}`)}
              </Text>
            )}
            {index < faqItems.length - 1 && <View style={styles.faqDivider} />}
          </View>
        ))}
      </GlassView>

      {/* App Info */}
      <View style={styles.appInfo}>
        <Text style={styles.appVersion}>{t('common.appVersion', 'Bayit+ v1.0.0')}</Text>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  content: {
    padding: spacing.lg,
    paddingBottom: spacing.xl * 2,
  },
  pageTitle: {
    fontSize: 28,
    fontWeight: 'bold',
    color: colors.text,
    marginBottom: spacing.xs,
  },
  subtitle: {
    fontSize: 16,
    color: colors.textMuted,
    marginBottom: spacing.xl,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: colors.text,
    marginTop: spacing.xl,
    marginBottom: spacing.md,
  },
  contactGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.md,
  },
  contactCard: {
    flex: 1,
    minWidth: 200,
    padding: spacing.lg,
    alignItems: 'center',
    gap: spacing.sm,
    borderRadius: borderRadius.lg,
  },
  contactTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.text,
    marginTop: spacing.sm,
  },
  contactInfo: {
    fontSize: 14,
    color: colors.textMuted,
  },
  faqContainer: {
    padding: spacing.md,
    borderRadius: borderRadius.lg,
  },
  faqItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    paddingVertical: spacing.md,
  },
  faqQuestion: {
    fontSize: 16,
    color: colors.text,
    fontWeight: '500',
  },
  faqAnswer: {
    fontSize: 14,
    color: colors.textSecondary,
    paddingBottom: spacing.md,
    lineHeight: 22,
  },
  faqDivider: {
    height: 1,
    backgroundColor: colors.glassBorder,
  },
  appInfo: {
    alignItems: 'center',
    marginTop: spacing.xl * 2,
  },
  appVersion: {
    fontSize: 12,
    color: colors.textMuted,
  },
});
