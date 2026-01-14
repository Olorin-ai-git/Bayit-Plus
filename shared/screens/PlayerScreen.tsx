import React, { useEffect, useState, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
  BackHandler,
  Platform,
} from 'react-native';

// TVEventHandler only exists on TV platforms
let TVEventHandler: any = null;
if (Platform.OS !== 'web') {
  try {
    TVEventHandler = require('react-native').TVEventHandler;
  } catch (e) {
    // TVEventHandler not available
  }
}

// Video component - use native on mobile/TV, HTML5 on web
let Video: any = null;
let VideoRef: any = null;
if (Platform.OS !== 'web') {
  const videoModule = require('react-native-video');
  Video = videoModule.default;
  VideoRef = videoModule.VideoRef;
}
import { useNavigation, useRoute } from '@react-navigation/native';
import { useTranslation } from 'react-i18next';
import { contentService, liveService, historyService, chaptersService } from '../services/api';
import { useWatchPartyStore } from '../stores/watchPartyStore';
import { useAuthStore } from '../stores/authStore';
import {
  WatchPartyButton,
  WatchPartyCreateModal,
  WatchPartyJoinModal,
  WatchPartyOverlay,
} from '../components/watchparty';
import { ChaptersOverlay, Chapter } from '../components/player';

export const PlayerScreen: React.FC = () => {
  const { t } = useTranslation();
  const navigation = useNavigation();
  const route = useRoute<any>();
  const { id, title, type } = route.params;

  const user = useAuthStore((s) => s.user);
  const token = useAuthStore((s) => s.token);
  const {
    party,
    participants,
    messages,
    isHost,
    isConnected,
    syncedPosition,
    isPlaying: partySyncPlaying,
    createParty,
    joinByCode,
    connect,
    sendMessage,
    syncPlayback,
    leaveParty,
    endParty,
  } = useWatchPartyStore();

  const videoRef = useRef<typeof VideoRef | HTMLVideoElement | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [streamUrl, setStreamUrl] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isPaused, setIsPaused] = useState(false);
  const [showControls, setShowControls] = useState(true);
  const [progress, setProgress] = useState({ currentTime: 0, duration: 0 });
  const controlsTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showJoinModal, setShowJoinModal] = useState(false);
  const [showPartyOverlay, setShowPartyOverlay] = useState(false);
  const [isSynced, setIsSynced] = useState(true);
  const lastSyncRef = useRef(0);

  // Chapters state
  const [chapters, setChapters] = useState<Chapter[]>([]);
  const [chaptersLoading, setChaptersLoading] = useState(false);
  const [showChaptersOverlay, setShowChaptersOverlay] = useState(false);

  useEffect(() => {
    loadStream();
    setupTVEventHandler();

    const backHandler = BackHandler.addEventListener('hardwareBackPress', () => {
      navigation.goBack();
      return true;
    });

    return () => {
      backHandler.remove();
      if (controlsTimeoutRef.current) {
        clearTimeout(controlsTimeoutRef.current);
      }
    };
  }, []);

  const setupTVEventHandler = () => {
    // Handle TV remote events - only on TV platforms
    if (!TVEventHandler || Platform.OS === 'web') {
      return () => {};
    }

    const tvEventHandler = new TVEventHandler();
    tvEventHandler.enable(null, (cmp: any, evt: any) => {
      if (evt && evt.eventType === 'select') {
        togglePlayPause();
      } else if (evt && evt.eventType === 'playPause') {
        togglePlayPause();
      }
      showControlsTemporarily();
    });

    return () => tvEventHandler.disable();
  };

  const loadStream = async () => {
    try {
      setIsLoading(true);
      setError(null);

      let response: any;
      if (type === 'live') {
        response = await liveService.getStreamUrl(id);
      } else {
        response = await contentService.getStreamUrl(id);
      }

      const url = response.url || response.stream_url;
      if (url) {
        setStreamUrl(url);
        // Load chapters after stream URL is obtained
        loadChapters();
      } else {
        setError(t('player.noStream', 'Stream not available'));
      }
    } catch (err) {
      console.error('Failed to load stream:', err);
      const errorMessage = err instanceof Error ? err.message : t('player.loadError', 'Failed to load stream');
      setError(errorMessage);
    } finally {
      setIsLoading(false);
    }
  };

  const loadChapters = async () => {
    if (!id) return;
    try {
      setChaptersLoading(true);
      const response = type === 'live'
        ? await chaptersService.getLiveChapters(id)
        : await chaptersService.getChapters(id);
      setChapters(response.chapters || []);
    } catch (err) {
      console.error('Failed to load chapters:', err);
      setChapters([]);
    } finally {
      setChaptersLoading(false);
    }
  };

  const togglePlayPause = () => {
    setIsPaused((prev) => !prev);
    showControlsTemporarily();
  };

  const showControlsTemporarily = () => {
    setShowControls(true);
    if (controlsTimeoutRef.current) {
      clearTimeout(controlsTimeoutRef.current);
    }
    controlsTimeoutRef.current = setTimeout(() => {
      if (!isPaused) {
        setShowControls(false);
      }
    }, 5000);
  };

  const handleProgress = (data: { currentTime: number; seekableDuration: number }) => {
    setProgress({
      currentTime: data.currentTime,
      duration: data.seekableDuration,
    });

    // Save progress for continue watching (silently ignore errors)
    if (type !== 'live' && data.seekableDuration > 0) {
      historyService.updateProgress(id, type, data.currentTime, data.seekableDuration).catch(() => {});
    }
  };

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  // Watch Party Sync - Participant follows host
  useEffect(() => {
    if (!party || isHost || !isConnected) return;
    const video = videoRef.current as HTMLVideoElement | null;
    if (!video || Platform.OS !== 'web') return;

    const diff = Math.abs(video.currentTime - syncedPosition);
    if (diff > 2) {
      video.currentTime = syncedPosition;
      setIsSynced(false);
      setTimeout(() => setIsSynced(true), 500);
    }

    if (partySyncPlaying && video.paused) {
      video.play();
    } else if (!partySyncPlaying && !video.paused) {
      video.pause();
    }
  }, [syncedPosition, partySyncPlaying, party, isHost, isConnected]);

  // Watch Party Sync - Host broadcasts position
  useEffect(() => {
    if (!party || !isHost || !isConnected) return;

    const now = Date.now();
    if (now - lastSyncRef.current < 1000) return;
    lastSyncRef.current = now;

    syncPlayback(progress.currentTime, !isPaused);
  }, [progress.currentTime, isPaused, party, isHost, isConnected, syncPlayback]);

  const handleCreateParty = async (options: { chatEnabled: boolean; syncPlayback: boolean }) => {
    if (!id) return;
    const newParty = await createParty(id, type, {
      title,
      chatEnabled: options.chatEnabled,
      syncPlayback: options.syncPlayback,
    });
    connect(newParty.id);
    setShowPartyOverlay(true);
  };

  const handleJoinParty = async (roomCode: string) => {
    const joinedParty = await joinByCode(roomCode);
    connect(joinedParty.id);
    setShowPartyOverlay(true);
  };

  const handleLeaveParty = async () => {
    await leaveParty();
    setShowPartyOverlay(false);
  };

  const handleEndParty = async () => {
    await endParty();
    setShowPartyOverlay(false);
  };

  const handleChapterSeek = (time: number) => {
    if (Platform.OS === 'web') {
      const video = videoRef.current as HTMLVideoElement | null;
      if (video) {
        video.currentTime = time;
      }
    } else if (videoRef.current && 'seek' in videoRef.current) {
      videoRef.current.seek(time);
    }
    showControlsTemporarily();
  };

  const progressPercentage = progress.duration > 0
    ? (progress.currentTime / progress.duration) * 100
    : 0;

  if (isLoading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#a855f7" />
        <Text style={styles.loadingText}>{t('player.loading')}</Text>
      </View>
    );
  }

  if (error) {
    return (
      <View style={styles.errorContainer}>
        <Text style={styles.errorText}>{error}</Text>
        <TouchableOpacity style={styles.retryButton} onPress={loadStream}>
          <Text style={styles.retryText}>{t('player.retry')}</Text>
        </TouchableOpacity>
      </View>
    );
  }

  // Web video player component
  const WebVideoPlayer = () => {
    const webVideoRef = useRef<HTMLVideoElement>(null);

    useEffect(() => {
      if (webVideoRef.current) {
        if (isPaused) {
          webVideoRef.current.pause();
        } else {
          webVideoRef.current.play();
        }
      }
    }, [isPaused]);

    useEffect(() => {
      const video = webVideoRef.current;
      if (!video) return;

      const handleTimeUpdate = () => {
        handleProgress({
          currentTime: video.currentTime,
          seekableDuration: video.duration || 0,
        });
      };

      video.addEventListener('timeupdate', handleTimeUpdate);
      return () => video.removeEventListener('timeupdate', handleTimeUpdate);
    }, []);

    return (
      <video
        ref={webVideoRef}
        src={streamUrl || ''}
        style={{ width: '100%', height: '100%', backgroundColor: '#000' }}
        autoPlay
        playsInline
        onError={() => setError(t('player.error'))}
        onLoadedData={() => setIsLoading(false)}
      />
    );
  };

  return (
    <View style={styles.container}>
      {streamUrl && Platform.OS === 'web' && <WebVideoPlayer />}
      {streamUrl && Platform.OS !== 'web' && Video && (
        <Video
          ref={videoRef}
          source={{ uri: streamUrl }}
          style={styles.video}
          resizeMode="contain"
          paused={isPaused}
          onProgress={handleProgress}
          onLoad={() => setIsLoading(false)}
          onError={() => setError(t('player.error'))}
          repeat={type === 'live'}
        />
      )}

      {/* Overlay Controls */}
      {showControls && (
        <View style={styles.overlay}>
          {/* Top Bar */}
          <View style={styles.topBar}>
            <TouchableOpacity
              style={styles.backButton}
              onPress={() => navigation.goBack()}
            >
              <Text style={styles.backButtonText}>{t('player.back')}</Text>
            </TouchableOpacity>
            <Text style={styles.title}>{title}</Text>
            <View style={styles.topBarActions}>
              {/* Chapters Button */}
              {chapters.length > 0 && (
                <TouchableOpacity
                  style={styles.chaptersButton}
                  onPress={() => setShowChaptersOverlay(!showChaptersOverlay)}
                >
                  <Text style={styles.chaptersButtonIcon}>📑</Text>
                  <Text style={styles.chaptersButtonText}>{t('chapters.title')}</Text>
                </TouchableOpacity>
              )}
              {/* Watch Party Button */}
              {user && id && (
                <WatchPartyButton
                  hasActiveParty={!!party}
                  onCreatePress={() => setShowCreateModal(true)}
                  onJoinPress={() => setShowJoinModal(true)}
                  onPanelToggle={() => setShowPartyOverlay(!showPartyOverlay)}
                />
              )}
            </View>
          </View>

          {/* Center Play/Pause */}
          <TouchableOpacity
            style={styles.centerControl}
            onPress={togglePlayPause}
          >
            <Text style={styles.playPauseIcon}>
              {isPaused ? '▶' : '⏸'}
            </Text>
          </TouchableOpacity>

          {/* Bottom Bar with Progress */}
          {type !== 'live' && (
            <View style={styles.bottomBar}>
              <Text style={styles.timeText}>
                {formatTime(progress.currentTime)}
              </Text>
              <View style={styles.progressBar}>
                <View
                  style={[styles.progressFill, { width: `${progressPercentage}%` }]}
                />
              </View>
              <Text style={styles.timeText}>
                {formatTime(progress.duration)}
              </Text>
            </View>
          )}

          {type === 'live' && (
            <View style={styles.liveIndicator}>
              <View style={styles.liveDot} />
              <Text style={styles.liveText}>{t('player.liveBadge')}</Text>
            </View>
          )}
        </View>
      )}

      {/* Watch Party Overlay */}
      <WatchPartyOverlay
        visible={showPartyOverlay && !!party}
        onClose={() => setShowPartyOverlay(false)}
        party={party}
        participants={participants}
        messages={messages}
        isHost={isHost}
        isSynced={isSynced}
        hostPaused={party && !partySyncPlaying}
        currentUserId={user?.id || ''}
        onLeave={handleLeaveParty}
        onEnd={handleEndParty}
        onSendMessage={sendMessage}
      />

      {/* Chapters Overlay */}
      <ChaptersOverlay
        chapters={chapters}
        currentTime={progress.currentTime}
        isLoading={chaptersLoading}
        visible={showChaptersOverlay}
        onClose={() => setShowChaptersOverlay(false)}
        onSeek={handleChapterSeek}
      />

      {/* Modals */}
      <WatchPartyCreateModal
        visible={showCreateModal}
        onClose={() => setShowCreateModal(false)}
        onCreate={handleCreateParty}
        contentTitle={title}
      />

      <WatchPartyJoinModal
        visible={showJoinModal}
        onClose={() => setShowJoinModal(false)}
        onJoin={handleJoinParty}
      />

      {/* Party Active Indicator */}
      {party && (
        <View style={styles.partyIndicator} pointerEvents="none" />
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000000',
  },
  video: {
    flex: 1,
  },
  loadingContainer: {
    flex: 1,
    backgroundColor: '#000000',
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    color: '#ffffff',
    fontSize: 18,
    marginTop: 16,
  },
  errorContainer: {
    flex: 1,
    backgroundColor: '#000000',
    justifyContent: 'center',
    alignItems: 'center',
  },
  errorText: {
    color: '#ff4444',
    fontSize: 20,
    marginBottom: 20,
  },
  retryButton: {
    backgroundColor: '#a855f7',
    paddingHorizontal: 32,
    paddingVertical: 16,
    borderRadius: 8,
  },
  retryText: {
    color: '#000000',
    fontSize: 18,
    fontWeight: 'bold',
  },
  overlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'space-between',
  },
  topBar: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 24,
  },
  backButton: {
    padding: 12,
    borderRadius: 8,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
  },
  backButtonText: {
    color: '#ffffff',
    fontSize: 18,
  },
  title: {
    color: '#ffffff',
    fontSize: 24,
    fontWeight: 'bold',
    marginLeft: 20,
  },
  centerControl: {
    alignSelf: 'center',
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: 'rgba(168, 85, 247, 0.8)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  playPauseIcon: {
    fontSize: 48,
    color: '#000000',
  },
  bottomBar: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 24,
    paddingBottom: 40,
  },
  timeText: {
    color: '#ffffff',
    fontSize: 16,
    minWidth: 60,
  },
  progressBar: {
    flex: 1,
    height: 6,
    backgroundColor: 'rgba(255, 255, 255, 0.3)',
    borderRadius: 3,
    marginHorizontal: 16,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    backgroundColor: '#a855f7',
    borderRadius: 3,
  },
  liveIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'center',
    marginBottom: 40,
    backgroundColor: 'rgba(255, 0, 0, 0.8)',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 8,
  },
  liveDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: '#ffffff',
    marginRight: 8,
  },
  liveText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: 'bold',
  },
  topBarActions: {
    flexDirection: 'row',
    alignItems: 'center',
    marginLeft: 'auto',
    gap: 12,
  },
  chaptersButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 8,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    gap: 8,
  },
  chaptersButtonIcon: {
    fontSize: 16,
  },
  chaptersButtonText: {
    color: '#ffffff',
    fontSize: 14,
    fontWeight: '500',
  },
  partyIndicator: {
    ...StyleSheet.absoluteFillObject,
    borderWidth: 2,
    borderColor: 'rgba(16, 185, 129, 0.5)',
    borderRadius: 8,
  },
});

export default PlayerScreen;
