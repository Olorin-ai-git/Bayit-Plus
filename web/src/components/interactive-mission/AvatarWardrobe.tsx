/**
 * AvatarWardrobe Component
 * Grid gallery with rarity indicators, preview outfit on avatar
 * before purchase, shekel balance + purchase flow.
 */

import React, { useEffect, useState, useCallback } from 'react';
import { View, Text, Image, FlatList, Pressable } from 'react-native';
import { useTranslation } from 'react-i18next';
import { GlassButton } from '@bayit/shared/components/ui/GlassButton';
import { GlassLoadingSpinner } from '@bayit/shared/ui';
import api from '@/services/api';
import logger from '@bayit/shared-utils/logger';
import { styles, RARITY_COLORS } from './AvatarWardrobe.styles';

const wardrobeLogger = logger.scope('AvatarWardrobe');

interface OutfitItem {
  id: string;
  outfit_id: string;
  name: string;
  name_he: string;
  description: string;
  description_he: string;
  category: string;
  rarity: string;
  thumbnail_url: string;
  shekel_price: number;
  is_purchasable: boolean;
  is_reward_only: boolean;
  owned: boolean;
}

interface AvatarWardrobeProps {
  avatarId: string;
  profileId: string;
  shekelBalance: number;
  onBalanceChange?: () => void;
  isRTL?: boolean;
}

export function AvatarWardrobe({
  avatarId,
  profileId,
  shekelBalance,
  onBalanceChange,
  isRTL = false,
}: AvatarWardrobeProps) {
  const { t, i18n } = useTranslation();
  const isHebrew = i18n.language === 'he' || isRTL;

  const [outfits, setOutfits] = useState<OutfitItem[]>([]);
  const [selectedOutfit, setSelectedOutfit] = useState<OutfitItem | null>(null);
  const [loading, setLoading] = useState(true);
  const [purchasing, setPurchasing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchCatalog();
  }, [avatarId]);

  const fetchCatalog = async () => {
    setLoading(true);
    try {
      const data = await api.get('/avatar-outfits/catalog', { params: { avatar_id: avatarId } }) as { outfits: OutfitItem[] };
      setOutfits(data.outfits || []);
    } catch (err: any) {
      setError(err?.detail || err?.message || t('avatarWardrobe.errors.loadFailed'));
      wardrobeLogger.error('Failed to fetch catalog', err);
    } finally {
      setLoading(false);
    }
  };

  const handlePurchase = useCallback(async (outfit: OutfitItem) => {
    if (shekelBalance < outfit.shekel_price) {
      setError(t('avatarWardrobe.insufficientShekels'));
      return;
    }

    setPurchasing(true);
    try {
      await api.post(`/avatar-outfits/avatars/${avatarId}/purchase`, {
        profile_id: profileId,
        outfit_id: outfit.outfit_id,
      });
      wardrobeLogger.info('Outfit purchased', { outfitId: outfit.outfit_id });
      if (onBalanceChange) onBalanceChange();
      await fetchCatalog();
      setSelectedOutfit(null);
    } catch (err: any) {
      setError(err?.detail || err?.message || t('avatarWardrobe.errors.purchaseFailed'));
      wardrobeLogger.error('Purchase failed', err);
    } finally {
      setPurchasing(false);
    }
  }, [avatarId, profileId, shekelBalance, t, onBalanceChange]);

  const handleEquip = useCallback(async (outfitId: string | null) => {
    try {
      await api.post(`/avatar-outfits/avatars/${avatarId}/equip`, { outfit_id: outfitId });
      wardrobeLogger.info('Outfit equipped', { outfitId });
      await fetchCatalog();
    } catch (err: any) {
      setError(err?.detail || err?.message || t('avatarWardrobe.errors.equipFailed'));
    }
  }, [avatarId]);

  const renderOutfitCard = useCallback(({ item }: { item: OutfitItem }) => {
    const rarityColor = RARITY_COLORS[item.rarity] || RARITY_COLORS.common;
    const displayName = isHebrew ? item.name_he : item.name;

    return (
      <Pressable
        style={[styles.outfitCard, selectedOutfit?.id === item.id && styles.outfitCardSelected]}
        onPress={() => setSelectedOutfit(item)}
        accessibilityLabel={displayName}
      >
        {item.thumbnail_url ? (
          <Image source={{ uri: item.thumbnail_url }} style={styles.outfitImage} />
        ) : (
          <View style={styles.outfitPlaceholder} />
        )}
        <View style={[styles.rarityBadge, { backgroundColor: rarityColor }]}>
          <Text style={styles.rarityText}>{t(`avatarWardrobe.rarity.${item.rarity}`)}</Text>
        </View>
        <Text style={styles.outfitName} numberOfLines={1}>{displayName}</Text>
        {item.owned ? (
          <Text style={styles.ownedText}>{t('avatarWardrobe.owned')}</Text>
        ) : (
          <Text style={styles.priceText}>{item.shekel_price}</Text>
        )}
      </Pressable>
    );
  }, [isHebrew, selectedOutfit, t]);

  if (loading) return <View style={styles.loadingContainer}><GlassLoadingSpinner size="large" /></View>;

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>{t('avatarWardrobe.title')}</Text>
        <Text style={styles.balance}>{shekelBalance}</Text>
      </View>

      {error && <View style={styles.errorRow}><Text style={styles.errorText}>{error}</Text></View>}

      <FlatList
        data={outfits}
        renderItem={renderOutfitCard}
        keyExtractor={(item) => item.id}
        numColumns={3}
        contentContainerStyle={styles.grid}
      />

      {selectedOutfit && !selectedOutfit.owned && selectedOutfit.is_purchasable && (
        <View style={styles.purchaseBar}>
          <Text style={styles.purchaseText}>
            {isHebrew ? selectedOutfit.name_he : selectedOutfit.name} - {selectedOutfit.shekel_price}
          </Text>
          <GlassButton
            title={purchasing ? t('avatarWardrobe.purchasing') : t('avatarWardrobe.purchase')}
            onPress={() => handlePurchase(selectedOutfit)}
            variant="primary"
            size="md"
            disabled={purchasing || shekelBalance < selectedOutfit.shekel_price}
          />
        </View>
      )}

      {selectedOutfit && selectedOutfit.owned && (
        <View style={styles.purchaseBar}>
          <GlassButton title={t('avatarWardrobe.equip')} onPress={() => handleEquip(selectedOutfit.outfit_id)} variant="primary" size="md" />
          <GlassButton title={t('avatarWardrobe.unequip')} onPress={() => handleEquip(null)} variant="ghost" size="md" />
        </View>
      )}
    </View>
  );
}

export default AvatarWardrobe;
