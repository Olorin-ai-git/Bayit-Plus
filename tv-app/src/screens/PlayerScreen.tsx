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
import { contentService, liveService, historyService } from '../services/api';

export const PlayerScreen: React.FC = () => {
  const { t } = useTranslation();
  const navigation = useNavigation();
  const route = useRoute<any>();
  const { id, title, type } = route.params;

  const videoRef = useRef<VideoRef>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [streamUrl, setStreamUrl] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isPaused, setIsPaused] = useState(false);
  const [showControls, setShowControls] = useState(true);
  const [progress, setProgress] = useState({ currentTime: 0, duration: 0 });
  const controlsTimeoutRef = useRef<NodeJS.Timeout | null>(null);

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

      let response;
      if (type === 'live') {
        response = await liveService.getStreamUrl(id);
      } else {
        response = await contentService.getStreamUrl(id);
      }

      if (response.url) {
        setStreamUrl(response.url);
      } else {
        // Demo stream for testing
        setStreamUrl('https://test-streams.mux.dev/x36xhzz/x36xhzz.m3u8');
      }
    } catch (err) {
      console.error('Failed to load stream:', err);
      // Use demo stream on error
      setStreamUrl('https://test-streams.mux.dev/x36xhzz/x36xhzz.m3u8');
    } finally {
      setIsLoading(false);
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

  const progressPercentage = progress.duration > 0
    ? (progress.currentTime / progress.duration) * 100
    : 0;

  if (isLoading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#00d9ff" />
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
    backgroundColor: '#00d9ff',
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
    backgroundColor: 'rgba(0, 217, 255, 0.8)',
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
    backgroundColor: '#00d9ff',
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
});

export default PlayerScreen;
