/**
 * TalkBackOverlay - Voice discussion overlay for AI content conversations
 *
 * Provides microphone button, voice waveform visualization,
 * character display, and AI response rendering.
 */

import React, { useState, useCallback } from 'react';
import { View, Text, Pressable, StyleSheet, SafeAreaView } from 'react-native';
import { useTranslation } from 'react-i18next';
import ReactNativeHapticFeedback from 'react-native-haptic-feedback';
import { useDirection } from '@bayit/shared-hooks';
import { GlassButton } from '@bayit/shared/ui';
import { NativeIcon } from '@olorin/shared-icons/native';
import { colors, spacing, borderRadius, fontSize } from '@olorin/design-tokens';
import { talkBackService } from '@bayit/shared-services/api';
import { Colors } from '../../../theme/colors';
import VoiceWaveform from '../../voice/VoiceWaveform';
import { TalkBackCharacter, type TalkBackCharacterData } from './TalkBackCharacter';
import { TalkBackResult } from './TalkBackResult';
import logger from '@/utils/logger';

const log = logger.scope('TalkBackOverlay');

interface TalkBackOverlayProps {
  visible: boolean;
  onClose: () => void;
  contentId: string;
  currentTime: number;
}

export const TalkBackOverlay: React.FC<TalkBackOverlayProps> = ({
  visible, onClose, contentId, currentTime,
}) => {
  const { t } = useTranslation();
  const { textAlign } = useDirection();
  const [isListening, setIsListening] = useState(false);
  const [response, setResponse] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [character, setCharacter] = useState<TalkBackCharacterData | null>(null);

  const handleMicPress = useCallback(async () => {
    ReactNativeHapticFeedback.trigger('impactMedium');
    if (isListening) {
      setIsListening(false);
      setIsProcessing(true);
      log.info('TalkBack mic released, processing', { contentId, currentTime });
      try {
        const result = await talkBackService.processVoiceQuery(contentId, currentTime);
        setResponse(result.response);
        if (result.character) { setCharacter(result.character); }
      } catch (err: unknown) {
        log.error('TalkBack processing failed', { contentId, error: err });
        setResponse(t('talkBack.processingError'));
      } finally { setIsProcessing(false); }
    } else {
      setIsListening(true);
      setResponse('');
      log.info('TalkBack mic activated', { contentId, currentTime });
    }
  }, [isListening, contentId, currentTime, t]);

  const handleClose = useCallback(() => {
    setIsListening(false); setResponse(''); setIsProcessing(false); setCharacter(null);
    log.info('TalkBack overlay closed'); onClose();
  }, [onClose]);

  if (!visible) { return null; }

  const statusKey = isListening ? 'talkBack.listening' : isProcessing ? 'talkBack.processing' : 'talkBack.tapToSpeak';

  return (
    <SafeAreaView style={styles.overlay}>
      <View style={styles.container}>
        <View style={styles.header}>
          <Text style={[styles.title, { textAlign }]} accessible accessibilityRole="header">
            {t('talkBack.title')}
          </Text>
          <GlassButton variant="ghost" onPress={handleClose} style={styles.closeButton}
            accessibilityLabel={t('common.close')} accessibilityHint={t('talkBack.closeOverlayHint')}
            accessibilityRole="button">
            <NativeIcon name="x" size="md" color={Colors.white} />
          </GlassButton>
        </View>
        {character && <View style={styles.characterSection}><TalkBackCharacter character={character} /></View>}
        <View style={styles.waveformSection}>
          <VoiceWaveform isListening={isListening} amplitude={isListening ? 0.7 : 0.2} color={Colors.Primary.p400} />
          <Text style={styles.statusText}>{t(statusKey)}</Text>
        </View>
        <TalkBackResult response={response} isLoading={isProcessing} />
        <Pressable onPress={handleMicPress} style={[styles.micButton, isListening && styles.micButtonActive]}
          accessibilityLabel={isListening ? t('talkBack.stopListening') : t('talkBack.startListening')}
          accessibilityHint={t('talkBack.micHint')} accessibilityRole="button">
          <NativeIcon name={isListening ? 'micOff' : 'mic'} size="xl" color={Colors.white} />
        </Pressable>
      </View>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  overlay: { ...StyleSheet.absoluteFillObject, backgroundColor: Colors.Glass.bgStrong, zIndex: 200 },
  container: { flex: 1, padding: spacing.lg, justifyContent: 'space-between' },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  title: { fontSize: 22, fontWeight: '700', color: colors.text },
  closeButton: { width: 44, height: 44, borderRadius: borderRadius.full, justifyContent: 'center', alignItems: 'center' },
  characterSection: { marginVertical: spacing.md },
  waveformSection: { alignItems: 'center', flex: 1, justifyContent: 'center' },
  statusText: { fontSize: fontSize.sm, color: colors.textSecondary, marginTop: spacing.sm },
  micButton: { width: 72, height: 72, borderRadius: 36, backgroundColor: Colors.Primary.p700, justifyContent: 'center', alignItems: 'center', alignSelf: 'center', marginBottom: spacing.xl, borderWidth: 3, borderColor: Colors.Glass.border },
  micButtonActive: { backgroundColor: Colors.Error.default, borderColor: Colors.Error.e400 },
});
