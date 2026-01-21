import React, { useEffect, useState, useRef } from 'react';
import {
  View,
  Text,
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
import {
  ChaptersOverlay,
  Chapter,
  QualitySelector,
  QualityLevel,
  SubtitleSettings,
  SubtitlePreferences,
  AudioTrackSelector,
  AudioTrack,
  PlaybackSpeedControl,
  PlaybackSpeed,
  useQualityPreference,
  useSubtitlePreferences,
  usePlaybackSpeedPreference,
  isPlaybackSpeedSupported,
} from '../components/player';

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

  // Player controls state
  const [showQualitySelector, setShowQualitySelector] = useState(false);
  const [showSubtitleSettings, setShowSubtitleSettings] = useState(false);
  const [showAudioTrackSelector, setShowAudioTrackSelector] = useState(false);
  const [showPlaybackSpeedControl, setShowPlaybackSpeedControl] = useState(false);
  const [showSettingsMenu, setShowSettingsMenu] = useState(false);

  // Load saved preferences
  const savedQuality = useQualityPreference();
  const savedSubtitlePrefs = useSubtitlePreferences();
  const savedPlaybackSpeed = usePlaybackSpeedPreference();

  // Player state
  const [currentQuality, setCurrentQuality] = useState<QualityLevel>(savedQuality);
  const [subtitlePreferences, setSubtitlePreferences] = useState<SubtitlePreferences>(savedSubtitlePrefs);
  const [playbackSpeed, setPlaybackSpeed] = useState<PlaybackSpeed>(savedPlaybackSpeed);
  const [audioTracks] = useState<AudioTrack[]>([]);
  const [selectedAudioTrack, setSelectedAudioTrack] = useState<string>('default');

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

  const handleQualityChange = (quality: QualityLevel) => {
    setCurrentQuality(quality);
    // For web, quality switching would be handled by HLS.js
    // For React Native, would use selectedVideoTrack prop
    showControlsTemporarily();
  };

  const handleSubtitlePreferencesChange = (prefs: SubtitlePreferences) => {
    setSubtitlePreferences(prefs);
    // Apply subtitle styling to video element
    showControlsTemporarily();
  };

  const handleAudioTrackChange = (trackId: string) => {
    setSelectedAudioTrack(trackId);
    // For web, switch audio track via HTMLMediaElement
    // For React Native, use selectedAudioTrack prop
    showControlsTemporarily();
  };

  const handlePlaybackSpeedChange = (speed: PlaybackSpeed) => {
    setPlaybackSpeed(speed);
    if (Platform.OS === 'web') {
      const video = videoRef.current as HTMLVideoElement | null;
      if (video) {
        video.playbackRate = speed;
      }
    }
    // React Native Video may not support playback speed
    showControlsTemporarily();
  };

  const progressPercentage = progress.duration > 0
    ? (progress.currentTime / progress.duration) * 100
    : 0;

  if (isLoading) {
    return (
      <View className="flex-1 bg-black justify-center items-center">
        <ActivityIndicator size="large" color="#a855f7" />
        <Text className="text-white text-lg mt-4">{t('player.loading')}</Text>
      </View>
    );
  }

  if (error) {
    return (
      <View className="flex-1 bg-black justify-center items-center">
        <Text className="text-red-500 text-xl mb-5">{error}</Text>
        <TouchableOpacity className="bg-purple-500 px-8 py-4 rounded-lg" onPress={loadStream}>
          <Text className="text-black text-lg font-bold">{t('player.retry')}</Text>
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
    <View className="flex-1 bg-black">
      {streamUrl && Platform.OS === 'web' && <WebVideoPlayer />}
      {streamUrl && Platform.OS !== 'web' && Video && (
        <Video
          ref={videoRef}
          source={{ uri: streamUrl }}
          className="flex-1"
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
        <View className="absolute inset-0 bg-black/50 justify-between">
          {/* Top Bar */}
          <View className="flex-row items-center p-6">
            <TouchableOpacity
              className="p-3 rounded-lg bg-white/10"
              onPress={() => navigation.goBack()}
            >
              <Text className="text-white text-lg">{t('player.back')}</Text>
            </TouchableOpacity>
            <Text className="text-white text-2xl font-bold ml-5">{title}</Text>
            <View className="flex-row items-center ml-auto gap-3">
              {/* Settings Button */}
              <TouchableOpacity
                className="w-11 h-11 rounded-full bg-white/10 justify-center items-center"
                onPress={() => setShowSettingsMenu(!showSettingsMenu)}
              >
                <Text className="text-[22px]">&#x2699;&#xFE0F;</Text>
              </TouchableOpacity>
              {/* Chapters Button */}
              {chapters.length > 0 && (
                <TouchableOpacity
                  className="flex-row items-center px-4 py-2.5 rounded-lg bg-white/10 gap-2"
                  onPress={() => setShowChaptersOverlay(!showChaptersOverlay)}
                >
                  <Text className="text-base">&#x1F4D1;</Text>
                  <Text className="text-white text-sm font-medium">{t('chapters.title')}</Text>
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
            className="self-center w-[100px] h-[100px] rounded-full bg-purple-500/80 justify-center items-center"
            onPress={togglePlayPause}
          >
            <Text className="text-5xl text-black">
              {isPaused ? '\u25B6' : '\u23F8'}
            </Text>
          </TouchableOpacity>

          {/* Bottom Bar with Progress */}
          {type !== 'live' && (
            <View className="flex-row items-center p-6 pb-10">
              <Text className="text-white text-base min-w-[60px]">
                {formatTime(progress.currentTime)}
              </Text>
              <View className="flex-1 h-1.5 bg-white/30 rounded-sm mx-4 overflow-hidden">
                <View
                  className="h-full bg-purple-500 rounded-sm"
                  style={{ width: `${progressPercentage}%` }}
                />
              </View>
              <Text className="text-white text-base min-w-[60px]">
                {formatTime(progress.duration)}
              </Text>
            </View>
          )}

          {type === 'live' && (
            <View className="flex-row items-center self-center mb-10 bg-red-500/80 px-4 py-2 rounded-lg">
              <View className="w-2.5 h-2.5 rounded-full bg-white mr-2" />
              <Text className="text-white text-base font-bold">{t('player.liveBadge')}</Text>
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

      {/* Settings Menu */}
      {showSettingsMenu && (
        <View className="absolute top-20 right-6 bg-[rgba(20,20,20,0.95)] rounded-xl border-2 border-purple-500/30 py-2 min-w-[200px] backdrop-blur-xl">
          <TouchableOpacity
            className="flex-row items-center px-4 py-3 gap-3"
            onPress={() => {
              setShowQualitySelector(true);
              setShowSettingsMenu(false);
            }}
          >
            <Text className="text-xl">&#x1F3AC;</Text>
            <Text className="text-white text-base font-medium">{t('player.quality', 'Video Quality')}</Text>
          </TouchableOpacity>

          <TouchableOpacity
            className="flex-row items-center px-4 py-3 gap-3"
            onPress={() => {
              setShowSubtitleSettings(true);
              setShowSettingsMenu(false);
            }}
          >
            <Text className="text-xl">&#x1F4AC;</Text>
            <Text className="text-white text-base font-medium">{t('player.subtitles', 'Subtitles')}</Text>
          </TouchableOpacity>

          {audioTracks.length > 0 && (
            <TouchableOpacity
              className="flex-row items-center px-4 py-3 gap-3"
              onPress={() => {
                setShowAudioTrackSelector(true);
                setShowSettingsMenu(false);
              }}
            >
              <Text className="text-xl">&#x1F50A;</Text>
              <Text className="text-white text-base font-medium">{t('player.audio', 'Audio Track')}</Text>
            </TouchableOpacity>
          )}

          {isPlaybackSpeedSupported() && (
            <TouchableOpacity
              className="flex-row items-center px-4 py-3 gap-3"
              onPress={() => {
                setShowPlaybackSpeedControl(true);
                setShowSettingsMenu(false);
              }}
            >
              <Text className="text-xl">&#x23E9;</Text>
              <Text className="text-white text-base font-medium">{t('player.speed', 'Playback Speed')}</Text>
            </TouchableOpacity>
          )}
        </View>
      )}

      {/* Player Control Modals */}
      <QualitySelector
        visible={showQualitySelector}
        onClose={() => setShowQualitySelector(false)}
        currentQuality={currentQuality}
        onQualityChange={handleQualityChange}
      />

      <SubtitleSettings
        visible={showSubtitleSettings}
        onClose={() => setShowSubtitleSettings(false)}
        currentPreferences={subtitlePreferences}
        onPreferencesChange={handleSubtitlePreferencesChange}
      />

      <AudioTrackSelector
        visible={showAudioTrackSelector}
        onClose={() => setShowAudioTrackSelector(false)}
        audioTracks={audioTracks}
        selectedTrackId={selectedAudioTrack}
        onTrackChange={handleAudioTrackChange}
      />

      <PlaybackSpeedControl
        visible={showPlaybackSpeedControl}
        onClose={() => setShowPlaybackSpeedControl(false)}
        currentSpeed={playbackSpeed}
        onSpeedChange={handlePlaybackSpeedChange}
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
        <View className="absolute inset-0 border-2 border-emerald-500/50 rounded-lg pointer-events-none" />
      )}
    </View>
  );
};

export default PlayerScreen;
