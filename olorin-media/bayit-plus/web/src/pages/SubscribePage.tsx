import { useState } from 'react';
import { View, Text, Pressable, ScrollView, ActivityIndicator } from 'react-native';
import { useNavigate } from 'react-router-dom';
import { Check, Sparkles, X } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { useDirection } from '@/hooks/useDirection';
import { useAuthStore } from '@/stores/authStore';
import { subscriptionService } from '@/services/api';
import { colors, spacing, borderRadius } from '@bayit/shared/theme';
import { GlassCard, GlassButton, GlassView } from '@bayit/shared/ui';
import logger from '@/utils/logger';

interface Plan {
  id: string;
  price: string;
  popular?: boolean;
}

const plansConfig: Plan[] = [
  {
    id: 'basic',
    price: '$9.99',
  },
  {
    id: 'premium',
    price: '$14.99',
    popular: true,
  },
  {
    id: 'family',
    price: '$19.99',
  },
];

function PlanCard({ planId, isSelected, onSelect, billingPeriod }: {
  planId: string;
  isSelected: boolean;
  onSelect: () => void;
  billingPeriod: 'monthly' | 'yearly';
}) {
  const { t } = useTranslation();
  const [isHovered, setIsHovered] = useState(false);
  const plan = plansConfig.find(p => p.id === planId);

  if (!plan) return null;

  const planKey = `plans.${planId}`;
  const name = t(`${planKey}.name`);
  const features = t(`${planKey}.features`, [], { returnObjects: true });
  const notIncluded = t(`${planKey}.notIncluded`, [], { returnObjects: true });

  const yearlyPrice = (parseFloat(plan.price.slice(1)) * 10).toFixed(2);

  return (
    <Pressable
      onPress={onSelect}
      onHoverIn={() => setIsHovered(true)}
      onHoverOut={() => setIsHovered(false)}
      className={`flex-1 min-w-[280px] max-w-[360px] ${plan.popular ? '-mt-4 mb-4' : ''}`}
    >
      <GlassCard
        className={`p-6 relative ${isSelected ? 'border-2 scale-[1.02]' : ''} ${isHovered ? 'scale-[1.01]' : ''}`}
        style={isSelected ? { borderColor: colors.primary, transform: [{ scale: 1.02 }] } : undefined}
      >
        {/* Popular Badge */}
        {plan.popular && (
          <View className="absolute -top-3 flex-row items-center gap-1 px-4 py-1 rounded-full" style={{ right: spacing.md, backgroundColor: colors.secondary }}>
            <Sparkles size={14} color={colors.text} />
            <Text className="text-xs font-semibold" style={{ color: colors.text }}>{t('subscribe.popular')}</Text>
          </View>
        )}

        {/* Plan Header */}
        <View className="items-center mb-6">
          <Text className="text-xl font-bold mb-2" style={{ color: colors.text }}>{name}</Text>
          <View className="flex-row items-baseline gap-1">
            <Text className="text-4xl font-bold" style={{ color: colors.primary }}>{plan.price}</Text>
            <Text className="text-sm" style={{ color: colors.textMuted }}>{t('subscribe.period')}</Text>
          </View>
          {billingPeriod === 'yearly' && (
            <Text className="text-sm mt-1" style={{ color: colors.success }}>${yearlyPrice} {t('subscribe.perYear')}</Text>
          )}
        </View>

        {/* Features */}
        <View className="mb-6">
          {Array.isArray(features) && features.map((feature, i) => (
            <View key={i} className="flex-row items-center gap-2 mb-2">
              <View className="w-5 h-5 rounded-full bg-[#22c55e]/20 justify-center items-center">
                <Check size={12} color={colors.success} />
              </View>
              <Text className="text-sm flex-1" style={{ color: colors.text }}>{feature}</Text>
            </View>
          ))}
          {Array.isArray(notIncluded) && notIncluded.map((feature, i) => (
            <View key={i} className="flex-row items-center gap-2 mb-2">
              <View className="w-5 h-0.5" style={{ backgroundColor: colors.glass }} />
              <Text className="text-sm flex-1 line-through" style={{ color: colors.textMuted }}>{feature}</Text>
            </View>
          ))}
        </View>

        {/* Select Button */}
        <GlassButton
          title={isSelected ? t('subscribe.selected') : t('subscribe.select')}
          onPress={onSelect}
          variant={isSelected ? 'primary' : 'secondary'}
          className="w-full"
        />
      </GlassCard>
    </Pressable>
  );
}

export default function SubscribePage() {
  const { t } = useTranslation();
  const { isRTL, textAlign, flexDirection } = useDirection();
  const navigate = useNavigate();
  const { isAuthenticated } = useAuthStore();
  const [selectedPlan, setSelectedPlan] = useState('premium');
  const [billingPeriod, setBillingPeriod] = useState<'monthly' | 'yearly'>('monthly');
  const [loading, setLoading] = useState(false);

  const handleSubscribe = async () => {
    if (!isAuthenticated) {
      navigate('/login', { state: { from: '/subscribe' } });
      return;
    }

    setLoading(true);
    try {
      const response = await subscriptionService.createCheckout(selectedPlan);
      window.location.href = response.checkoutUrl;
    } catch (error) {
      logger.error('Failed to create checkout', 'SubscribePage', error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <ScrollView className="flex-1" contentContainerStyle={{ paddingHorizontal: spacing.md, paddingVertical: spacing.xl, maxWidth: 1200, marginHorizontal: 'auto', width: '100%', position: 'relative' }}>
      {/* Decorative blur circles */}
      <View className="absolute w-96 h-96 top-0 right-0 rounded-full opacity-30" style={{ backgroundColor: colors.primary, filter: 'blur(100px)' }} />
      <View className="absolute w-72 h-72 bottom-0 left-0 rounded-full opacity-30" style={{ backgroundColor: colors.secondary, filter: 'blur(100px)' }} />

      {/* Header */}
      <View className="items-center mb-8 z-10">
        <Text className="text-4xl font-bold text-center mb-4" style={{ color: colors.text }}>{t('subscribe.title')}</Text>
        <Text className="text-lg text-center max-w-[600px]" style={{ color: colors.textMuted }}>
          {t('subscribe.subtitle')}
        </Text>
      </View>

      {/* Billing Toggle */}
      <View className="items-center mb-8 z-10">
        <GlassView className="flex-row p-1 rounded-full">
          <Pressable
            onPress={() => setBillingPeriod('monthly')}
            className={`flex-row items-center px-6 py-2 rounded-full ${billingPeriod === 'monthly' ? '' : ''}`}
            style={billingPeriod === 'monthly' ? { backgroundColor: colors.primary } : undefined}
          >
            <Text className={`text-sm ${billingPeriod === 'monthly' ? 'font-semibold' : ''}`} style={{ color: billingPeriod === 'monthly' ? colors.text : colors.textMuted }}>
              {t('subscribe.monthly')}
            </Text>
          </Pressable>
          <Pressable
            onPress={() => setBillingPeriod('yearly')}
            className={`flex-row items-center px-6 py-2 rounded-full gap-2 ${billingPeriod === 'yearly' ? '' : ''}`}
            style={billingPeriod === 'yearly' ? { backgroundColor: colors.primary } : undefined}
          >
            <Text className={`text-sm ${billingPeriod === 'yearly' ? 'font-semibold' : ''}`} style={{ color: billingPeriod === 'yearly' ? colors.text : colors.textMuted }}>
              {t('subscribe.yearly')}
            </Text>
            <View className="bg-[#22c55e]/20 px-2 py-0.5 rounded">
              <Text className="text-[10px] font-semibold" style={{ color: colors.success }}>{t('subscribe.save2Months')}</Text>
            </View>
          </Pressable>
        </GlassView>
      </View>

      {/* Plans Grid */}
      <View className="flex-row flex-wrap justify-center gap-6 mb-8 z-10">
        {plansConfig.map((plan) => (
          <PlanCard
            key={plan.id}
            planId={plan.id}
            isSelected={selectedPlan === plan.id}
            onSelect={() => setSelectedPlan(plan.id)}
            billingPeriod={billingPeriod}
          />
        ))}
      </View>

      {/* CTA */}
      <View className="items-center z-10">
        <GlassButton
          title={loading ? t('subscribe.processing') : t('subscribe.startTrial')}
          onPress={handleSubscribe}
          disabled={loading}
          variant="primary"
          style={{ paddingHorizontal: spacing.xl * 1.5, paddingVertical: spacing.md }}
        />
        <Text className="text-sm mt-4" style={{ color: colors.textMuted }}>
          {t('subscribe.noCharge')}
        </Text>
      </View>
    </ScrollView>
  );
}
