/**
 * SubscribeScreen for tvOS
 * Subscription plan selection and checkout
 */

import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Pressable,
  ActivityIndicator,
  Platform,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { useTranslation } from 'react-i18next';
import { useDirection } from '@bayit/shared-hooks';
import { GlassView, GlassCard } from '@bayit/shared';
import { colors, spacing, borderRadius } from '@bayit/shared/theme';
import { subscriptionService } from '@bayit/shared-services';
import { useAuthStore } from '@bayit/shared-stores';

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
      style={[
        styles.planWrapper,
        plan.popular && styles.planWrapperPopular,
      ]}
    >
      <GlassCard
        style={[
          styles.planCard,
          isSelected && styles.planCardSelected,
          isFocused && styles.planCardFocused,
        ]}
      >
        {/* Popular Badge */}
        {plan.popular && (
          <View style={styles.popularBadge}>
            <Text style={styles.popularBadgeIcon}>✨</Text>
            <Text style={styles.popularBadgeText}>{t('subscribe.popular', 'הכי פופולרי')}</Text>
          </View>
        )}

        {/* Plan Header */}
        <View style={styles.planHeader}>
          <Text style={styles.planName}>{getName()}</Text>
          <View style={styles.priceRow}>
            <Text style={styles.price}>{plan.price}</Text>
            <Text style={styles.period}>{getPeriod()}</Text>
          </View>
          {billingPeriod === 'yearly' && (
            <Text style={styles.yearlyPrice}>${yearlyPrice} {t('subscribe.perYear', 'לשנה')}</Text>
          )}
        </View>

        {/* Features */}
        <View style={styles.featuresList}>
          {getFeatures().map((feature, i) => (
            <View key={i} style={styles.featureItem}>
              <View style={styles.featureIcon}>
                <Text style={styles.checkIcon}>✓</Text>
              </View>
              <Text style={styles.featureText}>{feature}</Text>
            </View>
          ))}
          {getNotIncluded().map((feature, i) => (
            <View key={i} style={styles.featureItem}>
              <View style={styles.notIncludedIcon}>
                <Text style={styles.minusIcon}>—</Text>
              </View>
              <Text style={styles.notIncludedText}>{feature}</Text>
            </View>
          ))}
        </View>

        {/* Selection Indicator */}
        {isSelected && (
          <View style={styles.selectedIndicator}>
            <Text style={styles.selectedText}>{t('subscribe.selected', 'נבחר')}</Text>
          </View>
        )}
      </GlassCard>
    </Pressable>
  );
}

export default function SubscribeScreen() {
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
      // For tvOS, show QR code (web redirects)
      if (Platform.OS === 'web' && response.checkoutUrl) {
        // @ts-ignore - window exists on web
        window.location.href = response.checkoutUrl;
      } else {
        // On tvOS, the QR code section is shown - log for debugging
        console.log('[SubscribeScreen] Checkout created:', response.checkoutUrl);
      }
    } catch (error) {
      console.error('[SubscribeScreen] Failed to create checkout:', error);
    } finally {
      setLoading(false);
    }
  }, [isAuthenticated, selectedPlan, navigation]);

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.contentContainer}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.title}>{t('subscribe.title', 'בחר את המסלול שלך')}</Text>
        <Text style={styles.subtitle}>
          {t('subscribe.subtitle', '7 ימי ניסיון חינם לכל מסלול. בטל בכל עת.')}
        </Text>
      </View>

      {/* Billing Toggle */}
      <View style={styles.billingToggle}>
        <GlassView intensity="low" style={styles.tabsContainer}>
          <Pressable
            onPress={() => setBillingPeriod('monthly')}
            onFocus={() => setFocusedItem('monthly')}
            onBlur={() => setFocusedItem(null)}
            style={[
              styles.tab,
              billingPeriod === 'monthly' && styles.tabActive,
              focusedItem === 'monthly' && styles.tabFocused,
            ]}
          >
            <Text style={[styles.tabText, billingPeriod === 'monthly' && styles.tabTextActive]}>
              {t('subscribe.monthly', 'חודשי')}
            </Text>
          </Pressable>
          <Pressable
            onPress={() => setBillingPeriod('yearly')}
            onFocus={() => setFocusedItem('yearly')}
            onBlur={() => setFocusedItem(null)}
            style={[
              styles.tab,
              billingPeriod === 'yearly' && styles.tabActive,
              focusedItem === 'yearly' && styles.tabFocused,
            ]}
          >
            <Text style={[styles.tabText, billingPeriod === 'yearly' && styles.tabTextActive]}>
              {t('subscribe.yearly', 'שנתי')}
            </Text>
            <View style={styles.saveBadge}>
              <Text style={styles.saveBadgeText}>{t('subscribe.save2Months', 'חסכו 2 חודשים')}</Text>
            </View>
          </Pressable>
        </GlassView>
      </View>

      {/* Plans Grid */}
      <View style={styles.plansGrid}>
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
      <View style={styles.ctaSection}>
        <Pressable
          onPress={handleSubscribe}
          disabled={loading}
          onFocus={() => setFocusedItem('cta')}
          onBlur={() => setFocusedItem(null)}
          style={[
            styles.ctaButton,
            focusedItem === 'cta' && styles.ctaButtonFocused,
            loading && styles.ctaButtonDisabled,
          ]}
        >
          {loading ? (
            <ActivityIndicator size="small" color={colors.text} />
          ) : (
            <Text style={styles.ctaButtonText}>
              {t('subscribe.startTrial', 'התחל ניסיון חינם')}
            </Text>
          )}
        </Pressable>
        <Text style={styles.ctaNote}>
          {t('subscribe.noCharge', 'לא יחויב כרטיס האשראי במהלך תקופת הניסיון')}
        </Text>
      </View>

      {/* TV-specific: QR Code for mobile signup */}
      <View style={styles.qrSection}>
        <GlassCard style={styles.qrCard}>
          <Text style={styles.qrTitle}>{t('subscribe.scanQR', 'או הירשם מהנייד')}</Text>
          <View style={styles.qrPlaceholder}>
            <Text style={styles.qrIcon}>📱</Text>
          </View>
          <Text style={styles.qrText}>
            {t('subscribe.scanToSignup', 'סרוק את הקוד כדי להירשם מהטלפון')}
          </Text>
        </GlassCard>
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
    paddingHorizontal: spacing.xl,
    paddingVertical: spacing.xl,
    alignItems: 'center',
  },
  header: {
    alignItems: 'center',
    marginBottom: spacing.xl,
  },
  title: {
    fontSize: 40,
    fontWeight: 'bold',
    color: colors.text,
    textAlign: 'center',
    marginBottom: spacing.md,
  },
  subtitle: {
    fontSize: 18,
    color: colors.textMuted,
    textAlign: 'center',
    maxWidth: 600,
  },
  billingToggle: {
    alignItems: 'center',
    marginBottom: spacing.xl,
  },
  tabsContainer: {
    flexDirection: 'row',
    padding: spacing.xs,
    borderRadius: borderRadius.full,
  },
  tab: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.xl,
    paddingVertical: spacing.md,
    borderRadius: borderRadius.full,
    gap: spacing.sm,
    borderWidth: 2,
    borderColor: 'transparent',
  },
  tabActive: {
    backgroundColor: colors.primary,
  },
  tabFocused: {
    borderColor: colors.text,
  },
  tabText: {
    fontSize: 16,
    color: colors.textMuted,
  },
  tabTextActive: {
    color: colors.text,
    fontWeight: '600',
  },
  saveBadge: {
    backgroundColor: 'rgba(34, 197, 94, 0.2)',
    paddingHorizontal: spacing.sm,
    paddingVertical: 4,
    borderRadius: borderRadius.sm,
  },
  saveBadgeText: {
    fontSize: 11,
    color: colors.success,
    fontWeight: '600',
  },
  plansGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
    gap: spacing.lg,
    marginBottom: spacing.xl,
    maxWidth: 1200,
  },
  planWrapper: {
    flex: 1,
    minWidth: 300,
    maxWidth: 360,
  },
  planWrapperPopular: {
    marginTop: -20,
    marginBottom: 20,
  },
  planCard: {
    padding: spacing.lg,
    position: 'relative',
    borderWidth: 3,
    borderColor: 'transparent',
  },
  planCardSelected: {
    borderColor: colors.primary,
  },
  planCardFocused: {
    borderColor: colors.text,
    transform: [{ scale: 1.03 }],
  },
  popularBadge: {
    position: 'absolute',
    top: -14,
    right: spacing.md,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    backgroundColor: colors.secondary,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
    borderRadius: borderRadius.full,
  },
  popularBadgeIcon: {
    fontSize: 14,
  },
  popularBadgeText: {
    fontSize: 12,
    fontWeight: '600',
    color: colors.text,
  },
  planHeader: {
    alignItems: 'center',
    marginBottom: spacing.lg,
  },
  planName: {
    fontSize: 22,
    fontWeight: 'bold',
    color: colors.text,
    marginBottom: spacing.sm,
  },
  priceRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
    gap: spacing.xs,
  },
  price: {
    fontSize: 40,
    fontWeight: 'bold',
    color: colors.primary,
  },
  period: {
    fontSize: 16,
    color: colors.textMuted,
  },
  yearlyPrice: {
    fontSize: 14,
    color: colors.success,
    marginTop: spacing.xs,
  },
  featuresList: {
    marginBottom: spacing.md,
  },
  featureItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    marginBottom: spacing.sm,
  },
  featureIcon: {
    width: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: 'rgba(34, 197, 94, 0.2)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  checkIcon: {
    fontSize: 12,
    color: colors.success,
    fontWeight: 'bold',
  },
  notIncludedIcon: {
    width: 22,
    height: 22,
    justifyContent: 'center',
    alignItems: 'center',
  },
  minusIcon: {
    fontSize: 14,
    color: colors.textMuted,
  },
  featureText: {
    fontSize: 14,
    color: colors.text,
    flex: 1,
    textAlign: 'right',
  },
  notIncludedText: {
    fontSize: 14,
    color: colors.textMuted,
    textDecorationLine: 'line-through',
    flex: 1,
    textAlign: 'right',
  },
  selectedIndicator: {
    position: 'absolute',
    top: spacing.md,
    left: spacing.md,
    backgroundColor: colors.primary,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    borderRadius: borderRadius.sm,
  },
  selectedText: {
    fontSize: 12,
    color: colors.text,
    fontWeight: '600',
  },
  ctaSection: {
    alignItems: 'center',
    marginBottom: spacing.xl,
  },
  ctaButton: {
    backgroundColor: colors.primary,
    paddingHorizontal: spacing.xl * 2,
    paddingVertical: spacing.lg,
    borderRadius: borderRadius.full,
    borderWidth: 3,
    borderColor: 'transparent',
    minWidth: 300,
    alignItems: 'center',
  },
  ctaButtonFocused: {
    borderColor: colors.text,
    transform: [{ scale: 1.05 }],
  },
  ctaButtonDisabled: {
    opacity: 0.7,
  },
  ctaButtonText: {
    fontSize: 18,
    fontWeight: 'bold',
    color: colors.text,
  },
  ctaNote: {
    fontSize: 14,
    color: colors.textMuted,
    marginTop: spacing.md,
    textAlign: 'center',
  },
  qrSection: {
    alignItems: 'center',
  },
  qrCard: {
    padding: spacing.xl,
    alignItems: 'center',
    minWidth: 300,
  },
  qrTitle: {
    fontSize: 16,
    color: colors.textSecondary,
    marginBottom: spacing.md,
  },
  qrPlaceholder: {
    width: 150,
    height: 150,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    borderRadius: borderRadius.md,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: spacing.md,
    borderWidth: 2,
    borderColor: 'rgba(255, 255, 255, 0.2)',
    borderStyle: 'dashed',
  },
  qrIcon: {
    fontSize: 48,
  },
  qrText: {
    fontSize: 14,
    color: colors.textMuted,
    textAlign: 'center',
  },
});
