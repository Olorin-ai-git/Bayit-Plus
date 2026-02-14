/**
 * CouponShop - Points redemption shop with coupon grid
 *
 * Features:
 * - Grid of available coupons with point costs
 * - Affordability indicators
 * - Redeem action with confirmation
 * - RTL support, accessibility
 */

import React, { useCallback } from 'react';
import { View, Text, FlatList, Pressable, Image } from 'react-native';
import { useTranslation } from 'react-i18next';
import { useDirection } from '@bayit/shared-hooks';
import { NativeIcon } from '@olorin/shared-icons/native';
import { Colors } from '../../theme/colors';
import { styles } from './CouponShop.styles';
import logger from '@/utils/logger';

const shopLogger = logger.scope('CouponShop');

interface Coupon {
  id: string;
  title: string;
  description: string;
  image_url?: string;
  point_cost: number;
  category: string;
  available: boolean;
}

interface CouponShopProps {
  coupons: Coupon[];
  userPoints: number;
  onRedeem: (couponId: string) => void;
}

const NUM_COLUMNS = 2;

export const CouponShop: React.FC<CouponShopProps> = ({ coupons, userPoints, onRedeem }) => {
  const { t } = useTranslation();
  const { isRTL, textAlign } = useDirection();

  const handleRedeem = useCallback((coupon: Coupon) => {
    if (userPoints < coupon.point_cost || !coupon.available) return;
    onRedeem(coupon.id);
    shopLogger.info('Coupon redeemed', { couponId: coupon.id, cost: coupon.point_cost });
  }, [userPoints, onRedeem]);

  const renderCoupon = useCallback(({ item }: { item: Coupon }) => {
    const canAfford = userPoints >= item.point_cost;
    const isRedeemable = canAfford && item.available;
    return (
      <View style={styles.couponCard}>
        {item.image_url ? (
          <Image source={{ uri: item.image_url }} style={styles.couponImage}
            resizeMode="cover" accessibilityLabel={item.title} />
        ) : (
          <View style={styles.couponImagePlaceholder}>
            <NativeIcon name="gift" size="lg" color={Colors.Primary.p400} />
          </View>
        )}
        <View style={styles.couponContent}>
          <Text style={[styles.couponTitle, { textAlign }]} numberOfLines={2}
            accessibilityLabel={item.title}>{item.title}</Text>
          <Text style={[styles.couponDescription, { textAlign }]} numberOfLines={2}>
            {item.description}
          </Text>
          <View style={[styles.costRow, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}>
            <NativeIcon name="coin" size="xs"
              color={canAfford ? Colors.Special.gold : Colors.Text.disabled} />
            <Text style={[styles.costText, !canAfford && styles.costTextInsufficient]}>
              {item.point_cost.toLocaleString()}
            </Text>
          </View>
          <Pressable style={[styles.redeemButton, !isRedeemable && styles.redeemButtonDisabled]}
            onPress={() => handleRedeem(item)} disabled={!isRedeemable}
            accessibilityRole="button"
            accessibilityLabel={t('rewards.shop.redeemLabel', { title: item.title })}
            accessibilityHint={isRedeemable ? t('rewards.shop.redeemHint') : t('rewards.shop.cannotAffordHint')}
            accessibilityState={{ disabled: !isRedeemable }}>
            <Text style={[styles.redeemText, !isRedeemable && styles.redeemTextDisabled]}>
              {canAfford ? t('rewards.shop.redeem') : t('rewards.shop.notEnoughPoints')}
            </Text>
          </Pressable>
        </View>
        {!item.available && (
          <View style={styles.unavailableBadge}>
            <Text style={styles.unavailableText}>{t('rewards.shop.soldOut')}</Text>
          </View>
        )}
      </View>
    );
  }, [userPoints, isRTL, textAlign, handleRedeem, t]);

  return (
    <View style={styles.container} accessibilityRole="list"
      accessibilityLabel={t('rewards.shop.title')}>
      <Text style={[styles.title, { textAlign }]}>{t('rewards.shop.title')}</Text>
      <Text style={[styles.subtitle, { textAlign }]}>
        {t('rewards.shop.availablePoints', { points: userPoints.toLocaleString() })}
      </Text>
      <FlatList data={coupons} renderItem={renderCoupon} keyExtractor={(item) => item.id}
        numColumns={NUM_COLUMNS} columnWrapperStyle={styles.columnWrapper}
        scrollEnabled={false} showsVerticalScrollIndicator={false} />
    </View>
  );
};

export default CouponShop;
