/**
 * BilingualDubbingOverlay - Audio mix controls for dubbing
 *
 * Modal overlay for adjusting original/dubbed audio balance,
 * selecting voice, and target language.
 */

import React, { useState, useCallback } from 'react';
import { View, Text, ScrollView, StyleSheet } from 'react-native';
import { useTranslation } from 'react-i18next';
import { GlassButton, GlassModal, spacing, borderRadius } from '@olorin/glass-ui/native';
import { GlassLoadingSpinner } from '@bayit/shared/ui';
import { NativeIcon } from '@olorin/shared-icons/native';
import { useLiveDubbing } from '@bayit/shared/hooks/useLiveDubbing';
import { liveDubbingAudioPlayer } from '../../../native/LiveDubbingAudioModule';
import { LanguageRatio } from './LanguageRatio';
import { VoiceSelector } from './VoiceSelector';
import { logger } from '../../../utils/logger';
import Colors from '../../../theme/colors';

const log = logger.scope('BilingualDubbingOverlay');
const RECONNECT_DELAY_MS = 500;

interface BilingualDubbingOverlayProps {
  visible: boolean;
  onClose: () => void;
  contentId: string;
}

export const BilingualDubbingOverlay: React.FC<BilingualDubbingOverlayProps> = ({
  visible, onClose, contentId,
}) => {
  const { t } = useTranslation();
  const [showVoices, setShowVoices] = useState(false);
  const dub = useLiveDubbing({ channelId: contentId, audioPlayer: liveDubbingAudioPlayer });

  const handleRatio = useCallback((r: number) => { dub.setDubbedVolume(r); dub.setOriginalVolume(1 - r); }, [dub]);
  const handleConnect = useCallback(() => { dub.connect(); log.info('Dubbing connect', { contentId }); }, [dub, contentId]);
  const handleDisconnect = useCallback(() => { dub.disconnect(); log.info('Dubbing disconnect', { contentId }); }, [dub, contentId]);

  const handleVoiceSelect = useCallback((voiceId: string) => {
    setShowVoices(false);
    dub.disconnect();
    setTimeout(() => dub.connect(dub.targetLanguage, voiceId), RECONNECT_DELAY_MS);
    log.info('Voice selected', { voiceId, contentId });
  }, [dub, contentId]);

  const handleLang = useCallback((l: string) => { dub.setTargetLanguage(l); log.info('Lang changed', { l }); }, [dub]);

  return (
    <GlassModal visible={visible} onClose={onClose} dismissable size="large" buttons={[]}>
      <ScrollView style={styles.scroll} contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <View style={styles.header}>
          <NativeIcon name="languages" size="lg" color={Colors.Primary.p400} />
          <Text style={styles.title}>{t('dubbing.overlay.title')}</Text>
        </View>
        {dub.error && (
          <View style={styles.errorRow}>
            <NativeIcon name="alert-triangle" size="sm" color={Colors.Error.default} />
            <Text style={styles.errorText}>{dub.error}</Text>
          </View>
        )}
        {dub.isConnecting && (
          <View style={styles.row}>
            <GlassLoadingSpinner size="small" />
            <Text style={styles.muted}>{t('dubbing.overlay.connecting')}</Text>
          </View>
        )}
        <View style={styles.statusRow}>
          <View style={[styles.dot, dub.isConnected ? styles.dotOn : styles.dotOff]} />
          <Text style={styles.statusText}>
            {dub.isConnected ? t('dubbing.overlay.connected') : t('dubbing.overlay.disconnected')}
          </Text>
        </View>
        {!dub.isConnected && !dub.isConnecting && (
          <GlassButton variant="primary" onPress={handleConnect} disabled={!dub.isAvailable}
            accessibilityLabel={t('dubbing.overlay.connect')} accessibilityHint={t('dubbing.overlay.connectHint')}
            accessibilityRole="button">{t('dubbing.overlay.startDubbing')}</GlassButton>
        )}
        {dub.isConnected && (
          <>
            <LanguageRatio ratio={dub.dubbedVolume} onChange={handleRatio} originalLang="he" targetLang={dub.targetLanguage} />
            <View style={styles.langSection}>
              <Text style={styles.label}>{t('dubbing.overlay.targetLanguage')}</Text>
              <View style={styles.pills}>
                {dub.availableLanguages.map((l) => (
                  <GlassButton key={l} variant={dub.targetLanguage === l ? 'primary' : 'ghost'} size="small"
                    onPress={() => handleLang(l)} accessibilityLabel={l.toUpperCase()} accessibilityRole="radio"
                    accessibilityState={{ selected: dub.targetLanguage === l }}>{l.toUpperCase()}</GlassButton>
                ))}
              </View>
            </View>
            <GlassButton variant="secondary" size="small" onPress={() => setShowVoices((v) => !v)}
              accessibilityLabel={t('dubbing.overlay.changeVoice')} accessibilityRole="button">
              {t('dubbing.overlay.changeVoice')}
            </GlassButton>
            {showVoices && (
              <VoiceSelector selectedVoice={null} onSelect={handleVoiceSelect}
                voices={dub.availableVoices.map((v) => ({
                  id: v.voice_id || v.id, name: v.name, gender: v.gender || 'neutral',
                  language: v.language || dub.targetLanguage, previewUrl: v.preview_url,
                }))} />
            )}
            <View style={styles.statRow}>
              <Text style={styles.statLabel}>{t('dubbing.overlay.latency')}</Text>
              <Text style={styles.statVal}>{dub.latencyMs}ms</Text>
            </View>
            <GlassButton variant="ghost" size="small" onPress={handleDisconnect}
              accessibilityLabel={t('dubbing.overlay.stop')} accessibilityHint={t('dubbing.overlay.stopHint')}
              accessibilityRole="button">{t('dubbing.overlay.stopDubbing')}</GlassButton>
          </>
        )}
      </ScrollView>
    </GlassModal>
  );
};

const styles = StyleSheet.create({
  scroll: { flex: 1 },
  content: { padding: spacing.md, gap: spacing.md },
  header: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  title: { fontSize: 18, fontWeight: '700', color: Colors.Text.primary },
  errorRow: {
    flexDirection: 'row', alignItems: 'center', gap: spacing.xs,
    padding: spacing.sm, backgroundColor: Colors.Error.alpha20, borderRadius: borderRadius.md,
  },
  errorText: { fontSize: 13, color: Colors.Error.default, flex: 1 },
  row: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, justifyContent: 'center' },
  muted: { fontSize: 14, color: Colors.Text.muted },
  statusRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.xs },
  dot: { width: 8, height: 8, borderRadius: 4 },
  dotOn: { backgroundColor: Colors.Success.default },
  dotOff: { backgroundColor: Colors.Text.disabled },
  statusText: { fontSize: 13, color: Colors.Text.secondary },
  label: { fontSize: 14, fontWeight: '600', color: Colors.Text.primary, marginBottom: spacing.xs },
  langSection: { gap: spacing.xs },
  pills: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.xs },
  statRow: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    padding: spacing.sm, backgroundColor: Colors.Glass.whiteSubtle, borderRadius: borderRadius.sm,
  },
  statLabel: { fontSize: 12, color: Colors.Text.muted },
  statVal: { fontSize: 14, fontWeight: '600', color: Colors.Text.primary },
});
