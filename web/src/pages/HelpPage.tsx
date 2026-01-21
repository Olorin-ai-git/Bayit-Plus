import { View, Text, ScrollView, Pressable } from 'react-native';
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
    <ScrollView className="flex-1 bg-gray-900" contentContainerStyle={{ padding: spacing.lg, paddingBottom: spacing.xl * 2 }}>
      <Text className="text-3xl font-bold text-white mb-1" style={{ textAlign }}>{t('nav.help')}</Text>
      <Text className="text-base text-white/60 mb-8" style={{ textAlign }}>{t('help.subtitle', 'How can we help you?')}</Text>

      {/* Contact Options */}
      <View className={`flex-row flex-wrap gap-4 ${isRTL ? 'flex-row-reverse' : ''}`}>
        <GlassView className="flex-1 min-w-[200px] p-6 items-center gap-2 rounded-xl">
          <Mail size={32} color={colors.primary} />
          <Text className="text-base font-semibold text-white mt-2" style={{ textAlign }}>{t('help.email', 'Email Support')}</Text>
          <Text className="text-sm text-white/60" style={{ textAlign }}>support@bayitplus.com</Text>
        </GlassView>

        <GlassView className="flex-1 min-w-[200px] p-6 items-center gap-2 rounded-xl">
          <Phone size={32} color={colors.primary} />
          <Text className="text-base font-semibold text-white mt-2" style={{ textAlign }}>{t('help.phone', 'Phone Support')}</Text>
          <Text className="text-sm text-white/60" style={{ textAlign }}>+972-3-XXX-XXXX</Text>
        </GlassView>

        <GlassView className="flex-1 min-w-[200px] p-6 items-center gap-2 rounded-xl">
          <MessageCircle size={32} color={colors.primary} />
          <Text className="text-base font-semibold text-white mt-2" style={{ textAlign }}>{t('help.chat', 'Live Chat')}</Text>
          <Text className="text-sm text-white/60" style={{ textAlign }}>{t('help.chatAvailable', 'Available 24/7')}</Text>
        </GlassView>
      </View>

      {/* FAQ Section */}
      <Text className="text-xl font-semibold text-white mt-8 mb-4" style={{ textAlign }}>{t('help.faq.title', 'Frequently Asked Questions')}</Text>
      <GlassView className="p-4 rounded-xl">
        {faqItems.map((item, index) => (
          <View key={index}>
            <Pressable
              className="flex-row items-center gap-4 py-4"
              style={{ flexDirection }}
              onPress={() => toggleFaq(index)}
            >
              <HelpCircle size={20} color={colors.primary} />
              <Text className="flex-1 text-base text-white font-medium" style={{ textAlign }}>
                {t(item.questionKey, `Question ${index + 1}`)}
              </Text>
              {expandedFaq === index ? (
                <ChevronUp size={20} color={colors.textMuted} />
              ) : (
                <ChevronDown size={20} color={colors.textMuted} />
              )}
            </Pressable>
            {expandedFaq === index && (
              <Text className={`text-sm text-white/70 pb-4 leading-6 ${isRTL ? 'pr-8' : 'pl-8'}`} style={{ textAlign }}>
                {t(item.answerKey, `Answer ${index + 1}`)}
              </Text>
            )}
            {index < faqItems.length - 1 && <View className="h-px bg-white/10" />}
          </View>
        ))}
      </GlassView>

      {/* App Info */}
      <View className="items-center mt-16">
        <Text className="text-xs text-white/60">{t('common.appVersion', 'Bayit+ v1.0.0')}</Text>
      </View>
    </ScrollView>
  );
}
