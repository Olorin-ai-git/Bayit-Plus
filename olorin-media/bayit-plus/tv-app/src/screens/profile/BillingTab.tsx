/**
 * BillingTab component - Payment methods and billing history.
 */

import React from 'react';
import { View, Text, TouchableOpacity, ScrollView, ActivityIndicator } from 'react-native';
import { useTranslation } from 'react-i18next';
import { GlassView, GlassButton } from '../../components';
import { colors } from '../../theme';
import { styles } from './ProfileScreen.styles';
import { PaymentMethod, BillingHistoryItem } from './types';

interface BillingTabProps {
  user: { name?: string } | null;
  paymentMethods: PaymentMethod[];
  billingHistory: BillingHistoryItem[];
  isLoading: boolean;
}

export const BillingTab: React.FC<BillingTabProps> = ({
  user,
  paymentMethods,
  billingHistory,
  isLoading,
}) => {
  const { t } = useTranslation();

  if (isLoading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  return (
    <ScrollView showsVerticalScrollIndicator={false}>
      {/* Payment Methods */}
      <GlassView style={styles.contentCard}>
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>{t('profile.billing.paymentMethods')}</Text>
          <TouchableOpacity style={styles.addButton}>
            <Text style={styles.addButtonText}>+ {t('profile.billing.addCard')}</Text>
          </TouchableOpacity>
        </View>

        {paymentMethods.length === 0 ? (
          <Text style={styles.emptyText}>{t('profile.billing.noPaymentMethods')}</Text>
        ) : (
          paymentMethods.map((method) => (
            <View key={method.id} style={styles.paymentMethod}>
              <View style={styles.cardInfo}>
                <Text style={styles.cardIcon}>💳</Text>
                <View style={styles.cardDetails}>
                  <Text style={styles.cardType}>
                    {method.type.toUpperCase()} •••• {method.last4}
                  </Text>
                  <Text style={styles.cardExpiry}>
                    {t('profile.billing.expires')} {method.expiry}
                  </Text>
                </View>
              </View>
              <View style={styles.cardActions}>
                {method.is_default && (
                  <View style={styles.defaultBadge}>
                    <Text style={styles.defaultBadgeText}>{t('profile.billing.default')}</Text>
                  </View>
                )}
                <TouchableOpacity style={styles.cardActionButton}>
                  <Text style={styles.cardActionText}>{t('common.edit')}</Text>
                </TouchableOpacity>
              </View>
            </View>
          ))
        )}
      </GlassView>

      {/* Billing History */}
      <GlassView style={styles.contentCard}>
        <Text style={styles.sectionTitle}>{t('profile.billing.history')}</Text>

        {billingHistory.length === 0 ? (
          <Text style={styles.emptyText}>{t('profile.billing.noHistory')}</Text>
        ) : (
          <View style={styles.billingTable}>
            <View style={styles.billingHeader}>
              <Text style={styles.billingHeaderText}>{t('profile.billing.date')}</Text>
              <Text style={styles.billingHeaderText}>{t('profile.billing.description')}</Text>
              <Text style={styles.billingHeaderText}>{t('profile.billing.amount')}</Text>
              <Text style={styles.billingHeaderText}>{t('profile.billing.status')}</Text>
            </View>
            {billingHistory.map((item) => (
              <View key={item.id} style={styles.billingRow}>
                <Text style={styles.billingCell}>{item.date}</Text>
                <Text style={styles.billingCell}>{item.description}</Text>
                <Text style={styles.billingCell}>₪{item.amount.toFixed(2)}</Text>
                <View style={[styles.statusBadge, item.status === 'paid' && styles.statusPaid]}>
                  <Text style={styles.statusText}>
                    {item.status === 'paid' ? t('profile.billing.paid') : t('profile.billing.pending')}
                  </Text>
                </View>
              </View>
            ))}
          </View>
        )}

        <TouchableOpacity style={styles.downloadInvoice}>
          <Text style={styles.downloadInvoiceText}>📄 {t('profile.billing.downloadInvoices')}</Text>
        </TouchableOpacity>
      </GlassView>

      {/* Billing Address */}
      <GlassView style={styles.contentCard}>
        <Text style={styles.sectionTitle}>{t('profile.billing.billingAddress')}</Text>
        <View style={styles.addressCard}>
          <Text style={styles.addressText}>{user?.name}</Text>
          <Text style={styles.addressText}>{t('profile.address.line1')}</Text>
          <Text style={styles.addressText}>{t('profile.address.line2')}</Text>
        </View>
        <GlassButton
          title={t('profile.billing.editAddress')}
          onPress={() => {}}
          variant="secondary"
          style={styles.editAddressButton}
        />
      </GlassView>
    </ScrollView>
  );
};
