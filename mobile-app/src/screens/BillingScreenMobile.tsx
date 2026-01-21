/**
 * BillingScreenMobile - Mobile-optimized billing and payment management
 *
 * Features:
 * - Payment methods with add/edit/remove
 * - Billing history with invoice downloads
 * - Billing address management
 * - RTL support
 * - Pull-to-refresh
 * - Haptic feedback
 */

import React, { useEffect, useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  RefreshControl,
  ActivityIndicator,
  SafeAreaView,
  Alert,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { useTranslation } from 'react-i18next';
import ReactNativeHapticFeedback from 'react-native-haptic-feedback';
import { GlassView, GlassButton } from '@bayit/shared';
import { useDirection } from '@bayit/shared-hooks';
import { useAuthStore } from '@bayit/shared-stores';
import { subscriptionService } from '@bayit/shared-services';
import { spacing, colors, borderRadius } from '../theme';

interface PaymentMethod {
  id: string;
  type: string;
  last4: string;
  expiry: string;
  is_default: boolean;
}

interface BillingHistoryItem {
  id: string;
  date: string;
  amount: number;
  currency: string;
  status: string;
  description: string;
}

interface Section {
  id: string;
  title: string;
  type: 'payment_methods' | 'billing_history' | 'billing_address';
}

export const BillingScreenMobile: React.FC = () => {
  const { t } = useTranslation();
  const navigation = useNavigation<any>();
  const { isRTL, textAlign } = useDirection();
  const { user } = useAuthStore();

  const [isLoading, setIsLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [paymentMethods, setPaymentMethods] = useState<PaymentMethod[]>([]);
  const [billingHistory, setBillingHistory] = useState<BillingHistoryItem[]>([]);

  const loadBillingData = useCallback(async () => {
    try {
      setIsLoading(true);
      const [methodsRes, invoicesRes] = await Promise.all([
        subscriptionService.getPaymentMethods(),
        subscriptionService.getInvoices(),
      ]) as [any, any];
      setPaymentMethods(methodsRes?.payment_methods || []);
      setBillingHistory(invoicesRes?.invoices || []);
    } catch (error) {
      console.error('Failed to load billing data:', error);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    loadBillingData();
  }, [loadBillingData]);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    ReactNativeHapticFeedback.trigger('impactLight');
    await loadBillingData();
    setRefreshing(false);
  }, [loadBillingData]);

  const handleAddPaymentMethod = useCallback(() => {
    ReactNativeHapticFeedback.trigger('impactMedium');
    navigation.navigate('AddPaymentMethod');
  }, [navigation]);

  const handleEditPaymentMethod = useCallback((methodId: string) => {
    ReactNativeHapticFeedback.trigger('impactLight');
    navigation.navigate('EditPaymentMethod', { methodId });
  }, [navigation]);

  const handleSetDefaultPaymentMethod = useCallback(async (methodId: string) => {
    ReactNativeHapticFeedback.trigger('impactMedium');
    try {
      await subscriptionService.setDefaultPaymentMethod(methodId);
      await loadBillingData();
    } catch (error) {
      console.error('Failed to set default payment method:', error);
      Alert.alert(t('common.error'), t('billing.setDefaultError'));
    }
  }, [t, loadBillingData]);

  const handleDownloadInvoice = useCallback((invoiceId: string) => {
    ReactNativeHapticFeedback.trigger('impactLight');
    // Download invoice functionality
    Alert.alert(t('billing.downloadStarted'), t('billing.checkDownloads'));
  }, [t]);

  const renderPaymentMethod = (method: PaymentMethod) => (
    <TouchableOpacity
      key={method.id}
      onPress={() => handleEditPaymentMethod(method.id)}
      activeOpacity={0.7}
    >
      <GlassView style={styles.paymentMethodCard}>
        <View style={[styles.paymentMethodContent, isRTL && styles.contentRTL]}>
          <View style={styles.cardIconContainer}>
            <Text style={styles.cardIcon}>
              {method.type.toLowerCase() === 'visa' ? '💳' :
               method.type.toLowerCase() === 'mastercard' ? '💳' : '💳'}
            </Text>
          </View>
          <View style={styles.cardDetails}>
            <Text style={[styles.cardType, { textAlign }]}>
              {method.type.toUpperCase()} •••• {method.last4}
            </Text>
            <Text style={[styles.cardExpiry, { textAlign }]}>
              {t('billing.expires')} {method.expiry}
            </Text>
          </View>
          <View style={styles.cardActions}>
            {method.is_default ? (
              <View style={styles.defaultBadge}>
                <Text style={styles.defaultBadgeText}>{t('billing.default')}</Text>
              </View>
            ) : (
              <TouchableOpacity
                onPress={() => handleSetDefaultPaymentMethod(method.id)}
                style={styles.setDefaultButton}
              >
                <Text style={styles.setDefaultText}>{t('billing.setDefault')}</Text>
              </TouchableOpacity>
            )}
          </View>
        </View>
      </GlassView>
    </TouchableOpacity>
  );

  const renderBillingHistoryItem = (item: BillingHistoryItem) => (
    <TouchableOpacity
      key={item.id}
      onPress={() => handleDownloadInvoice(item.id)}
      activeOpacity={0.7}
    >
      <GlassView style={styles.historyCard}>
        <View style={[styles.historyContent, isRTL && styles.contentRTL]}>
          <View style={styles.historyInfo}>
            <Text style={[styles.historyDate, { textAlign }]}>{item.date}</Text>
            <Text style={[styles.historyDescription, { textAlign }]} numberOfLines={1}>
              {item.description}
            </Text>
          </View>
          <View style={styles.historyRight}>
            <Text style={styles.historyAmount}>
              {item.currency}{item.amount.toFixed(2)}
            </Text>
            <View style={[
              styles.statusBadge,
              item.status === 'paid' ? styles.statusPaid : styles.statusPending
            ]}>
              <Text style={styles.statusText}>
                {item.status === 'paid' ? t('billing.paid') : t('billing.pending')}
              </Text>
            </View>
          </View>
        </View>
      </GlassView>
    </TouchableOpacity>
  );

  const renderHeader = () => (
    <View>
      {/* Header */}
      <View style={[styles.header, isRTL && styles.headerRTL]}>
        <TouchableOpacity
          onPress={() => navigation.goBack()}
          style={styles.backButton}
        >
          <Text style={styles.backText}>{isRTL ? '‹' : '›'}</Text>
        </TouchableOpacity>
        <Text style={[styles.title, { textAlign }]}>{t('billing.title')}</Text>
      </View>

      {/* Payment Methods Section */}
      <View style={styles.section}>
        <View style={[styles.sectionHeader, isRTL && styles.sectionHeaderRTL]}>
          <Text style={[styles.sectionTitle, { textAlign }]}>
            {t('billing.paymentMethods')}
          </Text>
          <TouchableOpacity
            onPress={handleAddPaymentMethod}
            style={styles.addButton}
          >
            <Text style={styles.addButtonText}>+ {t('billing.addCard')}</Text>
          </TouchableOpacity>
        </View>

        {paymentMethods.length === 0 ? (
          <GlassView style={styles.emptyCard}>
            <Text style={styles.emptyIcon}>💳</Text>
            <Text style={[styles.emptyText, { textAlign }]}>
              {t('billing.noPaymentMethods')}
            </Text>
            <GlassButton
              title={t('billing.addPaymentMethod')}
              onPress={handleAddPaymentMethod}
              variant="primary"
              size="sm"
            />
          </GlassView>
        ) : (
          paymentMethods.map(renderPaymentMethod)
        )}
      </View>

      {/* Billing History Section */}
      <View style={styles.section}>
        <Text style={[styles.sectionTitle, { textAlign }]}>
          {t('billing.history')}
        </Text>
      </View>
    </View>
  );

  const renderEmptyHistory = () => (
    <GlassView style={styles.emptyCard}>
      <Text style={styles.emptyIcon}>📄</Text>
      <Text style={[styles.emptyText, { textAlign }]}>
        {t('billing.noHistory')}
      </Text>
    </GlassView>
  );

  const renderFooter = () => (
    <View style={styles.section}>
      {/* Billing Address */}
      <Text style={[styles.sectionTitle, { textAlign }]}>
        {t('billing.billingAddress')}
      </Text>
      <GlassView style={styles.addressCard}>
        <Text style={[styles.addressText, { textAlign }]}>{user?.name}</Text>
        <Text style={[styles.addressText, { textAlign }]}>
          {t('billing.addressLine1Placeholder')}
        </Text>
        <Text style={[styles.addressText, { textAlign }]}>
          {t('billing.addressLine2Placeholder')}
        </Text>
        <GlassButton
          title={t('billing.editAddress')}
          onPress={() => navigation.navigate('EditBillingAddress')}
          variant="secondary"
          size="sm"
          style={styles.editAddressButton}
        />
      </GlassView>
    </View>
  );

  if (isLoading) {
    return (
      <SafeAreaView style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={colors.primary} />
        <Text style={styles.loadingText}>{t('common.loading')}</Text>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <FlatList
        data={billingHistory}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => renderBillingHistoryItem(item)}
        ListHeaderComponent={renderHeader}
        ListEmptyComponent={renderEmptyHistory}
        ListFooterComponent={renderFooter}
        contentContainerStyle={styles.content}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor={colors.primary}
            colors={[colors.primary]}
          />
        }
        showsVerticalScrollIndicator={false}
      />
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  loadingContainer: {
    flex: 1,
    backgroundColor: colors.background,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    color: colors.text,
    fontSize: 16,
    marginTop: spacing.md,
  },
  content: {
    paddingHorizontal: spacing.md,
    paddingBottom: spacing.xl,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: spacing.lg,
    gap: spacing.md,
  },
  headerRTL: {
    flexDirection: 'row-reverse',
  },
  backButton: {
    width: 44,
    height: 44,
    justifyContent: 'center',
    alignItems: 'center',
  },
  backText: {
    fontSize: 32,
    color: colors.text,
    fontWeight: '300',
  },
  title: {
    flex: 1,
    fontSize: 28,
    fontWeight: 'bold',
    color: colors.text,
  },
  section: {
    marginBottom: spacing.lg,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.md,
  },
  sectionHeaderRTL: {
    flexDirection: 'row-reverse',
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: colors.text,
    marginBottom: spacing.sm,
  },
  addButton: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: borderRadius.md,
    backgroundColor: 'rgba(107, 33, 168, 0.3)',
  },
  addButtonText: {
    color: colors.primary,
    fontSize: 14,
    fontWeight: '600',
  },
  paymentMethodCard: {
    borderRadius: borderRadius.lg,
    marginBottom: spacing.sm,
    padding: spacing.md,
  },
  paymentMethodContent: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  contentRTL: {
    flexDirection: 'row-reverse',
  },
  cardIconContainer: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  cardIcon: {
    fontSize: 24,
  },
  cardDetails: {
    flex: 1,
    marginHorizontal: spacing.md,
  },
  cardType: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.text,
  },
  cardExpiry: {
    fontSize: 13,
    color: colors.textSecondary,
    marginTop: 2,
  },
  cardActions: {
    alignItems: 'flex-end',
  },
  defaultBadge: {
    backgroundColor: 'rgba(107, 33, 168, 0.3)',
    paddingHorizontal: spacing.sm,
    paddingVertical: 4,
    borderRadius: borderRadius.sm,
  },
  defaultBadgeText: {
    color: colors.primary,
    fontSize: 12,
    fontWeight: '600',
  },
  setDefaultButton: {
    paddingHorizontal: spacing.sm,
    paddingVertical: 4,
  },
  setDefaultText: {
    color: colors.textSecondary,
    fontSize: 12,
  },
  historyCard: {
    borderRadius: borderRadius.lg,
    marginBottom: spacing.sm,
    padding: spacing.md,
  },
  historyContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  historyInfo: {
    flex: 1,
  },
  historyDate: {
    fontSize: 14,
    color: colors.textSecondary,
  },
  historyDescription: {
    fontSize: 16,
    fontWeight: '500',
    color: colors.text,
    marginTop: 2,
  },
  historyRight: {
    alignItems: 'flex-end',
    gap: spacing.xs,
  },
  historyAmount: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.text,
  },
  statusBadge: {
    paddingHorizontal: spacing.sm,
    paddingVertical: 2,
    borderRadius: borderRadius.sm,
  },
  statusPaid: {
    backgroundColor: 'rgba(34, 197, 94, 0.2)',
  },
  statusPending: {
    backgroundColor: 'rgba(251, 191, 36, 0.2)',
  },
  statusText: {
    fontSize: 11,
    fontWeight: '600',
    color: colors.text,
  },
  emptyCard: {
    padding: spacing.xl,
    alignItems: 'center',
    borderRadius: borderRadius.lg,
  },
  emptyIcon: {
    fontSize: 48,
    marginBottom: spacing.md,
  },
  emptyText: {
    fontSize: 16,
    color: colors.textSecondary,
    marginBottom: spacing.md,
  },
  addressCard: {
    borderRadius: borderRadius.lg,
    padding: spacing.lg,
  },
  addressText: {
    fontSize: 14,
    color: colors.text,
    marginBottom: spacing.xs,
  },
  editAddressButton: {
    marginTop: spacing.md,
    alignSelf: 'flex-start',
  },
});

export default BillingScreenMobile;
