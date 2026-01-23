import { View, Text, ScrollView, Pressable, StyleSheet } from 'react-native';
import { useTranslation } from 'react-i18next';
import { useDirection } from '@/hooks/useDirection';
import { colors, spacing, borderRadius, fontSize } from '@bayit/shared/theme';
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
    <ScrollView style={styles.container} contentContainerStyle={styles.contentContainer}>
      <Text style={[styles.title, { textAlign }]}>{t('nav.help')}</Text>
      <Text style={[styles.subtitle, { textAlign }]}>{t('help.subtitle', 'How can we help you?')}</Text>

      {/* Contact Options */}
      <View style={[styles.contactContainer, isRTL && styles.contactContainerRTL]}>
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
      <Text style={[styles.faqSectionTitle, { textAlign }]}>{t('help.faq.title', 'Frequently Asked Questions')}</Text>
      <GlassView style={styles.faqContainer}>
        {faqItems.map((item, index) => (
          <View key={index}>
            <Pressable
              style={[styles.faqQuestion, { flexDirection }]}
              onPress={() => toggleFaq(index)}
            >
              <HelpCircle size={20} color={colors.primary} />
              <Text style={[styles.faqQuestionText, { textAlign }]}>
                {t(item.questionKey, `Question ${index + 1}`)}
              </Text>
              {expandedFaq === index ? (
                <ChevronUp size={20} color={colors.textMuted} />
              ) : (
                <ChevronDown size={20} color={colors.textMuted} />
              )}
            </Pressable>
            {expandedFaq === index && (
              <Text style={[styles.faqAnswer, isRTL ? styles.faqAnswerRTL : styles.faqAnswerLTR, { textAlign }]}>
                {t(item.answerKey, `Answer ${index + 1}`)}
              </Text>
            )}
            {index < faqItems.length - 1 && <View style={styles.faqDivider} />}
          </View>
        ))}
      </GlassView>

      {/* App Info */}
      <View style={styles.appInfoContainer}>
        <Text style={styles.appInfoText}>{t('common.appVersion', 'Bayit+ v1.0.0')}</Text>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  contentContainer: {
    padding: spacing.lg,
    paddingBottom: spacing.xl * 2,
  },
  title: {
    fontSize: fontSize['3xl'],
    fontWeight: 'bold',
    color: colors.text,
    marginBottom: spacing.xs,
  },
  subtitle: {
    fontSize: fontSize.base,
    color: colors.textMuted,
    marginBottom: spacing.xl,
  },
  contactContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.md,
  },
  contactContainerRTL: {
    flexDirection: 'row-reverse',
  },
  contactCard: {
    flex: 1,
    minWidth: 200,
    padding: spacing.xl,
    alignItems: 'center',
    gap: spacing.xs,
    borderRadius: borderRadius.xl,
  },
  contactTitle: {
    fontSize: fontSize.base,
    fontWeight: '600',
    color: colors.text,
    marginTop: spacing.xs,
  },
  contactInfo: {
    fontSize: fontSize.sm,
    color: colors.textMuted,
  },
  faqSectionTitle: {
    fontSize: fontSize.xl,
    fontWeight: '600',
    color: colors.text,
    marginTop: spacing.xl,
    marginBottom: spacing.md,
  },
  faqContainer: {
    padding: spacing.md,
    borderRadius: borderRadius.xl,
  },
  faqQuestion: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    paddingVertical: spacing.md,
  },
  faqQuestionText: {
    flex: 1,
    fontSize: fontSize.base,
    color: colors.text,
    fontWeight: '500',
  },
  faqAnswer: {
    fontSize: fontSize.sm,
    color: colors.textMuted,
    paddingBottom: spacing.md,
    lineHeight: fontSize.sm * 1.5,
  },
  faqAnswerLTR: {
    paddingLeft: spacing.xl,
  },
  faqAnswerRTL: {
    paddingRight: spacing.xl,
  },
  faqDivider: {
    height: 1,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
  },
  appInfoContainer: {
    alignItems: 'center',
    marginTop: spacing.xl * 2,
  },
  appInfoText: {
    fontSize: fontSize.xs,
    color: colors.textMuted,
  },
});
