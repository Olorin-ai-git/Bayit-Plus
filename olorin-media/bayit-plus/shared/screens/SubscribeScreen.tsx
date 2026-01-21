/**
 * SubscribeScreen - Shared Screen
 * Subscription plan selection and checkout for TV apps
 */

import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  ScrollView,
  Pressable,
  ActivityIndicator,
  Platform,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { useTranslation } from 'react-i18next';
import { useDirection } from '../hooks/useDirection';
import { GlassView, GlassCard } from '../components/ui';
import { colors, spacing, borderRadius } from '../theme';
import { subscriptionService } from '../services';
import { useAuthStore } from '../stores';

interface Plan {
  id: string;
  name: string;
  name_en?: string;
  name_es?: string;
  price: string;
  period: string;
  period_en?: string;
  period_es?: string;
  features: string[];
  features_en?: string[];
  features_es?: string[];
  notIncluded: string[];
  notIncluded_en?: string[];
  notIncluded_es?: string[];
  popular?: boolean;
}

const plans: Plan[] = [
  {
    id: 'basic',
    name: 'בסיסי',
    name_en: 'Basic',
    name_es: 'Básico',
    price: '$9.99',
    period: 'לחודש',
    period_en: '/month',
    period_es: '/mes',
    features: [
      'כל תוכן ה-VOD',
      'רדיו ופודקאסטים',
      'צפייה על מכשיר אחד',
      'איכות SD',
    ],
    features_en: [
      'All VOD content',
      'Radio & Podcasts',
      'Watch on 1 device',
      'SD quality',
    ],
    features_es: [
      'Todo el contenido VOD',
      'Radio y Podcasts',
      'Ver en 1 dispositivo',
      'Calidad SD',
    ],
    notIncluded: [
      'ערוצי שידור חי',
      'עוזר AI',
      'צפייה אופליין',
    ],
    notIncluded_en: [
      'Live channels',
      'AI Assistant',
      'Offline viewing',
    ],
    notIncluded_es: [
      'Canales en vivo',
      'Asistente AI',
      'Ver sin conexión',
    ],
  },
  {
    id: 'premium',
    name: 'פרימיום',
    name_en: 'Premium',
    name_es: 'Premium',
    price: '$14.99',
    period: 'לחודש',
    period_en: '/month',
    period_es: '/mes',
    popular: true,
    features: [
      'כל תוכן ה-VOD',
      'ערוצי שידור חי',
      'רדיו ופודקאסטים',
      'עוזר AI חכם',
      'צפייה על 2 מכשירים',
      'איכות HD',
    ],
    features_en: [
      'All VOD content',
      'Live channels',
      'Radio & Podcasts',
      'Smart AI Assistant',
      'Watch on 2 devices',
      'HD quality',
    ],
    features_es: [
      'Todo el contenido VOD',
      'Canales en vivo',
      'Radio y Podcasts',
      'Asistente AI inteligente',
      'Ver en 2 dispositivos',
      'Calidad HD',
    ],
    notIncluded: [
      'צפייה אופליין',
      'פרופילים משפחתיים',
    ],
    notIncluded_en: [
      'Offline viewing',
      'Family profiles',
    ],
    notIncluded_es: [
      'Ver sin conexión',
      'Perfiles familiares',
    ],
  },
  {
    id: 'family',
    name: 'משפחתי',
    name_en: 'Family',
    name_es: 'Familiar',
    price: '$19.99',
    period: 'לחודש',
    period_en: '/month',
    period_es: '/mes',
    features: [
      'כל תוכן ה-VOD',
      'ערוצי שידור חי',
      'רדיו ופודקאסטים',
      'עוזר AI חכם',
      'צפייה על 4 מכשירים',
      'איכות 4K',
      '5 פרופילים משפחתיים',
      'הורדה לצפייה אופליין',
    ],
    features_en: [
      'All VOD content',
      'Live channels',
      'Radio & Podcasts',
      'Smart AI Assistant',
      'Watch on 4 devices',
      '4K quality',
      '5 family profiles',
      'Download for offline',
    ],
    features_es: [
      'Todo el contenido VOD',
      'Canales en vivo',
      'Radio y Podcasts',
      'Asistente AI inteligente',
      'Ver en 4 dispositivos',
      'Calidad 4K',
      '5 perfiles familiares',
      'Descargar sin conexión',
    ],
    notIncluded: [],
    notIncluded_en: [],
    notIncluded_es: [],
  },
];

interface PlanCardProps {
  plan: Plan;
  isSelected: boolean;
  isFocused: boolean;
  onSelect: () => void;
  onFocus: () => void;
  billingPeriod: 'monthly' | 'yearly';
  language: string;
}

function PlanCard({ plan, isSelected, isFocused, onSelect, onFocus, billingPeriod, language }: PlanCardProps) {
  const { t } = useTranslation();

  const getName = () => {
    if (language === 'en' && plan.name_en) return plan.name_en;
    if (language === 'es' && plan.name_es) return plan.name_es;
    return plan.name;
  };

  const getPeriod = () => {
    if (language === 'en' && plan.period_en) return plan.period_en;
    if (language === 'es' && plan.period_es) return plan.period_es;
    return plan.period;
  };

  const getFeatures = () => {
    if (language === 'en' && plan.features_en) return plan.features_en;
    if (language === 'es' && plan.features_es) return plan.features_es;
    return plan.features;
  };

  const getNotIncluded = () => {
    if (language === 'en' && plan.notIncluded_en) return plan.notIncluded_en;
    if (language === 'es' && plan.notIncluded_es) return plan.notIncluded_es;
    return plan.notIncluded;
  };

  const yearlyPrice = (parseFloat(plan.price.slice(1)) * 10).toFixed(2);

  return (
    <Pressable
      onPress={onSelect}
      onFocus={onFocus}
      className={`flex-1 min-w-[300px] max-w-[360px] ${plan.popular ? '-mt-5 mb-5' : ''}`}
    >
      <GlassCard
        className={`p-4 relative border-[3px] ${
          isSelected ? 'border-[#a855f7]' : 'border-transparent'
        } ${isFocused ? 'border-white scale-[1.03]' : ''}`}
      >
        {/* Popular Badge */}
        {plan.popular && (
          <View className="absolute -top-3.5 right-4 flex-row items-center gap-1 bg-[#a855f7] px-4 py-1 rounded-full">
            <Text className="text-sm">✨</Text>
            <Text className="text-xs font-semibold text-white">{t('subscribe.popular', 'הכי פופולרי')}</Text>
          </View>
        )}

        {/* Plan Header */}
        <View className="items-center mb-4">
          <Text className="text-[22px] font-bold text-white mb-2">{getName()}</Text>
          <View className="flex-row items-baseline gap-1">
            <Text className="text-[40px] font-bold text-[#a855f7]">{plan.price}</Text>
            <Text className="text-base text-gray-400">{getPeriod()}</Text>
          </View>
          {billingPeriod === 'yearly' && (
            <Text className="text-sm text-[#22c55e] mt-1">${yearlyPrice} {t('subscribe.perYear', 'לשנה')}</Text>
          )}
        </View>

        {/* Features */}
        <View className="mb-4">
          {getFeatures().map((feature, i) => (
            <View key={i} className="flex-row items-center gap-2 mb-2">
              <View className="w-[22px] h-[22px] rounded-full bg-[rgba(34,197,94,0.2)] justify-center items-center">
                <Text className="text-xs text-[#22c55e] font-bold">✓</Text>
              </View>
              <Text className="text-sm text-white flex-1 text-right">{feature}</Text>
            </View>
          ))}
          {getNotIncluded().map((feature, i) => (
            <View key={i} className="flex-row items-center gap-2 mb-2">
              <View className="w-[22px] h-[22px] justify-center items-center">
                <Text className="text-sm text-gray-400">—</Text>
              </View>
              <Text className="text-sm text-gray-400 line-through flex-1 text-right">{feature}</Text>
            </View>
          ))}
        </View>

        {/* Selection Indicator */}
        {isSelected && (
          <View className="absolute top-4 left-4 bg-[#a855f7] px-2 py-1 rounded">
            <Text className="text-xs text-white font-semibold">{t('subscribe.selected', 'נבחר')}</Text>
          </View>
        )}
      </GlassCard>
    </Pressable>
  );
}

export function SubscribeScreen() {
  const { t, i18n } = useTranslation();
  const { isRTL, textAlign, flexDirection } = useDirection();
  const navigation = useNavigation<any>();
  const { isAuthenticated } = useAuthStore();
  const [selectedPlan, setSelectedPlan] = useState('premium');
  const [focusedPlan, setFocusedPlan] = useState<string | null>(null);
  const [billingPeriod, setBillingPeriod] = useState<'monthly' | 'yearly'>('monthly');
  const [loading, setLoading] = useState(false);
  const [focusedItem, setFocusedItem] = useState<string | null>(null);

  const handleSubscribe = useCallback(async () => {
    if (!isAuthenticated) {
      navigation.navigate('Login');
      return;
    }

    setLoading(true);
    try {
      const response = await subscriptionService.createCheckout(selectedPlan);
      // For web/TV, handle checkout URL
      if (Platform.OS === 'web' && response.checkoutUrl) {
        // @ts-ignore - window exists on web
        window.location.href = response.checkoutUrl;
      } else {
        // On native platforms, log for debugging
        console.log('[SubscribeScreen] Checkout created:', response.checkoutUrl);
      }
    } catch (error) {
      console.error('[SubscribeScreen] Failed to create checkout:', error);
    } finally {
      setLoading(false);
    }
  }, [isAuthenticated, selectedPlan, navigation]);

  return (
    <ScrollView className="flex-1 bg-black" contentContainerStyle={{ paddingHorizontal: 48, paddingVertical: 48, alignItems: 'center' }}>
      {/* Header */}
      <View className="items-center mb-12">
        <Text className="text-[40px] font-bold text-white text-center mb-4">{t('subscribe.title', 'בחר את המסלול שלך')}</Text>
        <Text className="text-lg text-gray-400 text-center max-w-[600px]">
          {t('subscribe.subtitle', '7 ימי ניסיון חינם לכל מסלול. בטל בכל עת.')}
        </Text>
      </View>

      {/* Billing Toggle */}
      <View className="items-center mb-12">
        <GlassView intensity="low" className="flex-row p-1 rounded-full">
          <Pressable
            onPress={() => setBillingPeriod('monthly')}
            onFocus={() => setFocusedItem('monthly')}
            onBlur={() => setFocusedItem(null)}
            className={`flex-row items-center px-6 py-3 rounded-full gap-2 border-2 ${
              billingPeriod === 'monthly' ? 'bg-[#a855f7]' : ''
            } ${focusedItem === 'monthly' ? 'border-white' : 'border-transparent'}`}
          >
            <Text className={`text-base ${billingPeriod === 'monthly' ? 'text-white font-semibold' : 'text-gray-400'}`}>
              {t('subscribe.monthly', 'חודשי')}
            </Text>
          </Pressable>
          <Pressable
            onPress={() => setBillingPeriod('yearly')}
            onFocus={() => setFocusedItem('yearly')}
            onBlur={() => setFocusedItem(null)}
            className={`flex-row items-center px-6 py-3 rounded-full gap-2 border-2 ${
              billingPeriod === 'yearly' ? 'bg-[#a855f7]' : ''
            } ${focusedItem === 'yearly' ? 'border-white' : 'border-transparent'}`}
          >
            <Text className={`text-base ${billingPeriod === 'yearly' ? 'text-white font-semibold' : 'text-gray-400'}`}>
              {t('subscribe.yearly', 'שנתי')}
            </Text>
            <View className="bg-[rgba(34,197,94,0.2)] px-2 py-1 rounded">
              <Text className="text-[11px] text-[#22c55e] font-semibold">{t('subscribe.save2Months', 'חסכו 2 חודשים')}</Text>
            </View>
          </Pressable>
        </GlassView>
      </View>

      {/* Plans Grid */}
      <View className="flex-row flex-wrap justify-center gap-4 mb-12 max-w-[1200px]">
        {plans.map((plan) => (
          <PlanCard
            key={plan.id}
            plan={plan}
            isSelected={selectedPlan === plan.id}
            isFocused={focusedPlan === plan.id}
            onSelect={() => setSelectedPlan(plan.id)}
            onFocus={() => setFocusedPlan(plan.id)}
            billingPeriod={billingPeriod}
            language={i18n.language}
          />
        ))}
      </View>

      {/* CTA Section */}
      <View className="items-center mb-12">
        <Pressable
          onPress={handleSubscribe}
          disabled={loading}
          onFocus={() => setFocusedItem('cta')}
          onBlur={() => setFocusedItem(null)}
          className={`bg-[#a855f7] px-24 py-4 rounded-full border-[3px] min-w-[300px] items-center ${
            focusedItem === 'cta' ? 'border-white scale-105' : 'border-transparent'
          } ${loading ? 'opacity-70' : ''}`}
        >
          {loading ? (
            <ActivityIndicator size="small" color={colors.text} />
          ) : (
            <Text className="text-lg font-bold text-white">
              {t('subscribe.startTrial', 'התחל ניסיון חינם')}
            </Text>
          )}
        </Pressable>
        <Text className="text-sm text-gray-400 mt-4 text-center">
          {t('subscribe.noCharge', 'לא יחויב כרטיס האשראי במהלך תקופת הניסיון')}
        </Text>
      </View>

      {/* TV-specific: QR Code for mobile signup */}
      <View className="items-center">
        <GlassCard className="p-6 items-center min-w-[300px]">
          <Text className="text-base text-gray-300 mb-4">{t('subscribe.scanQR', 'או הירשם מהנייד')}</Text>
          <View className="w-[150px] h-[150px] bg-white/10 rounded-lg justify-center items-center mb-4 border-2 border-white/20 border-dashed">
            <Text className="text-5xl">📱</Text>
          </View>
          <Text className="text-sm text-gray-400 text-center">
            {t('subscribe.scanToSignup', 'סרוק את הקוד כדי להירשם מהטלפון')}
          </Text>
        </GlassCard>
      </View>
    </ScrollView>
  );
}
