/**
 * FamilySnapsGallery Component
 * Image grid with share buttons (WhatsApp, Instagram, Email),
 * download high-res option. Glass UI image grid.
 */

import React, { useEffect, useState, useCallback } from 'react';
import { View, Text, TextInput, Image, FlatList, Pressable, Platform } from 'react-native';
import { useTranslation } from 'react-i18next';
import { GlassButton } from '@bayit/shared/components/ui/GlassButton';
import { GlassLoadingSpinner } from '@bayit/shared/ui';
import api from '@/services/api';
import logger from '@bayit/shared-utils/logger';
import { styles } from './FamilySnapsGallery.styles';

const snapsLogger = logger.scope('FamilySnapsGallery');

interface FamilySnap {
  snap_id: string;
  template: string;
  character_names: string[];
  composite_url: string | null;
  thumbnail_url: string | null;
  status: string;
  share_url: string | null;
  created_at: string;
}

interface FamilySnapsGalleryProps {
  avatarId: string;
  profileId: string;
  onGenerateSnap?: () => void;
  isRTL?: boolean;
}

export function FamilySnapsGallery({
  avatarId,
  profileId,
  onGenerateSnap,
  isRTL = false,
}: FamilySnapsGalleryProps) {
  const { t } = useTranslation();
  const [snaps, setSnaps] = useState<FamilySnap[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedSnap, setSelectedSnap] = useState<FamilySnap | null>(null);
  const [sharing, setSharing] = useState(false);
  const [pinModalSnap, setPinModalSnap] = useState<{ snap: FamilySnap; platform: string } | null>(null);
  const [pinInput, setPinInput] = useState('');

  useEffect(() => {
    fetchSnaps();
  }, [avatarId]);

  const fetchSnaps = async () => {
    setLoading(true);
    try {
      const data = await api.get(`/family-snaps/avatars/${avatarId}/snaps`) as {
        snaps: FamilySnap[];
        total: number;
      };
      setSnaps(data.snaps || []);
    } catch (err: any) {
      snapsLogger.error('Failed to fetch snaps', err);
    } finally {
      setLoading(false);
    }
  };

  const handleShare = useCallback(async (snap: FamilySnap, platform: string) => {
    if (!snap.share_url) {
      setPinModalSnap({ snap, platform });
      setPinInput('');
      return;
    }
    openShareLink(snap.share_url, platform);
  }, []);

  const handlePinSubmit = useCallback(async () => {
    if (!pinModalSnap || pinInput.length < 4) return;
    setSharing(true);
    try {
      const result = await api.post(`/family-snaps/snaps/${pinModalSnap.snap.snap_id}/share`, {
        pin: pinInput,
      }) as { share_url: string };
      pinModalSnap.snap.share_url = result.share_url;
      openShareLink(result.share_url, pinModalSnap.platform);
    } catch (err: unknown) {
      snapsLogger.error('Failed to generate share URL', err);
    } finally {
      setSharing(false);
      setPinModalSnap(null);
      setPinInput('');
    }
  }, [pinModalSnap, pinInput]);

  const openShareLink = (shareUrl: string, platform: string) => {
    if (Platform.OS !== 'web') return;
    const url = encodeURIComponent(shareUrl);
    const text = encodeURIComponent(t('familySnaps.shareText'));
    const shareUrls: Record<string, string> = {
      whatsapp: `https://wa.me/?text=${text}%20${url}`,
      email: `mailto:?subject=${text}&body=${url}`,
    };
    const link = shareUrls[platform];
    if (link) window.open(link, '_blank');
  };

  const handleDownload = useCallback(async (snap: FamilySnap) => {
    if (Platform.OS === 'web' && snap.composite_url) {
      const link = document.createElement('a');
      link.href = snap.composite_url;
      link.download = `bayit_snap_${snap.snap_id}.png`;
      link.click();
    }
  }, []);

  const renderSnapCard = useCallback(({ item }: { item: FamilySnap }) => (
    <Pressable
      style={[styles.snapCard, selectedSnap?.snap_id === item.snap_id && styles.snapCardSelected]}
      onPress={() => setSelectedSnap(item)}
      accessibilityLabel={item.template.replace(/_/g, ' ')}
    >
      {item.thumbnail_url ? (
        <Image source={{ uri: item.thumbnail_url }} style={styles.snapImage} />
      ) : (
        <View style={styles.snapPlaceholder} />
      )}
      <Text style={styles.snapTemplate}>{item.template.replace(/_/g, ' ')}</Text>
      {item.character_names.length > 0 && (
        <Text style={styles.snapCharacters} numberOfLines={1}>
          {item.character_names.join(', ')}
        </Text>
      )}
    </Pressable>
  ), [selectedSnap]);

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <GlassLoadingSpinner size="large" />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>{t('familySnaps.title')}</Text>
        {onGenerateSnap && (
          <GlassButton
            title={t('familySnaps.newSnap')}
            onPress={onGenerateSnap}
            variant="primary"
            size="sm"
          />
        )}
      </View>

      {snaps.length === 0 ? (
        <View style={styles.emptyContainer}>
          <Text style={styles.emptyText}>{t('familySnaps.empty')}</Text>
        </View>
      ) : (
        <FlatList
          data={snaps}
          renderItem={renderSnapCard}
          keyExtractor={(item) => item.snap_id}
          numColumns={2}
          contentContainerStyle={styles.grid}
        />
      )}

      {selectedSnap && (
        <View style={styles.detailBar}>
          <View style={styles.shareRow}>
            <GlassButton
              title={t('familySnaps.shareWhatsApp')}
              onPress={() => handleShare(selectedSnap, 'whatsapp')}
              variant="ghost"
              size="sm"
              disabled={sharing}
            />
            <GlassButton
              title={t('familySnaps.shareEmail')}
              onPress={() => handleShare(selectedSnap, 'email')}
              variant="ghost"
              size="sm"
              disabled={sharing}
            />
            <GlassButton
              title={t('familySnaps.download')}
              onPress={() => handleDownload(selectedSnap)}
              variant="primary"
              size="sm"
            />
          </View>
        </View>
      )}

      {pinModalSnap && (
        <View style={styles.pinOverlay}>
          <View style={styles.pinCard}>
            <Text style={styles.pinTitle}>{t('familySnaps.enterPin')}</Text>
            <TextInput
              style={styles.pinInput}
              value={pinInput}
              onChangeText={setPinInput}
              secureTextEntry
              maxLength={20}
              keyboardType="number-pad"
              autoFocus
              accessibilityLabel={t('familySnaps.enterPin')}
            />
            <View style={styles.pinActions}>
              <GlassButton
                title={t('common.cancel')}
                onPress={() => { setPinModalSnap(null); setPinInput(''); }}
                variant="ghost"
                size="sm"
              />
              <GlassButton
                title={t('common.confirm')}
                onPress={handlePinSubmit}
                variant="primary"
                size="sm"
                disabled={pinInput.length < 4 || sharing}
              />
            </View>
          </View>
        </View>
      )}
    </View>
  );
}

export default FamilySnapsGallery;
