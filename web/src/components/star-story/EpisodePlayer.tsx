import { useRef, useEffect, useCallback, useState } from 'react';
import { View, Text, Pressable, StyleSheet } from 'react-native';
import { ArrowLeft, Volume2, VolumeX } from 'lucide-react';
import Hls from 'hls.js';
import { colors, spacing, borderRadius, fontSize } from '@olorin/design-tokens';
import logger from '@bayit/shared-utils/logger';

const playerLogger = logger.scope('EpisodePlayer');

interface EpisodePlayerProps {
  hlsUrl: string;
  title: string;
  episodeNumber: number;
  onBack: () => void;
}

export function EpisodePlayer({ hlsUrl, title, episodeNumber, onBack }: EpisodePlayerProps) {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const hlsRef = useRef<Hls | null>(null);
  const [isMuted, setIsMuted] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const initHLS = useCallback(() => {
    const video = videoRef.current;
    if (!video || !hlsUrl) return;

    if (hlsRef.current) {
      hlsRef.current.destroy();
      hlsRef.current = null;
    }

    if (Hls.isSupported()) {
      const hls = new Hls({ enableWorker: true, lowLatencyMode: false });
      hls.loadSource(hlsUrl);
      hls.attachMedia(video);
      hls.on(Hls.Events.MANIFEST_PARSED, () => {
        video.play().catch((err) => playerLogger.warn('Autoplay blocked', err));
      });
      hls.on(Hls.Events.ERROR, (_event, data) => {
        if (data.fatal) {
          playerLogger.error('HLS fatal error', { type: data.type, details: data.details });
          setError('Playback error. Please try again.');
          hls.destroy();
        }
      });
      hlsRef.current = hls;
      playerLogger.info('HLS initialized', { url: hlsUrl });
    } else if (video.canPlayType('application/vnd.apple.mpegurl')) {
      video.src = hlsUrl;
      video.addEventListener('loadedmetadata', () => {
        video.play().catch((err) => playerLogger.warn('Autoplay blocked (native)', err));
      });
      playerLogger.info('Native HLS initialized', { url: hlsUrl });
    } else {
      setError('HLS playback is not supported in this browser.');
      playerLogger.error('HLS not supported');
    }
  }, [hlsUrl]);

  useEffect(() => {
    initHLS();
    return () => {
      if (hlsRef.current) {
        hlsRef.current.destroy();
        hlsRef.current = null;
      }
    };
  }, [initHLS]);

  const toggleMute = useCallback(() => {
    if (videoRef.current) {
      videoRef.current.muted = !videoRef.current.muted;
      setIsMuted(videoRef.current.muted);
    }
  }, []);

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Pressable style={styles.backButton} onPress={onBack}>
          <ArrowLeft size={20} color={colors.text} />
        </Pressable>
        <View style={styles.titleArea}>
          <Text style={styles.episodeLabel}>Episode {episodeNumber}</Text>
          <Text style={styles.title} numberOfLines={1}>{title}</Text>
        </View>
        <Pressable style={styles.muteButton} onPress={toggleMute}>
          {isMuted
            ? <VolumeX size={20} color={colors.textSecondary} />
            : <Volume2 size={20} color={colors.text} />}
        </Pressable>
      </View>

      <View style={styles.videoContainer}>
        {error ? (
          <View style={styles.errorOverlay}>
            <Text style={styles.errorText}>{error}</Text>
            <Pressable style={styles.retryButton} onPress={initHLS}>
              <Text style={styles.retryText}>Retry</Text>
            </Pressable>
          </View>
        ) : (
          <video
            ref={videoRef}
            style={{ width: '100%', height: '100%', borderRadius: 12, backgroundColor: '#000' }}
            controls
            playsInline
          />
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  header: {
    flexDirection: 'row', alignItems: 'center', gap: spacing[3],
    paddingHorizontal: spacing[4], paddingVertical: spacing[3],
  },
  backButton: {
    width: 40, height: 40, borderRadius: borderRadius.full, backgroundColor: colors.glass.bgMedium,
    justifyContent: 'center', alignItems: 'center', borderWidth: 1, borderColor: colors.glass.border,
  },
  titleArea: { flex: 1, gap: spacing[1] },
  episodeLabel: { fontSize: fontSize.xs, color: colors.primary[400], fontWeight: '600', textTransform: 'uppercase' },
  title: { fontSize: fontSize.base, fontWeight: '600', color: colors.text },
  muteButton: {
    width: 40, height: 40, borderRadius: borderRadius.full, backgroundColor: colors.glass.bgMedium,
    justifyContent: 'center', alignItems: 'center', borderWidth: 1, borderColor: colors.glass.border,
  },
  videoContainer: {
    flex: 1, marginHorizontal: spacing[4], marginBottom: spacing[4],
    borderRadius: borderRadius.xl, overflow: 'hidden', backgroundColor: '#000',
  },
  errorOverlay: {
    flex: 1, justifyContent: 'center', alignItems: 'center', gap: spacing[3],
    backgroundColor: colors.glass.bgStrong,
  },
  errorText: { fontSize: fontSize.sm, color: colors.error[500] },
  retryButton: {
    backgroundColor: colors.primary[600], borderRadius: borderRadius.md,
    paddingHorizontal: spacing[4], paddingVertical: spacing[2],
  },
  retryText: { fontSize: fontSize.sm, fontWeight: '600', color: colors.white },
});
