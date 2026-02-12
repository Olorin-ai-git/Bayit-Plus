/** NewsClipScreen - Grandparent Bridge news clip viewer with PIN-gated sharing. */
import React, { useEffect, useState, useCallback } from 'react';
import { View, Text, Pressable, SafeAreaView, ScrollView } from 'react-native';
import { useRoute, useNavigation } from '@react-navigation/native';
import { useTranslation } from 'react-i18next';
import { useDirection } from '@bayit/shared-hooks';
import { GlassLoadingSpinner } from '@bayit/shared/ui';
import { GlassButton, GlassInput, GlassModal } from '@olorin/glass-ui/native';
import { OlorinIcon } from '@olorin/icons/native';
import api from '@bayit/shared-services/api';
import { Colors } from '../theme/colors';
import logger from '@/utils/logger';
import { styles } from './NewsClipScreen.styles';

const bridgeLogger = logger.scope('NewsClipScreen');
const MIN_PIN_LEN = 4;
const MAX_PIN_LEN = 6;
const PIN_FILTER = /[^0-9]/g;

interface NewsClip {
  id: string; avatar_id: string; script_text: string; script_text_he: string;
  vocabulary_featured: string[]; video_gcs_path: string | null;
  share_url: string | null; status: string; created_at: string;
}

interface ShareResult { clip_id: string; share_url: string | null; whatsapp_link: string; }

type Phase = 'loading' | 'idle' | 'generating' | 'sharing';

export const NewsClipScreen: React.FC = () => {
  const route = useRoute<any>();
  const navigation = useNavigation();
  const { profileId, avatarId } = route.params;
  const { t } = useTranslation();
  const { textAlign } = useDirection();

  const [phase, setPhase] = useState<Phase>('loading');
  const [clips, setClips] = useState<NewsClip[]>([]);
  const [selectedClip, setSelectedClip] = useState<NewsClip | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [showPinModal, setShowPinModal] = useState(false);
  const [sharePin, setSharePin] = useState('');

  useEffect(() => { loadClips(); }, []);

  const loadClips = useCallback(async () => {
    try {
      const data = await api.get('/grandparent-bridge/clips', {
        params: { profile_id: profileId },
      }) as NewsClip[];
      setClips(data || []);
      if (data?.length > 0) setSelectedClip(data[0]);
      setPhase('idle');
      bridgeLogger.info('Loaded clips', { count: String(data?.length || 0) });
    } catch (err: any) {
      setError(err?.message || t('grandparentBridge.clips.empty'));
      setPhase('idle');
      bridgeLogger.error('Failed to load clips', err);
    }
  }, [profileId, t]);

  const handlePinChange = useCallback((v: string) => {
    setSharePin(v.replace(PIN_FILTER, '').slice(0, MAX_PIN_LEN));
  }, []);

  const handleShareRequest = useCallback(() => {
    if (!selectedClip) return;
    setSharePin(''); setShowPinModal(true);
  }, [selectedClip]);

  const handlePinClose = useCallback(() => {
    setShowPinModal(false); setSharePin('');
  }, []);

  const handleShareConfirm = useCallback(async () => {
    if (!selectedClip || sharePin.length < MIN_PIN_LEN) return;
    setShowPinModal(false); setPhase('sharing');
    try {
      await api.post(`/grandparent-bridge/${selectedClip.id}/share`, {
        pin: sharePin, recipient_name: '', language: 'he',
      }) as ShareResult;
      bridgeLogger.info('Clip shared', { clipId: selectedClip.id });
      setPhase('idle');
    } catch (err: any) {
      setError(err?.message || t('grandparentBridge.share.title'));
      setPhase('idle');
      bridgeLogger.error('Failed to share clip', err);
    } finally { setSharePin(''); }
  }, [selectedClip, sharePin, t]);

  const handleCopyLink = useCallback(() => {
    if (selectedClip?.share_url) {
      bridgeLogger.info('Link copy requested', { clipId: selectedClip.id });
    }
  }, [selectedClip]);

  if (phase === 'loading') {
    return <SafeAreaView style={styles.container}><GlassLoadingSpinner /></SafeAreaView>;
  }

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={styles.scrollContent}>
        <View style={styles.header}>
          <Text style={[styles.title, { textAlign }]}>{t('grandparentBridge.title')}</Text>
          <Text style={styles.subtitle}>{t('grandparentBridge.subtitle')}</Text>
        </View>

        {selectedClip && (
          <View style={styles.clipDetail}>
            <View style={styles.videoPlaceholder}>
              <OlorinIcon name="play-circle" size={48} color={Colors.Text.disabled} />
            </View>
            <Text style={[styles.scriptText, { textAlign }]}>{selectedClip.script_text_he}</Text>
            <View style={styles.vocabularyContainer}>
              {selectedClip.vocabulary_featured.map((word) => (
                <View key={word} style={styles.vocabTag}>
                  <Text style={styles.vocabText}>{word}</Text>
                </View>
              ))}
            </View>
            <Text style={styles.featuredCount}>
              {t('grandparentBridge.clips.featured', { count: selectedClip.vocabulary_featured.length })}
            </Text>
            <View style={styles.actions}>
              <GlassButton title={t('grandparentBridge.share.whatsApp')}
                onPress={handleShareRequest} variant="primary" />
              <GlassButton title={t('grandparentBridge.share.copyLink')}
                onPress={handleCopyLink} variant="secondary" />
            </View>
          </View>
        )}

        {clips.length === 0 && phase === 'idle' && (
          <Text style={styles.emptyText}>{t('grandparentBridge.clips.empty')}</Text>
        )}

        <Text style={styles.sectionTitle}>{t('grandparentBridge.clips.title')}</Text>

        {clips.map((clip) => (
          <Pressable key={clip.id} onPress={() => setSelectedClip(clip)}
            style={[styles.clipCard, selectedClip?.id === clip.id && styles.clipCardSelected]}>
            <Text style={styles.clipCardTitle}>{clip.script_text_he.slice(0, 40)}</Text>
            <Text style={styles.clipCardDate}>{new Date(clip.created_at).toLocaleDateString()}</Text>
          </Pressable>
        ))}

        {error && <Text style={styles.errorText}>{error}</Text>}
      </ScrollView>

      <GlassModal visible={showPinModal} onClose={handlePinClose}
        title={t('grandparentBridge.share.title')}>
        <View style={styles.pinModalContent}>
          <Text style={styles.pinDescription}>{t('grandparentBridge.share.enterPin')}</Text>
          <GlassInput placeholder="****" value={sharePin} onChangeText={handlePinChange}
            onSubmitEditing={handleShareConfirm} keyboardType="number-pad" secureTextEntry
            maxLength={MAX_PIN_LEN} returnKeyType="done"
            accessibilityLabel={t('grandparentBridge.share.enterPin')} />
          <Text style={styles.pinCharCount}>{sharePin.length}/{MAX_PIN_LEN}</Text>
          <View style={styles.pinActions}>
            <GlassButton variant="secondary" onPress={handlePinClose}
              title={t('common.cancel')} style={styles.pinActionBtn} />
            <GlassButton variant="primary" onPress={handleShareConfirm}
              disabled={sharePin.length < MIN_PIN_LEN}
              title={t('common.confirm')} style={styles.pinActionBtn} />
          </View>
        </View>
      </GlassModal>
    </SafeAreaView>
  );
};
