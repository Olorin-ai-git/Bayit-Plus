/**
 * AvatarWardrobeScreen - Outfit catalog for child avatar customization
 *
 * FlatList grid (2 columns phone, 3 tablet), rarity-colored badges,
 * purchase/equip actions, shekel balance header, pull-to-refresh.
 */
import React, { useEffect, useState, useCallback } from 'react';
import { View, Text, FlatList, Image, Pressable, SafeAreaView, RefreshControl } from 'react-native';
import { useRoute } from '@react-navigation/native';
import { useTranslation } from 'react-i18next';
import ReactNativeHapticFeedback from 'react-native-haptic-feedback';
import { useDirection } from '@bayit/shared-hooks';
import { spacing } from '@olorin/design-tokens';
import { NativeIcon } from '@olorin/shared-icons/native';
import { GlassButton, GlassLoadingSpinner } from '@bayit/shared/ui';
import api from '@bayit/shared-services/api';
import { getGridColumns } from '../utils/responsive';
import { Colors } from '../theme/colors';
import logger from '@/utils/logger';

const wardrobeLogger = logger.scope('AvatarWardrobeScreen');
const RARITY_COLORS: Record<string, string> = {
  common: '#ABB2BF', uncommon: '#98C379', rare: '#61AFEF', epic: '#C678DD', legendary: '#E5C07B',
};

interface Outfit {
  id: string; outfit_id: string; name: string; name_he: string;
  description: string; description_he: string; category: string; rarity: string;
  thumbnail_url: string; shekel_price: number; is_purchasable: boolean;
  is_reward_only: boolean; required_mission_count: number; owned: boolean;
}

const OutfitCard: React.FC<{ outfit: Outfit; onPress: () => void; isSelected: boolean; lang: string }> = (
  { outfit, onPress, isSelected, lang },
) => {
  const { textAlign } = useDirection();
  const rarityColor = RARITY_COLORS[outfit.rarity] || RARITY_COLORS.common;
  return (
    <Pressable onPress={() => { ReactNativeHapticFeedback.trigger('impactLight'); onPress(); }} className="flex-1 m-1 min-h-[48px]">
      <View className={`bg-black/30 rounded-lg overflow-hidden ${isSelected ? 'border-2' : ''}`}
        style={isSelected ? { borderColor: rarityColor } : undefined}>
        {outfit.thumbnail_url ? (
          <Image source={{ uri: outfit.thumbnail_url }} className="w-full aspect-square" resizeMode="cover" />
        ) : (
          <View className="w-full aspect-square bg-white/5 justify-center items-center">
            <NativeIcon name="shirt" size="xl" color={Colors.Text.muted} />
          </View>
        )}
        <View className="absolute top-1.5 right-1.5 rounded px-1.5 py-0.5" style={{ backgroundColor: rarityColor }}>
          <Text className="text-[10px] font-bold text-black">{outfit.rarity}</Text>
        </View>
        {outfit.owned && (
          <View className="absolute top-1.5 left-1.5 bg-green-500 rounded px-1.5 py-0.5">
            <NativeIcon name="checkCircle" size="xs" color={Colors.Text.primary} />
          </View>
        )}
        <View className="p-2">
          <Text style={{ textAlign }} className="text-sm font-semibold text-white" numberOfLines={1}>
            {lang === 'he' ? outfit.name_he : outfit.name}
          </Text>
          {!outfit.owned && (
            <View className="flex-row items-center mt-1">
              <NativeIcon name="coin" size="xs" color={Colors.Special.gold} />
              <Text className="text-xs text-yellow-400 ml-1">{outfit.shekel_price}</Text>
            </View>
          )}
        </View>
      </View>
    </Pressable>
  );
};

export const AvatarWardrobeScreen: React.FC = () => {
  const route = useRoute<any>();
  const { t, i18n } = useTranslation();
  const { isRTL, textAlign } = useDirection();
  const { avatarId, profileId } = route.params;
  const numColumns = getGridColumns({ phone: 2, tablet: 3 });

  const [isLoading, setIsLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [outfits, setOutfits] = useState<Outfit[]>([]);
  const [selected, setSelected] = useState<Outfit | null>(null);
  const [balance, setBalance] = useState(0);
  const [activeOutfitId, setActiveOutfitId] = useState<string | null>(null);
  const [purchasing, setPurchasing] = useState(false);

  const loadData = useCallback(async () => {
    try {
      const [catalog, inventory, bal] = await Promise.all([
        api.get(`/avatar-outfits/catalog?avatar_id=${avatarId}`),
        api.get(`/avatar-outfits/avatars/${avatarId}/inventory`),
        api.get(`/shekels/balance?profile_id=${profileId}`),
      ]);
      setOutfits(catalog.outfits || []);
      setActiveOutfitId(inventory.active_outfit_id || null);
      setBalance(bal.balance || 0);
    } catch (err) { wardrobeLogger.error('Load wardrobe failed', { avatarId, error: err }); }
    finally { setIsLoading(false); }
  }, [avatarId, profileId]);

  useEffect(() => { loadData(); }, [loadData]);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    ReactNativeHapticFeedback.trigger('impactLight');
    await loadData();
    setRefreshing(false);
  }, [loadData]);

  const handlePurchase = useCallback(async () => {
    if (!selected || selected.owned) return;
    setPurchasing(true);
    try {
      await api.post(`/avatar-outfits/avatars/${avatarId}/purchase`, {
        profile_id: profileId, outfit_id: selected.outfit_id,
      });
      ReactNativeHapticFeedback.trigger('notificationSuccess');
      await loadData();
      setSelected(null);
    } catch (err) {
      wardrobeLogger.error('Purchase failed', { outfitId: selected.outfit_id, error: err });
      ReactNativeHapticFeedback.trigger('notificationError');
    } finally { setPurchasing(false); }
  }, [selected, avatarId, profileId, loadData]);

  const handleEquip = useCallback(async () => {
    if (!selected || !selected.owned) return;
    try {
      const next = activeOutfitId === selected.outfit_id ? null : selected.outfit_id;
      await api.post(`/avatar-outfits/avatars/${avatarId}/equip`, { outfit_id: next });
      setActiveOutfitId(next);
      ReactNativeHapticFeedback.trigger('impactMedium');
    } catch (err) { wardrobeLogger.error('Equip failed', { outfitId: selected.outfit_id, error: err }); }
  }, [selected, avatarId, activeOutfitId]);

  if (isLoading) {
    return (
      <SafeAreaView className="flex-1 justify-center items-center" style={{ backgroundColor: Colors.Background.elevated }}>
        <GlassLoadingSpinner size="large" />
      </SafeAreaView>
    );
  }
  return (
    <SafeAreaView className="flex-1" style={{ backgroundColor: Colors.Background.elevated }}>
      <FlatList data={outfits} keyExtractor={(item) => item.outfit_id} numColumns={numColumns}
        key={`wardrobe-${numColumns}`}
        contentContainerStyle={{ paddingHorizontal: spacing.sm, paddingBottom: spacing.xl }}
        ListHeaderComponent={
          <View className="px-4 pt-6 pb-4">
            <View className="flex-row items-center justify-between" style={{ flexDirection: isRTL ? 'row' : 'row-reverse' }}>
              <Text style={{ textAlign }} className="text-2xl font-bold text-white">{t('wardrobe.title')}</Text>
              <View className="flex-row items-center bg-black/30 rounded-full px-3 py-1.5">
                <NativeIcon name="coin" size="sm" color={Colors.Special.gold} />
                <Text className="text-base font-bold text-yellow-400 ml-1">{balance}</Text>
              </View>
            </View>
          </View>
        }
        renderItem={({ item }) => (
          <OutfitCard outfit={item} lang={i18n.language} isSelected={selected?.outfit_id === item.outfit_id}
            onPress={() => setSelected(item)} />
        )}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh}
            tintColor={Colors.Special.gold} colors={[Colors.Special.gold]} />
        }
        showsVerticalScrollIndicator={false} />
      {selected && (
        <View className="px-4 py-3 border-t border-white/10" style={{ backgroundColor: Colors.Background.elevated }}>
          <Text style={{ textAlign }} className="text-lg font-bold text-white" numberOfLines={1}>
            {i18n.language === 'he' ? selected.name_he : selected.name}
          </Text>
          <Text style={{ textAlign }} className="text-sm text-white/60 mt-1" numberOfLines={2}>
            {i18n.language === 'he' ? selected.description_he : selected.description}
          </Text>
          <View className="flex-row gap-2 mt-3">
            {selected.owned ? (
              <GlassButton variant={activeOutfitId === selected.outfit_id ? 'secondary' : 'primary'}
                onPress={handleEquip} className="flex-1">
                {activeOutfitId === selected.outfit_id ? t('wardrobe.unequip') : t('wardrobe.equip')}
              </GlassButton>
            ) : (
              <GlassButton variant="primary" onPress={handlePurchase}
                disabled={purchasing || balance < selected.shekel_price} className="flex-1">
                {purchasing ? t('common.loading') : `${t('wardrobe.buy')} (${selected.shekel_price})`}
              </GlassButton>
            )}
          </View>
        </View>
      )}
    </SafeAreaView>
  );
};
export default AvatarWardrobeScreen;
