/**
 * LiveDubbingOverlayMobile - Live dubbing wrapper for mobile
 *
 * Integrates the shared useLiveDubbing hook with the native audio
 * player module and renders dubbing controls for live channels.
 */

import React, { useEffect } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import Animated, { FadeIn, FadeOut } from 'react-native-reanimated';
import { useTranslation } from 'react-i18next';
import { GlassView } from '@bayit/shared';
import { GlassLoadingSpinner } from '@bayit/shared/ui';
import { NativeIcon } from '@olorin/shared-icons/native';
import { spacing, borderRadius } from '@olorin/design-tokens';
import { useLiveDubbing } from '@bayit/shared/hooks/useLiveDubbing';
import { liveDubbingAudioPlayer } from '../../../native/LiveDubbingAudioModule';
import { LiveDubbingControlsMobile } from './LiveDubbingControlsMobile';
import { logger } from '../../../utils/logger';
import Colors from '../../../theme/colors';

const log = logger.scope('LiveDubbingOverlayMobile');

interface LiveDubbingOverlayMobileProps { channelId: string; visible: boolean; }

export const LiveDubbingOverlayMobile: React.FC<LiveDubbingOverlayMobileProps> = ({
  channelId, visible,
}) => {
  const { t } = useTranslation();
  const dub = useLiveDubbing({ channelId, audioPlayer: liveDubbingAudioPlayer, autoConnect: false });

  useEffect(() => {
    if (visible && !dub.isConnected && !dub.isConnecting)
      log.info('Live dubbing overlay visible', { channelId });
  }, [visible, dub.isConnected, dub.isConnecting, channelId]);

  if (!visible) return null;

  return (
    <Animated.View entering={FadeIn.duration(250)} exiting={FadeOut.duration(200)} style={styles.container}>
      <GlassView intensity="high" style={styles.panel}>
        <View style={styles.header}>
          <NativeIcon name="radio" size="md" color={Colors.Primary.p400} />
          <Text style={styles.title}>{t('dubbing.liveOverlay.title')}</Text>
          <View style={[styles.dot, dub.isConnected ? styles.dotOn : styles.dotOff]} />
        </View>
        {dub.isConnecting && (
          <View style={styles.row}>
            <GlassLoadingSpinner size="small" />
            <Text style={styles.muted}>{t('dubbing.liveOverlay.connecting')}</Text>
          </View>
        )}
        {dub.error && (
          <View style={styles.errRow}>
            <NativeIcon name="alert-triangle" size="sm" color={Colors.Error.default} />
            <Text style={styles.errText}>{dub.error}</Text>
          </View>
        )}
        {dub.lastTranscript && dub.isConnected && (
          <View style={styles.transcriptBox}>
            <Text style={styles.transcriptLabel}>{t('dubbing.liveOverlay.transcript')}</Text>
            <Text style={styles.transcriptText} numberOfLines={2}>{dub.lastTranscript}</Text>
            {dub.lastTranslation && <Text style={styles.translationText} numberOfLines={2}>{dub.lastTranslation}</Text>}
          </View>
        )}
        <LiveDubbingControlsMobile channelId={channelId} isConnected={dub.isConnected} isConnecting={dub.isConnecting}
          targetLanguage={dub.targetLanguage} availableLanguages={dub.availableLanguages}
          dubbedVolume={dub.dubbedVolume} originalVolume={dub.originalVolume}
          onConnect={dub.connect} onDisconnect={dub.disconnect} onLanguageChange={dub.setTargetLanguage}
          onDubbedVolumeChange={dub.setDubbedVolume} onOriginalVolumeChange={dub.setOriginalVolume} />
      </GlassView>
    </Animated.View>
  );
};

const styles = StyleSheet.create({
  container: { position: 'absolute', bottom: spacing.xxl, left: spacing.md, right: spacing.md },
  panel: {
    borderRadius: borderRadius.lg, padding: spacing.md,
    borderWidth: 1, borderColor: Colors.Glass.border, backgroundColor: Colors.Glass.bgStrong,
  },
  header: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, marginBottom: spacing.sm },
  title: { fontSize: 16, fontWeight: '600', color: Colors.Text.primary, flex: 1 },
  dot: { width: 8, height: 8, borderRadius: 4 },
  dotOn: { backgroundColor: Colors.Success.default },
  dotOff: { backgroundColor: Colors.Text.disabled },
  row: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, paddingVertical: spacing.xs, justifyContent: 'center' },
  muted: { fontSize: 13, color: Colors.Text.muted },
  errRow: {
    flexDirection: 'row', alignItems: 'center', gap: spacing.xs,
    padding: spacing.xs, backgroundColor: Colors.Error.alpha20, borderRadius: borderRadius.sm, marginBottom: spacing.xs,
  },
  errText: { fontSize: 12, color: Colors.Error.default, flex: 1 },
  transcriptBox: {
    padding: spacing.sm, backgroundColor: Colors.Glass.whiteSubtle,
    borderRadius: borderRadius.sm, marginBottom: spacing.sm, gap: 4,
  },
  transcriptLabel: { fontSize: 10, fontWeight: '700', color: Colors.Text.disabled, textTransform: 'uppercase' },
  transcriptText: { fontSize: 13, color: Colors.Text.secondary, writingDirection: 'rtl' },
  translationText: { fontSize: 13, color: Colors.Primary.p300 },
});
