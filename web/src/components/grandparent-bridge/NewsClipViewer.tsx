/**
 * NewsClipViewer Component
 * Displays grandparent bridge news clips with video player,
 * vocabulary words, clip list, and generation controls.
 */

import React, { useEffect, useCallback, useRef } from 'react';
import { View, Text, Pressable, ScrollView } from 'react-native';
import { useTranslation } from 'react-i18next';
import { Send, Plus } from 'lucide-react-native';
import { GlassButton, GlassLoadingSpinner, GlassCard } from '@bayit/shared/ui';
import { useGrandparentBridgeStore } from '@/stores/grandparentBridgeStore';
import type { NewsClip } from '@/stores/grandparentBridgeStore.types';
import { styles } from './NewsClipViewer.styles';

interface NewsClipViewerProps {
  avatarId: string;
  profileId: string;
  sessionSummary?: Record<string, unknown>;
  onSharePress?: (clip: NewsClip) => void;
}

export function NewsClipViewer({ avatarId, profileId, sessionSummary, onSharePress }: NewsClipViewerProps) {
  const { t } = useTranslation();
  const videoRef = useRef<HTMLVideoElement | null>(null);

  const {
    clips,
    selectedClip,
    loading,
    generating,
    error,
    fetchClips,
    generateClip,
    setSelectedClip,
  } = useGrandparentBridgeStore();

  useEffect(() => {
    fetchClips(profileId);
  }, [profileId, fetchClips]);

  useEffect(() => {
    if (clips.length > 0 && !selectedClip) {
      setSelectedClip(clips[0]);
    }
  }, [clips, selectedClip, setSelectedClip]);

  const handleGenerate = useCallback(async () => {
    if (!sessionSummary) return;
    await generateClip({ avatarId, profileId, sessionSummary });
  }, [avatarId, profileId, sessionSummary, generateClip]);

  const handleClipSelect = useCallback((clip: NewsClip) => {
    setSelectedClip(clip);
  }, [setSelectedClip]);

  if (loading && clips.length === 0) {
    return (
      <View style={styles.container}>
        <GlassLoadingSpinner />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <View>
          <Text style={styles.title}>{t('grandparentBridge.title')}</Text>
          <Text style={styles.subtitle}>{t('grandparentBridge.subtitle')}</Text>
        </View>
        {sessionSummary && (
          <GlassButton
            label={t('grandparentBridge.generateClip')}
            onPress={handleGenerate}
            variant="primary"
            icon={<Plus size={16} color="#FFFFFF" />}
            disabled={generating}
          />
        )}
      </View>

      {generating && (
        <GlassCard>
          <View style={{ alignItems: 'center', padding: 24 }}>
            <GlassLoadingSpinner />
            <Text style={[styles.subtitle, { marginTop: 12 }]}>
              {t('grandparentBridge.generating')}
            </Text>
          </View>
        </GlassCard>
      )}

      {selectedClip?.video_gcs_path && (
        <View style={styles.videoPlayer}>
          <video
            ref={videoRef}
            src={selectedClip.video_gcs_path}
            controls
            style={{ width: '100%', height: '100%', objectFit: 'cover' }}
          />
        </View>
      )}

      {selectedClip && (
        <>
          <View style={styles.vocabularyList}>
            {selectedClip.vocabulary_featured.map((word) => (
              <View key={word} style={styles.vocabularyTag}>
                <Text style={styles.vocabularyText}>{word}</Text>
              </View>
            ))}
          </View>
          <Text style={[styles.subtitle, { marginTop: 8 }]}>
            {t('grandparentBridge.clips.featured', { count: selectedClip.vocabulary_featured.length })}
          </Text>
          <View style={styles.actions}>
            <GlassButton
              label={t('grandparentBridge.share.title')}
              onPress={() => onSharePress?.(selectedClip)}
              variant="secondary"
              icon={<Send size={16} color="#FFFFFF" />}
            />
          </View>
        </>
      )}

      {clips.length === 0 && !generating && (
        <Text style={styles.emptyText}>{t('grandparentBridge.clips.empty')}</Text>
      )}

      <ScrollView style={styles.clipList}>
        {clips.map((clip) => (
          <Pressable
            key={clip.id}
            onPress={() => handleClipSelect(clip)}
            style={[styles.clipCard, selectedClip?.id === clip.id && styles.clipCardSelected]}
          >
            <Text style={styles.clipTitle}>
              {t('grandparentBridge.newsClip.reporter', { name: clip.script_text_he.slice(0, 30) })}
            </Text>
            <Text style={styles.clipDate}>{new Date(clip.created_at).toLocaleDateString()}</Text>
          </Pressable>
        ))}
      </ScrollView>

      {error && <Text style={styles.errorText}>{error}</Text>}
    </View>
  );
}
