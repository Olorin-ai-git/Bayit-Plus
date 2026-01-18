/**
 * SubscriptionTab component - Current plan and upgrade options.
 */

import React from 'react';
import { View, Text, TouchableOpacity, ScrollView } from 'react-native';
import { useTranslation } from 'react-i18next';
import { useNavigation } from '@react-navigation/native';
import { GlassView, GlassButton } from '../../components';
import { styles } from './ProfileScreen.styles';
import { SUBSCRIPTION_PLANS } from './types';

interface UserSubscription {
  plan?: string;
  status?: string;
  end_date?: string;
}

interface SubscriptionTabProps {
  user: {
    subscription?: UserSubscription;
  } | null;
}

export const SubscriptionTab: React.FC<SubscriptionTabProps> = ({ user }) => {
  const { t } = useTranslation();
  const navigation = useNavigation<any>();

  return (
    <ScrollView showsVerticalScrollIndicator={false}>
      {/* Current Plan */}
      <GlassView style={styles.contentCard}>
        <Text style={styles.sectionTitle}>{t('profile.subscription.currentPlan')}</Text>

        {user?.subscription ? (
          <View style={styles.currentPlanCard}>
            <View style={styles.currentPlanHeader}>
              <View>
                <Text style={styles.currentPlanName}>{user.subscription.plan}</Text>
                <Text style={styles.currentPlanStatus}>
                  {t('profile.subscription.status')}: {user.subscription.status}
                </Text>
              </View>
              <View style={styles.activeBadge}>
                <Text style={styles.activeBadgeText}>{t('profile.subscription.active')}</Text>
              </View>
            </View>
            {user.subscription.end_date && (
              <Text style={styles.renewalDate}>
                {t('profile.subscription.renewsOn')} {user.subscription.end_date}
              </Text>
            )}
          </View>
        ) : (
          <View style={styles.noPlanCard}>
            <Text style={styles.noPlanIcon}>📺</Text>
            <Text style={styles.noPlanText}>{t('profile.subscription.noActivePlan')}</Text>
          </View>
        )}
      </GlassView>

      {/* Upgrade Options */}
      <GlassView style={styles.contentCard}>
        <Text style={styles.sectionTitle}>{t('profile.subscription.availablePlans')}</Text>
        <Text style={styles.upgradeSubtitle}>{t('profile.subscription.choosePlan')}</Text>

        <View style={styles.plansGrid}>
          {SUBSCRIPTION_PLANS.map((plan) => {
            const isCurrentPlan = user?.subscription?.plan?.toLowerCase() === plan.id;
            return (
              <View
                key={plan.id}
                style={[
                  styles.planCard,
                  plan.recommended && styles.planCardRecommended,
                  isCurrentPlan && styles.planCardCurrent,
                ]}
              >
                {plan.recommended && (
                  <View style={styles.recommendedBadge}>
                    <Text style={styles.recommendedText}>{t('profile.subscription.recommended')}</Text>
                  </View>
                )}
                <Text style={styles.planCardName}>{t(plan.nameKey)}</Text>
                <Text style={styles.planCardPrice}>{t(plan.priceKey)}</Text>
                <View style={styles.planFeatures}>
                  {plan.features.map((feature, index) => (
                    <View key={index} style={styles.featureItem}>
                      <Text style={styles.featureCheck}>✓</Text>
                      <Text style={styles.featureText}>{t(feature)}</Text>
                    </View>
                  ))}
                </View>
                <GlassButton
                  title={isCurrentPlan ? t('profile.subscription.currentPlan') : t('profile.subscription.selectPlan')}
                  onPress={() => !isCurrentPlan && navigation.navigate('Subscribe', { plan: plan.id })}
                  variant={plan.recommended ? 'primary' : 'secondary'}
                  disabled={isCurrentPlan}
                  style={styles.selectPlanButton}
                />
              </View>
            );
          })}
        </View>
      </GlassView>

      {/* Cancel Subscription */}
      {user?.subscription && (
        <GlassView style={styles.contentCard}>
          <Text style={styles.sectionTitle}>{t('profile.subscription.manageSubscription')}</Text>
          <TouchableOpacity style={styles.cancelButton}>
            <Text style={styles.cancelButtonText}>{t('profile.subscription.cancelSubscription')}</Text>
          </TouchableOpacity>
          <Text style={styles.cancelNote}>{t('profile.subscription.cancelNote')}</Text>
        </GlassView>
      )}
    </ScrollView>
  );
};
