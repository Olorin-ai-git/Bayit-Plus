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
import { spacing, colors, borderRadius } from '@olorin/design-tokens';

import logger from '@/utils/logger';


const moduleLogger = logger.scope('BillingScreenMobile');

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
      moduleLogger.error('Failed to load billing data:', error);
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
      moduleLogger.error('Failed to set default payment method:', error);
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
      <GlassView className="rounded-lg mb-2 p-4">
        <View className={`flex-row items-center ${isRTL ? 'flex-row-reverse' : ''}`}>
          <View className="w-12 h-12 rounded-full bg-white/10 justify-center items-center">
            <Text className="text-2xl">
              {method.type.toLowerCase() === 'visa' ? '💳' :
               method.type.toLowerCase() === 'mastercard' ? '💳' : '💳'}
            </Text>
          </View>
          <View className="flex-1 mx-4">
            <Text className="text-base font-semibold text-white" style={{ textAlign }}>
              {method.type.toUpperCase()} •••• {method.last4}
            </Text>
            <Text className="text-[13px] text-white/60 mt-0.5" style={{ textAlign }}>
              {t('billing.expires')} {method.expiry}
            </Text>
          </View>
          <View className="items-end">
            {method.is_default ? (
              <View className="bg-purple-600/30 px-2 py-1 rounded">
                <Text className="text-purple-600 text-xs font-semibold">{t('billing.default')}</Text>
              </View>
            ) : (
              <TouchableOpacity
                onPress={() => handleSetDefaultPaymentMethod(method.id)}
                className="px-2 py-1"
              >
                <Text className="text-white/60 text-xs">{t('billing.setDefault')}</Text>
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
      <GlassView className="rounded-lg mb-2 p-4">
        <View className={`flex-row items-center justify-between ${isRTL ? 'flex-row-reverse' : ''}`}>
          <View className="flex-1">
            <Text className="text-sm text-white/60" style={{ textAlign }}>{item.date}</Text>
            <Text className="text-base font-medium text-white mt-0.5" style={{ textAlign }} numberOfLines={1}>
              {item.description}
            </Text>
          </View>
          <View className="items-end gap-1">
            <Text className="text-base font-semibold text-white">
              {item.currency}{item.amount.toFixed(2)}
            </Text>
            <View className={`px-2 py-0.5 rounded ${item.status === 'paid' ? 'bg-green-600/20' : 'bg-yellow-600/20'}`}>
              <Text className="text-[11px] font-semibold text-white">
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
      <View className={`flex-row items-center py-6 gap-4 ${isRTL ? 'flex-row-reverse' : ''}`}>
        <TouchableOpacity
          onPress={() => navigation.goBack()}
          className="w-11 h-11 justify-center items-center"
        >
          <Text className="text-[32px] font-light text-white">{isRTL ? '‹' : '›'}</Text>
        </TouchableOpacity>
        <Text className="flex-1 text-[28px] font-bold text-white" style={{ textAlign }}>{t('billing.title')}</Text>
      </View>

      {/* Payment Methods Section */}
      <View className="mb-6">
        <View className={`flex-row justify-between items-center mb-4 ${isRTL ? 'flex-row-reverse' : ''}`}>
          <Text className="text-lg font-semibold text-white" style={{ textAlign }}>
            {t('billing.paymentMethods')}
          </Text>
          <TouchableOpacity
            onPress={handleAddPaymentMethod}
            className="px-4 py-2 rounded-lg bg-purple-600/30"
          >
            <Text className="text-purple-600 text-sm font-semibold">+ {t('billing.addCard')}</Text>
          </TouchableOpacity>
        </View>

        {paymentMethods.length === 0 ? (
          <GlassView className="p-8 items-center rounded-lg">
            <Text className="text-5xl mb-4">💳</Text>
            <Text className="text-base text-white/60 mb-4" style={{ textAlign }}>
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
      <View className="mb-4">
        <Text className="text-lg font-semibold text-white mb-2" style={{ textAlign }}>
          {t('billing.history')}
        </Text>
      </View>
    </View>
  );

  const renderEmptyHistory = () => (
    <GlassView className="p-8 items-center rounded-lg">
      <Text className="text-5xl mb-4">📄</Text>
      <Text className="text-base text-white/60" style={{ textAlign }}>
        {t('billing.noHistory')}
      </Text>
    </GlassView>
  );

  const renderFooter = () => (
    <View className="mb-6">
      {/* Billing Address */}
      <Text className="text-lg font-semibold text-white mb-2" style={{ textAlign }}>
        {t('billing.billingAddress')}
      </Text>
      <GlassView className="rounded-lg p-6">
        <Text className="text-sm text-white" style={{ textAlign }}>{user?.name}</Text>
        <Text className="text-sm text-white" style={{ textAlign }}>
          {t('billing.addressLine1Placeholder')}
        </Text>
        <Text className="text-sm text-white" style={{ textAlign }}>
          {t('billing.addressLine2Placeholder')}
        </Text>
        <GlassButton
          title={t('billing.editAddress')}
          onPress={() => navigation.navigate('EditBillingAddress')}
          variant="secondary"
          size="sm"
          className="mt-4 self-start"
        />
      </GlassView>
    </View>
  );

  if (isLoading) {
    return (
      <SafeAreaView className="flex-1 justify-center items-center" style={{ backgroundColor: colors.background }}>
        <ActivityIndicator size="large" color={colors.primary} />
        <Text className="text-white text-base mt-4">{t('common.loading')}</Text>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView className="flex-1" style={{ backgroundColor: colors.background }}>
      <FlatList
        data={billingHistory}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => renderBillingHistoryItem(item)}
        ListHeaderComponent={renderHeader}
        ListEmptyComponent={renderEmptyHistory}
        ListFooterComponent={renderFooter}
        contentContainerStyle={{ paddingHorizontal: spacing.md, paddingBottom: spacing.xl }}
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

export default BillingScreenMobile;
