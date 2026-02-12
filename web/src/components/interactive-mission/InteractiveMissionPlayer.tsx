/**
 * InteractiveMissionPlayer Component
 * HLS video player with pause-at-decision-point logic.
 * Loads interactive manifest, plays segments sequentially,
 * pauses at decision points for Hebrew speech input.
 */

import React, { useEffect, useRef, useCallback, useState } from 'react';
import { View, Text, Platform } from 'react-native';
import { useTranslation } from 'react-i18next';
import { GlassLoadingSpinner } from '@bayit/shared/ui';
import { GlassButton } from '@bayit/shared/components/ui/GlassButton';
import { useInteractiveMissionStore, MissionPlayState } from '@/stores/interactiveMissionStore';
import { MissionDecisionOverlay } from './MissionDecisionOverlay';
import { StyleSheet } from 'react-native';

interface InteractiveMissionPlayerProps {
  missionId: string;
  profileId: string;
  isRTL?: boolean;
  onComplete?: () => void;
}

export function InteractiveMissionPlayer({
  missionId,
  profileId,
  isRTL = false,
  onComplete,
}: InteractiveMissionPlayerProps) {
  const { t } = useTranslation();
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const [hlsInstance, setHlsInstance] = useState<any>(null);

  const {
    currentMission, playState, currentScene, lastAttemptResult,
    loadMission, submitAttempt, completeMission,
    setPlayState, setCurrentScene, reset,
  } = useInteractiveMissionStore();

  useEffect(() => {
    loadMission(missionId);
    return () => reset();
  }, [missionId, loadMission, reset]);

  useEffect(() => {
    return () => { if (hlsInstance) hlsInstance.destroy(); };
  }, [hlsInstance]);

  const handleSceneEnd = useCallback(() => {
    if (!currentMission?.interactive_manifest) return;

    const branches = currentMission.interactive_manifest.on_demand_branches;
    const decisionKey = Object.keys(branches).find(
      (key) => branches[key].options?.success?.scene === currentScene + 1
        || branches[key].options?.retry?.scene === currentScene
    );

    if (decisionKey) {
      setPlayState('decision');
      if (videoRef.current) videoRef.current.pause();
    } else {
      const totalScenes = currentMission.interactive_manifest.total_scenes;
      if (currentScene >= totalScenes) {
        completeMission(missionId);
        if (onComplete) onComplete();
      } else {
        setCurrentScene(currentScene + 1);
      }
    }
  }, [currentMission, currentScene, missionId, setPlayState, setCurrentScene, completeMission, onComplete]);

  const handleAttemptSubmit = useCallback(async (transcript: string, language: string) => {
    const result = await submitAttempt({
      missionId,
      sceneNumber: currentScene,
      profileId,
      transcript,
      language,
    });

    if (result?.success) {
      setTimeout(() => {
        setCurrentScene(result.next_scene);
        setPlayState('playing');
        if (videoRef.current) videoRef.current.play();
      }, 2000);
    }
  }, [missionId, currentScene, profileId, submitAttempt, setCurrentScene, setPlayState]);

  useEffect(() => {
    if (Platform.OS !== 'web' || !currentMission?.interactive_manifest) return;

    const manifest = currentMission.interactive_manifest;
    const prerendered = manifest.prerendered_scenes.find(s => s.scene === currentScene);

    if (prerendered && videoRef.current) {
      loadHlsSource(prerendered.hls_path);
    }
  }, [currentScene, currentMission]);

  const loadHlsSource = async (hlsPath: string) => {
    if (Platform.OS !== 'web' || !videoRef.current) return;

    const Hls = (await import('hls.js')).default;
    if (hlsInstance) hlsInstance.destroy();

    if (Hls.isSupported()) {
      const hls = new Hls();
      hls.loadSource(hlsPath);
      hls.attachMedia(videoRef.current);
      setHlsInstance(hls);
      videoRef.current.play();
    } else if (videoRef.current.canPlayType('application/vnd.apple.mpegurl')) {
      videoRef.current.src = hlsPath;
      videoRef.current.play();
    }
  };

  if (!currentMission) {
    return (
      <View style={styles.container}>
        <GlassLoadingSpinner size="large" />
        <Text style={styles.loadingText}>{t('interactiveMission.loading')}</Text>
      </View>
    );
  }

  if (playState === 'complete') {
    return (
      <View style={styles.container}>
        <View style={styles.completeCard}>
          <Text style={styles.completeTitle}>{t('interactiveMission.complete')}</Text>
          <Text style={styles.completeScore}>
            {t('interactiveMission.totalScore', { score: String(currentMission.total_score.toFixed(1)) })}
          </Text>
          <Text style={styles.completeShekels}>
            {t('interactiveMission.shekelsEarned', { amount: String(currentMission.shekels_earned) })}
          </Text>
          <GlassButton title={t('interactiveMission.backToMissions')} onPress={() => reset()} variant="primary" size="md" />
        </View>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {Platform.OS === 'web' && (
        <video
          ref={(el) => { videoRef.current = el; }}
          style={webVideoStyles}
          onEnded={handleSceneEnd}
          playsInline
        />
      )}

      {playState === 'decision' && currentMission.interactive_manifest && (
        <MissionDecisionOverlay
          manifest={currentMission.interactive_manifest}
          currentScene={currentScene}
          onSubmit={handleAttemptSubmit}
          lastResult={lastAttemptResult}
          isRTL={isRTL}
        />
      )}

      <View style={styles.progressBar}>
        <View style={[styles.progressFill, { width: `${((currentScene / (currentMission.total_scenes || 1)) * 100)}%` }]} />
      </View>
    </View>
  );
}

const webVideoStyles = { width: '100%', height: '100%', objectFit: 'contain' as const, backgroundColor: '#000' };

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#000', justifyContent: 'center', alignItems: 'center', position: 'relative' },
  loadingText: { color: '#fff', marginTop: 16, fontSize: 16 },
  completeCard: { padding: 32, alignItems: 'center', backgroundColor: 'rgba(255,255,255,0.1)', borderRadius: 16 },
  completeTitle: { color: '#fff', fontSize: 28, fontWeight: '700', marginBottom: 12 },
  completeScore: { color: '#E5C07B', fontSize: 20, marginBottom: 8 },
  completeShekels: { color: '#98C379', fontSize: 18, marginBottom: 24 },
  progressBar: { position: 'absolute', bottom: 0, left: 0, right: 0, height: 4, backgroundColor: 'rgba(255,255,255,0.2)' },
  progressFill: { height: '100%', backgroundColor: '#61AFEF', borderRadius: 2 },
});

export default InteractiveMissionPlayer;
