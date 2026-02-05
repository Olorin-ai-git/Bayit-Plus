/**
 * useSceneDetection Hook
 *
 * Monitors video playback and detects scene endings via subtitle gap analysis.
 * Triggers comprehension questions at natural scene boundaries.
 */

import { useCallback, useEffect, useRef, useState } from 'react';

export interface SubtitleCue {
  index: number;
  start_time: number;
  end_time: number;
  text: string;
}

export interface SceneMarker {
  start_time: number;
  end_time: number;
  subtitle_text: string;
  cue_count?: number;
}

export interface SceneDetectionConfig {
  enabled: boolean;
  gapThresholdSeconds: number;
  minSceneDurationSeconds: number;
  checkIntervalMs: number;
}

export interface UseSceneDetectionReturn {
  currentScene: SceneMarker | null;
  sceneEndDetected: boolean;
  resetSceneDetection: () => void;
  lastSceneEndTime: number;
}

const DEFAULT_CONFIG: SceneDetectionConfig = {
  enabled: true,
  gapThresholdSeconds: 5.0,
  minSceneDurationSeconds: 30.0,
  checkIntervalMs: 500,
};

export const useSceneDetection = (
  videoRef: React.RefObject<HTMLVideoElement>,
  contentId: string,
  subtitles: SubtitleCue[],
  config: Partial<SceneDetectionConfig> = {}
): UseSceneDetectionReturn => {
  const fullConfig = { ...DEFAULT_CONFIG, ...config };

  const [currentScene, setCurrentScene] = useState<SceneMarker | null>(null);
  const [sceneEndDetected, setSceneEndDetected] = useState(false);
  const lastSceneEndTimeRef = useRef<number>(0);
  const checkIntervalRef = useRef<NodeJS.Timeout | null>(null);

  const detectSceneEnd = useCallback(
    (currentTime: number): SceneMarker | null => {
      if (subtitles.length < 2) return null;

      // Skip if we recently detected a scene
      if (
        currentTime - lastSceneEndTimeRef.current <
        fullConfig.minSceneDurationSeconds
      ) {
        return null;
      }

      // Find current subtitle cue index
      const currentCueIndex = subtitles.findIndex(
        (cue) =>
          cue.start_time <= currentTime && cue.end_time >= currentTime
      );

      if (
        currentCueIndex === -1 ||
        currentCueIndex === subtitles.length - 1
      ) {
        return null;
      }

      const currentCue = subtitles[currentCueIndex];
      const nextCue = subtitles[currentCueIndex + 1];

      // Calculate gap between current end and next start
      const gap = nextCue.start_time - currentCue.end_time;

      // Scene end detected if gap >= threshold
      if (gap >= fullConfig.gapThresholdSeconds) {
        // Find scene start (previous gap or video start)
        let sceneStartTime = 0;
        let sceneStartIdx = 0;

        for (let i = currentCueIndex - 1; i >= 0; i--) {
          const prevGap =
            subtitles[i + 1].start_time - subtitles[i].end_time;
          if (prevGap >= fullConfig.gapThresholdSeconds) {
            sceneStartTime = subtitles[i].end_time;
            sceneStartIdx = i + 1;
            break;
          }
        }

        const sceneDuration = currentCue.end_time - sceneStartTime;

        // Only trigger if scene meets minimum duration
        if (sceneDuration >= fullConfig.minSceneDurationSeconds) {
          const sceneCues = subtitles.slice(
            sceneStartIdx,
            currentCueIndex + 1
          );
          const sceneText = sceneCues
            .map((cue) => cue.text)
            .join(' ')
            .substring(0, 1000);

          return {
            start_time: sceneStartTime,
            end_time: currentCue.end_time,
            subtitle_text: sceneText,
            cue_count: sceneCues.length,
          };
        }
      }

      return null;
    },
    [subtitles, fullConfig.gapThresholdSeconds, fullConfig.minSceneDurationSeconds]
  );

  useEffect(() => {
    const video = videoRef.current;
    if (!video || !fullConfig.enabled || subtitles.length === 0) {
      return;
    }

    // Check every 500ms (more efficient than timeupdate)
    checkIntervalRef.current = setInterval(() => {
      if (video.paused) return;

      const currentTime = video.currentTime;
      const scene = detectSceneEnd(currentTime);

      if (scene) {
        video.pause();
        setSceneEndDetected(true);
        setCurrentScene(scene);
        lastSceneEndTimeRef.current = currentTime;
      }
    }, fullConfig.checkIntervalMs);

    return () => {
      if (checkIntervalRef.current) {
        clearInterval(checkIntervalRef.current);
      }
    };
  }, [videoRef, subtitles, fullConfig, detectSceneEnd]);

  const resetSceneDetection = useCallback(() => {
    setSceneEndDetected(false);
    setCurrentScene(null);
  }, []);

  return {
    currentScene,
    sceneEndDetected,
    resetSceneDetection,
    lastSceneEndTime: lastSceneEndTimeRef.current,
  };
};
