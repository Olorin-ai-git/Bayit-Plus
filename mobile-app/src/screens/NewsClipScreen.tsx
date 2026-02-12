/**
 * NewsClipScreen - Grandparent Bridge news clip viewer
 *
 * Video player for AI-generated news clips, clip list,
 * vocabulary display, and share actions for family sharing.
 */
import React, { useEffect, useState, useCallback } from 'react';
import { View, Text, Pressable, SafeAreaView, ScrollView, StyleSheet } from 'react-native';
import { useRoute, useNavigation } from '@react-navigation/native';
import { useTranslation } from 'react-i18next';
import { useDirection } from '@bayit/shared-hooks';
import { GlassButton, GlassLoadingSpinner } from '@bayit/shared/ui';
import { NativeIcon } from '@olorin/shared-icons/native';
import api from '@bayit/shared-services/api';
import { Colors } from '../theme/colors';
import logger from '@/utils/logger';

const bridgeLogger = logger.scope('NewsClipScreen');

interface NewsClip {
  id: string;
  avatar_id: string;
  script_text: string;
  script_text_he: string;
  vocabulary_featured: string[];
  video_gcs_path: string | null;
  share_url: string | null;
  status: string;
  created_at: string;
}

interface ShareResult {
  clip_id: string;
  share_url: string | null;
  whatsapp_link: string;
}

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

  useEffect(() => {
    loadClips();
  }, []);

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

  const handleShare = useCallback(async () => {
    if (!selectedClip) return;
    setPhase('sharing');
    try {
      const result = await api.post(`/grandparent-bridge/${selectedClip.id}/share`, {
        recipient_name: '',
        language: 'he',
      }) as ShareResult;
      bridgeLogger.info('Clip shared', { clipId: selectedClip.id });
      // Native share integration handled by platform
      setPhase('idle');
    } catch (err: any) {
      setError(err?.message || t('grandparentBridge.share.title'));
      setPhase('idle');
      bridgeLogger.error('Failed to share clip', err);
    }
  }, [selectedClip, t]);

  if (phase === 'loading') {
    return (
      <SafeAreaView style={styles.container}>
        <GlassLoadingSpinner />
      </SafeAreaView>
    );
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
              <NativeIcon name="play-circle" size={48} color="rgba(255,255,255,0.4)" />
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
              <GlassButton
                title={t('grandparentBridge.share.whatsApp')}
                onPress={handleShare}
                variant="primary"
              />
              <GlassButton
                title={t('grandparentBridge.share.copyLink')}
                onPress={() => {
                  if (selectedClip?.share_url) {
                    bridgeLogger.info('Link copy requested', { clipId: selectedClip.id });
                  }
                }}
                variant="secondary"
              />
            </View>
          </View>
        )}

        {clips.length === 0 && phase === 'idle' && (
          <Text style={styles.emptyText}>{t('grandparentBridge.clips.empty')}</Text>
        )}

        <Text style={styles.sectionTitle}>{t('grandparentBridge.clips.title')}</Text>

        {clips.map((clip) => (
          <Pressable
            key={clip.id}
            onPress={() => setSelectedClip(clip)}
            style={[styles.clipCard, selectedClip?.id === clip.id && styles.clipCardSelected]}
          >
            <Text style={styles.clipCardTitle}>
              {clip.script_text_he.slice(0, 40)}
            </Text>
            <Text style={styles.clipCardDate}>
              {new Date(clip.created_at).toLocaleDateString()}
            </Text>
          </Pressable>
        ))}

        {error && <Text style={styles.errorText}>{error}</Text>}
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#1E1E2E' },
  scrollContent: { padding: 20 },
  header: { marginBottom: 20 },
  title: { fontSize: 24, fontWeight: '700', color: '#FFF' },
  subtitle: { fontSize: 14, color: 'rgba(255,255,255,0.5)', marginTop: 4 },
  clipDetail: { marginBottom: 24 },
  videoPlaceholder: { width: '100%', aspectRatio: 16 / 9, backgroundColor: '#000', borderRadius: 16, justifyContent: 'center', alignItems: 'center', marginBottom: 16 },
  scriptText: { fontSize: 18, color: '#FFF', fontWeight: '600', marginBottom: 12 },
  vocabularyContainer: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 8 },
  vocabTag: { backgroundColor: 'rgba(99,102,241,0.2)', paddingHorizontal: 12, paddingVertical: 4, borderRadius: 12 },
  vocabText: { fontSize: 13, color: '#A5B4FC', fontWeight: '500' },
  featuredCount: { fontSize: 12, color: 'rgba(255,255,255,0.4)', marginBottom: 12 },
  actions: { flexDirection: 'row', gap: 12, marginTop: 8 },
  sectionTitle: { fontSize: 18, fontWeight: '600', color: '#FFF', marginBottom: 12, marginTop: 8 },
  clipCard: { backgroundColor: 'rgba(255,255,255,0.05)', borderRadius: 16, padding: 16, marginBottom: 10, borderWidth: 1, borderColor: 'rgba(255,255,255,0.08)' },
  clipCardSelected: { borderColor: 'rgba(99,102,241,0.6)', backgroundColor: 'rgba(99,102,241,0.1)' },
  clipCardTitle: { fontSize: 15, fontWeight: '600', color: '#FFF', marginBottom: 4 },
  clipCardDate: { fontSize: 12, color: 'rgba(255,255,255,0.4)' },
  emptyText: { fontSize: 15, color: 'rgba(255,255,255,0.4)', textAlign: 'center', marginTop: 40, marginBottom: 24 },
  errorText: { color: '#FF3B30', marginTop: 12, textAlign: 'center' },
});
