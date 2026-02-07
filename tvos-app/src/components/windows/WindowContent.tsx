/**
 * WindowContent - Content renderer for multi-window system
 * Routes window content types to real player components
 */

import React from 'react';
import { View, Text, Pressable, Linking, StyleSheet } from 'react-native';
import type { Window } from '../../stores/multiWindowStore';
import { useMultiWindowStore } from '../../stores/multiWindowStore';
import { useTranslation } from 'react-i18next';
import { colors, spacing } from '@olorin/design-tokens';
import config from '@/config/appConfig';
import {
  WindowLivePlayer,
  WindowVODPlayer,
  WindowPodcastPlayer,
  WindowRadioPlayer,
} from './players';

interface WindowContentProps {
  window: Window;
  streamUrl?: string;
  loading: boolean;
  error: string | null;
}

export function WindowContent({ window: win, streamUrl, loading, error }: WindowContentProps) {
  const { t } = useTranslation();
  const activeAudioWindow = useMultiWindowStore((s) => s.activeAudioWindow);
  const closeWindow = useMultiWindowStore((s) => s.closeWindow);
  const isAudioActive = activeAudioWindow === win.id;
  const handleClose = () => closeWindow(win.id);

  if (loading) {
    return (
      <View style={styles.centerContent}>
        <View style={styles.spinner} />
        <Text style={styles.loadingText}>{t('tvos.player.loading')}</Text>
      </View>
    );
  }

  if (error) {
    return (
      <View style={styles.centerContent}>
        <Text style={styles.errorText}>{error}</Text>
      </View>
    );
  }

  const { content_type } = win.content;

  switch (content_type) {
    case 'live_channel':
    case 'live':
      if (!streamUrl) {
        return (
          <View style={styles.centerContent}>
            <Text style={styles.errorText}>{t('tvos.player.streamUnavailable')}</Text>
          </View>
        );
      }
      return (
        <WindowLivePlayer
          windowId={win.id}
          channelUrl={streamUrl}
          channelName={win.title}
          isAudioActive={isAudioActive}
          onClose={handleClose}
        />
      );

    case 'vod':
      if (!streamUrl) {
        return (
          <View style={styles.centerContent}>
            <Text style={styles.errorText}>{t('tvos.player.contentUnavailable')}</Text>
          </View>
        );
      }
      return (
        <WindowVODPlayer
          windowId={win.id}
          contentUrl={streamUrl}
          title={win.title}
          isAudioActive={isAudioActive}
          onClose={handleClose}
        />
      );

    case 'podcast':
      if (!streamUrl) {
        return (
          <View style={styles.centerContent}>
            <Text style={styles.errorText}>{t('tvos.player.podcastUnavailable')}</Text>
          </View>
        );
      }
      return (
        <WindowPodcastPlayer
          windowId={win.id}
          audioUrl={streamUrl}
          title={win.title}
          artworkUrl={win.cover_url ?? ''}
          isAudioActive={isAudioActive}
          onClose={handleClose}
        />
      );

    case 'radio':
      if (!streamUrl) {
        return (
          <View style={styles.centerContent}>
            <Text style={styles.errorText}>{t('tvos.player.stationUnavailable')}</Text>
          </View>
        );
      }
      return (
        <WindowRadioPlayer
          windowId={win.id}
          streamUrl={streamUrl}
          stationName={win.title}
          isAudioActive={isAudioActive}
          onClose={handleClose}
        />
      );

    case 'iframe':
      if (!win.content.iframe_url) {
        return (
          <View style={styles.centerContent}>
            <Text style={styles.errorText}>{t('tvos.player.iframeNotConfigured')}</Text>
          </View>
        );
      }
      return (
        <View style={styles.centerContent}>
          <Text style={styles.iframeText}>{t('tvos.player.externalContent')}</Text>
          <Pressable
            style={({ focused }) => [styles.iframeButton, focused && styles.iframeButtonFocused]}
            onPress={() => Linking.openURL(win.content.iframe_url!)}
          >
            <Text style={styles.iframeButtonText}>{t('tvos.player.openUrl')}</Text>
          </Pressable>
        </View>
      );

    case 'custom':
      return (
        <View style={styles.centerContent}>
          <Text style={styles.errorText}>
            {t('tvos.player.componentNotAvailable', { name: win.content.component_name })}
          </Text>
        </View>
      );

    default:
      return (
        <View style={styles.centerContent}>
          <Text style={styles.errorText}>{t('tvos.player.noContent')}</Text>
        </View>
      );
  }
}

const fs = config.tv.minButtonTextSizePt;
const styles = StyleSheet.create({
  centerContent: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: colors.glassOverlay },
  spinner: { width: 32, height: 32, borderRadius: 16, borderWidth: 3, borderColor: colors.glassBorderLight, borderTopColor: colors.white },
  loadingText: { marginTop: spacing.md, fontSize: fs, color: colors.textMuted },
  errorText: { fontSize: fs, color: colors.textMuted, paddingHorizontal: spacing.lg, textAlign: 'center' },
  iframeText: { fontSize: fs, color: colors.textMuted, marginBottom: spacing.md },
  iframeButton: {
    paddingHorizontal: spacing.lg, paddingVertical: spacing.sm,
    backgroundColor: colors.glassMedium, borderRadius: 12, borderWidth: 1, borderColor: colors.glassBorderLight,
  },
  iframeButtonFocused: { borderColor: colors.primary[500], backgroundColor: colors.glassPurpleLight },
  iframeButtonText: { fontSize: fs, color: colors.white, fontWeight: '500' },
});
