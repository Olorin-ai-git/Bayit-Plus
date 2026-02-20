import { useState, useEffect } from 'react';
import { View, Text, Pressable, ScrollView, StyleSheet, ActivityIndicator } from 'react-native';
import { Gift, Check, AlertCircle } from 'lucide-react';
import { colors, spacing, borderRadius, fontSize } from '@olorin/design-tokens';
import api from '@/services/api';
import { useMissionsStore } from '@/stores/missionsStore';

interface Coupon {
  coupon_id: string;
  partner_name: string;
  title: string;
  description: string;
  shekel_cost: number;
  original_value: string;
  image_url: string;
  remaining_quantity: number;
}

export function CouponGrid() {
  const { walletBalance, fetchBalance } = useMissionsStore();
  const balance = walletBalance?.balance ?? 0;
  const [coupons, setCoupons] = useState<Coupon[]>([]);
  const [loading, setLoading] = useState(true);
  const [redeeming, setRedeeming] = useState<string | null>(null);
  const [redeemed, setRedeemed] = useState<Set<string>>(new Set());

  useEffect(() => {
    loadCoupons();
  }, []);

  const loadCoupons = async () => {
    setLoading(true);
    const data = await api.get('/coupons/available') as Coupon[];
    setCoupons(data);
    setLoading(false);
  };

  const handleRedeem = async (couponId: string) => {
    setRedeeming(couponId);
    await api.post('/coupons/redeem', { coupon_id: couponId });
    setRedeemed(prev => new Set(prev).add(couponId));
    setRedeeming(null);
    fetchBalance();
  };

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator color={colors.primary[400]} />
      </View>
    );
  }

  return (
    <ScrollView contentContainerStyle={styles.grid}>
      {coupons.map(coupon => {
        const isRedeemed = redeemed.has(coupon.coupon_id);
        const canAfford = (balance ?? 0) >= coupon.shekel_cost;
        const isRedeeming = redeeming === coupon.coupon_id;

        return (
          <View key={coupon.coupon_id} style={styles.card}>
            <View style={styles.cardHeader}>
              <Gift size={18} color={colors.primary[400]} />
              <Text style={styles.partnerName}>{coupon.partner_name}</Text>
            </View>
            <Text style={styles.couponTitle}>{coupon.title}</Text>
            <Text style={styles.couponDesc} numberOfLines={2}>{coupon.description}</Text>
            <View style={styles.priceRow}>
              <Text style={styles.cost}>{coupon.shekel_cost} Shekels</Text>
              <Text style={styles.originalValue}>{coupon.original_value}</Text>
            </View>
            <Pressable
              style={[
                styles.redeemButton,
                isRedeemed && styles.redeemedButton,
                !canAfford && !isRedeemed && styles.disabledButton,
              ]}
              onPress={() => !isRedeemed && canAfford && handleRedeem(coupon.coupon_id)}
              disabled={isRedeemed || !canAfford || isRedeeming}
            >
              {isRedeemed ? (
                <><Check size={16} color={colors.success[400]} /><Text style={styles.redeemedText}>Redeemed</Text></>
              ) : !canAfford ? (
                <><AlertCircle size={16} color={colors.textSecondary} /><Text style={styles.disabledText}>Not enough</Text></>
              ) : (
                <Text style={styles.redeemText}>{isRedeeming ? 'Redeeming...' : 'Redeem'}</Text>
              )}
            </Pressable>
          </View>
        );
      })}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  center: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: spacing.xl },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.md, padding: spacing.sm },
  card: {
    backgroundColor: `${colors.surface}CC`, borderRadius: borderRadius.xl,
    padding: spacing.md, width: 280, borderWidth: 1, borderColor: `${colors.border}40`,
  },
  cardHeader: { flexDirection: 'row', alignItems: 'center', gap: spacing.xs, marginBottom: spacing.sm },
  partnerName: { fontSize: fontSize.xs, color: colors.primary[300], fontWeight: '600' },
  couponTitle: { fontSize: fontSize.base, fontWeight: '700', color: colors.textPrimary, marginBottom: 4 },
  couponDesc: { fontSize: fontSize.sm, color: colors.textSecondary, marginBottom: spacing.sm },
  priceRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: spacing.sm },
  cost: { fontSize: fontSize.base, fontWeight: '700', color: colors.warning[400] },
  originalValue: { fontSize: fontSize.sm, color: colors.textSecondary },
  redeemButton: {
    backgroundColor: colors.primary[500], borderRadius: borderRadius.lg,
    paddingVertical: spacing.sm, alignItems: 'center', flexDirection: 'row',
    justifyContent: 'center', gap: spacing.xs,
  },
  redeemedButton: { backgroundColor: `${colors.success[500]}20` },
  disabledButton: { backgroundColor: `${colors.surface}80` },
  redeemText: { color: colors.textPrimary, fontWeight: '600' },
  redeemedText: { color: colors.success[400], fontWeight: '600' },
  disabledText: { color: colors.textSecondary },
});
