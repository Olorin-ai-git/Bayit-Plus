/**
 * InteractiveMissionScreen - Interactive Hebrew mission player
 *
 * HLS video playback, scene-by-scene progression, Hebrew speech challenges
 * at decision points, voice recording/submission, progress tracking,
 * completion screen with score and shekels earned.
 */
import React, { useEffect, useRef, useState, useCallback } from 'react';
import { View, Text, Pressable, SafeAreaView, Platform } from 'react-native';
import { useRoute, useNavigation } from '@react-navigation/native';
import { useTranslation } from 'react-i18next';
import ReactNativeHapticFeedback from 'react-native-haptic-feedback';
import Video, { VideoRef } from 'react-native-video';
import { useDirection } from '@bayit/shared-hooks';
import { GlassButton, GlassLoadingSpinner } from '@bayit/shared/ui';
import { NativeIcon } from '@olorin/shared-icons/native';
import api from '@bayit/shared-services/api';
import { Colors } from '../theme/colors';
import logger from '@/utils/logger';

const missionLogger = logger.scope('InteractiveMissionScreen');
type Phase = 'loading' | 'playing' | 'decision' | 'feedback' | 'complete';

interface Scene {
  scene_number: number;
  decision: {
    decision_id: string; prompt_text: string; prompt_transliteration: string;
    prompt_translation: string; timeout_seconds: number; max_attempts: number;
  } | null;
  duration_seconds: number;
}

interface AttemptResult {
  success: boolean; quality: string; score: number; feedback: string;
  feedback_he: string; next_scene: number; hint: string;
  attempt_number: number; shekels_earned: number;
}

export const InteractiveMissionScreen: React.FC = () => {
  const route = useRoute<any>();
  const navigation = useNavigation<any>();
  const { t, i18n } = useTranslation();
  const { textAlign } = useDirection();
  const { missionId, profileId } = route.params;
  const videoRef = useRef<VideoRef>(null);

  const [phase, setPhase] = useState<Phase>('loading');
  const [mission, setMission] = useState<any>(null);
  const [currentScene, setCurrentScene] = useState(0);
  const [attemptResult, setAttemptResult] = useState<AttemptResult | null>(null);
  const [transcript, setTranscript] = useState('');
  const [isRecording, setIsRecording] = useState(false);
  const [totalShekels, setTotalShekels] = useState(0);

  const scenes: Scene[] = mission?.interactive_manifest?.scenes ?? [];
  const sceneData = scenes.find((s) => s.scene_number === currentScene);
  const progressPct = scenes.length > 0 ? (currentScene / scenes.length) * 100 : 0;

  const haptic = (type: string) => { if (Platform.OS === 'ios') ReactNativeHapticFeedback.trigger(type); };

  const completeMission = useCallback(async () => {
    try {
      const res = await api.post(`/interactive-missions/${missionId}/complete`);
      setTotalShekels(res.shekels_earned);
    } catch (err) { missionLogger.error('Complete mission failed', { missionId, error: err }); }
    setPhase('complete');
    haptic('notificationSuccess');
  }, [missionId]);

  useEffect(() => {
    (async () => {
      try {
        const data = await api.get(`/interactive-missions/${missionId}`);
        setMission(data);
        const first = data.interactive_manifest?.scenes?.[0];
        if (first) { setCurrentScene(first.scene_number); setPhase('playing'); }
      } catch (err) { missionLogger.error('Load mission failed', { missionId, error: err }); }
    })();
  }, [missionId]);

  const handleVideoEnd = useCallback(() => {
    if (!sceneData?.decision) {
      const idx = scenes.findIndex((s) => s.scene_number === currentScene) + 1;
      if (idx < scenes.length) { setCurrentScene(scenes[idx].scene_number); }
      else { completeMission(); }
      return;
    }
    setPhase('decision');
    haptic('notificationWarning');
  }, [sceneData, currentScene, scenes, completeMission]);

  const handleSubmit = useCallback(async () => {
    if (!sceneData?.decision || !transcript.trim()) return;
    setIsRecording(false);
    try {
      const result: AttemptResult = await api.post(
        `/interactive-missions/${missionId}/scenes/${currentScene}/attempt`,
        { profile_id: profileId, response_transcript: transcript, language_detected: i18n.language },
      );
      setAttemptResult(result);
      setTotalShekels((p) => p + result.shekels_earned);
      setPhase('feedback');
      haptic(result.success ? 'notificationSuccess' : 'notificationError');
    } catch (err) { missionLogger.error('Attempt failed', { scene: currentScene, error: err }); }
  }, [missionId, currentScene, profileId, transcript, sceneData, i18n.language]);

  const handleAdvance = useCallback(() => {
    if (!attemptResult) return;
    setTranscript('');
    setAttemptResult(null);
    if (attemptResult.next_scene === -1) { completeMission(); }
    else { setCurrentScene(attemptResult.next_scene); setPhase('playing'); }
  }, [attemptResult, completeMission]);

  if (phase === 'loading' || !mission) {
    return (
      <SafeAreaView className="flex-1 justify-center items-center" style={{ backgroundColor: Colors.Background.primary }}>
        <GlassLoadingSpinner size="large" />
        <Text className="text-white text-base mt-4">{t('missions.loading')}</Text>
      </SafeAreaView>
    );
  }
  if (phase === 'complete') {
    return (
      <SafeAreaView className="flex-1 justify-center items-center px-6" style={{ backgroundColor: Colors.Background.primary }}>
        <NativeIcon name="trophy" size="2xl" color={Colors.Special.gold} />
        <Text style={{ textAlign }} className="text-3xl font-bold text-white mt-6">{t('missions.complete')}</Text>
        <Text style={{ textAlign }} className="text-lg text-white/70 mt-2">
          {t('missions.scoreLabel')}: {(mission.total_score ?? 0).toFixed(1)}
        </Text>
        <View className="flex-row items-center mt-4">
          <NativeIcon name="coin" size="lg" color={Colors.Special.gold} />
          <Text className="text-2xl font-bold text-yellow-400 ml-2">{totalShekels}</Text>
        </View>
        <GlassButton variant="primary" onPress={() => navigation.goBack()} className="mt-8 w-full">
          {t('common.done')}
        </GlassButton>
      </SafeAreaView>
    );
  }
  const hlsUrl = mission.hls_base_path ? `${mission.hls_base_path}/scene_${currentScene}.m3u8` : null;
  return (
    <SafeAreaView className="flex-1" style={{ backgroundColor: Colors.Background.primary }}>
      <View className="flex-1">
        {hlsUrl && (
          <Video ref={videoRef} source={{ uri: hlsUrl }} className="flex-1" resizeMode="contain"
            onEnd={handleVideoEnd} paused={phase !== 'playing'} />
        )}
        {phase === 'decision' && sceneData?.decision && (
          <View className="absolute inset-0 bg-black/70 justify-center items-center px-6">
            <Text style={{ textAlign }} className="text-2xl font-bold text-white mb-2">{sceneData.decision.prompt_text}</Text>
            <Text style={{ textAlign }} className="text-base text-white/60 mb-1">{sceneData.decision.prompt_transliteration}</Text>
            <Text style={{ textAlign }} className="text-sm text-white/40 mb-6">{sceneData.decision.prompt_translation}</Text>
            <Pressable onPress={() => { haptic('impactLight'); setIsRecording((p) => !p); }}
              className={`w-20 h-20 rounded-full justify-center items-center ${isRecording ? 'bg-red-500' : 'bg-purple-600'}`}>
              <NativeIcon name="microphone" size="xl" color={Colors.Text.primary} />
            </Pressable>
            {transcript.length > 0 && (
              <GlassButton variant="primary" onPress={handleSubmit} className="mt-4 w-full">{t('missions.submit')}</GlassButton>
            )}
          </View>
        )}
        {phase === 'feedback' && attemptResult && (
          <View className="absolute inset-0 bg-black/70 justify-center items-center px-6">
            <NativeIcon name={attemptResult.success ? 'checkCircle' : 'xCircle'} size="2xl"
              color={attemptResult.success ? Colors.Success.default : Colors.Error.default} />
            <Text style={{ textAlign }} className="text-xl font-bold text-white mt-4">
              {i18n.language === 'he' ? attemptResult.feedback_he : attemptResult.feedback}
            </Text>
            {attemptResult.hint.length > 0 && (
              <Text style={{ textAlign }} className="text-sm text-yellow-400 mt-2">{attemptResult.hint}</Text>
            )}
            {attemptResult.shekels_earned > 0 && (
              <View className="flex-row items-center mt-3">
                <NativeIcon name="coin" size="md" color={Colors.Special.gold} />
                <Text className="text-lg font-bold text-yellow-400 ml-1">+{attemptResult.shekels_earned}</Text>
              </View>
            )}
            <GlassButton variant="primary" onPress={handleAdvance} className="mt-6 w-full">
              {attemptResult.success ? t('missions.continue') : t('missions.tryAgain')}
            </GlassButton>
          </View>
        )}
      </View>
      <View className="px-4 pb-2 pt-1" style={{ backgroundColor: Colors.Background.elevated }}>
        <View className="h-2 bg-white/10 rounded-full overflow-hidden">
          <View className="h-full rounded-full" style={{ width: `${progressPct}%`, backgroundColor: Colors.Primary.default }} />
        </View>
        <Text style={{ textAlign }} className="text-xs text-white/50 mt-1">
          {t('missions.sceneProgress', { current: currentScene, total: scenes.length })}
        </Text>
      </View>
    </SafeAreaView>
  );
};
export default InteractiveMissionScreen;
