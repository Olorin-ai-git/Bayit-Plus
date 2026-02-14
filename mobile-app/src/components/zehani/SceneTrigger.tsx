/**
 * SceneTrigger - Detects emotional moments in content and triggers avatar reactions.
 *
 * Polls for scene triggers based on content playback position, displays
 * a reaction overlay when an emotional scene is detected.
 */
import React, { useEffect, useState, useCallback, useRef } from 'react';
import { View, Text, StyleSheet, Animated } from 'react-native';
import { useTranslation } from 'react-i18next';
import api from '@bayit/shared-services/api';
import { Colors } from '../../theme/colors';
import logger from '@/utils/logger';
import { SceneTriggerSubviews } from './SceneTriggerSubviews';

const triggerLogger = logger.scope('SceneTrigger');

interface SceneTriggerProps {
  contentId: string;
  currentTime: number;
  avatarId: string;
  onTrigger: (emotion: string, reaction: string) => void;
}

interface SceneEvent {
  emotion: string;
  reactions: string[];
  timestamp: number;
}

const TRIGGER_CHECK_TOLERANCE_SEC = 2;
const DISPLAY_DURATION_MS = 5000;

export const SceneTrigger: React.FC<SceneTriggerProps> = ({
  contentId,
  currentTime,
  avatarId,
  onTrigger,
}) => {
  const { t } = useTranslation();
  const [events, setEvents] = useState<SceneEvent[]>([]);
  const [activeEvent, setActiveEvent] = useState<SceneEvent | null>(null);
  const [loaded, setLoaded] = useState(false);
  const shownTimestamps = useRef<Set<number>>(new Set());
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const hideTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    const loadEvents = async () => {
      try {
        const data = await api.get(`/zeh-ani/scene-triggers/${contentId}`, {
          params: { avatar_id: avatarId },
        }) as { events: SceneEvent[] };
        setEvents(data.events || []);
        setLoaded(true);
        triggerLogger.info('Scene events loaded', {
          contentId, count: String(data.events?.length || 0),
        });
      } catch (err: unknown) {
        triggerLogger.error('Failed to load scene events', { contentId, error: err });
        setLoaded(true);
      }
    };
    loadEvents();
  }, [contentId, avatarId]);

  const showEvent = useCallback((event: SceneEvent) => {
    setActiveEvent(event);
    Animated.timing(fadeAnim, {
      toValue: 1, duration: 300, useNativeDriver: true,
    }).start();
    if (hideTimer.current) clearTimeout(hideTimer.current);
    hideTimer.current = setTimeout(() => {
      Animated.timing(fadeAnim, {
        toValue: 0, duration: 300, useNativeDriver: true,
      }).start(() => setActiveEvent(null));
    }, DISPLAY_DURATION_MS);
  }, [fadeAnim]);

  useEffect(() => {
    if (!loaded || events.length === 0) return;
    const matchedEvent = events.find((evt) =>
      Math.abs(evt.timestamp - currentTime) < TRIGGER_CHECK_TOLERANCE_SEC
      && !shownTimestamps.current.has(evt.timestamp),
    );
    if (matchedEvent) {
      shownTimestamps.current.add(matchedEvent.timestamp);
      showEvent(matchedEvent);
      triggerLogger.info('Scene trigger fired', {
        emotion: matchedEvent.emotion, timestamp: String(matchedEvent.timestamp),
      });
    }
  }, [currentTime, loaded, events, showEvent]);

  useEffect(() => {
    return () => {
      if (hideTimer.current) clearTimeout(hideTimer.current);
    };
  }, []);

  const handleReactionSelect = useCallback((reaction: string) => {
    if (activeEvent) {
      onTrigger(activeEvent.emotion, reaction);
      triggerLogger.info('Reaction selected', {
        emotion: activeEvent.emotion, reaction,
      });
    }
    Animated.timing(fadeAnim, {
      toValue: 0, duration: 200, useNativeDriver: true,
    }).start(() => setActiveEvent(null));
  }, [activeEvent, onTrigger, fadeAnim]);

  if (!activeEvent) return null;

  return (
    <Animated.View style={[styles.container, { opacity: fadeAnim }]}
      accessibilityRole="alert"
      accessibilityLabel={t('zehAni.sceneTrigger.reactionAvailable', {
        emotion: activeEvent.emotion,
      })}>
      <Text style={styles.label}>
        {t('zehAni.sceneTrigger.emotionalMoment')}
      </Text>
      <SceneTriggerSubviews
        emotion={activeEvent.emotion}
        reactions={activeEvent.reactions}
        onReactionSelect={handleReactionSelect}
      />
    </Animated.View>
  );
};

const styles = StyleSheet.create({
  container: {
    position: 'absolute', bottom: 100, left: 16, right: 16,
    backgroundColor: Colors.Glass.bgStrong, borderRadius: 16,
    padding: 16, borderWidth: 1, borderColor: Colors.Glass.border,
  },
  label: {
    fontSize: 14, fontWeight: '600', color: Colors.Text.secondary, marginBottom: 10,
  },
});
