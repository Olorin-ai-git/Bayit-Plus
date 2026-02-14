/**
 * LiveDubbingControlsMobile - Controls for live dubbing
 *
 * Provides language switching and volume controls
 * for live dubbed content on mobile.
 */

import React, { useCallback } from 'react';
import { View, Text, Pressable, StyleSheet } from 'react-native';
import { useTranslation } from 'react-i18next';
import { GlassButton, spacing, borderRadius } from '@olorin/glass-ui/native';
import { NativeIcon } from '@olorin/shared-icons/native';
import { LanguageRatio } from './LanguageRatio';
import { logger } from '../../../utils/logger';
import Colors from '../../../theme/colors';

const log = logger.scope('LiveDubbingControlsMobile');

interface LiveDubbingControlsMobileProps {
  channelId: string;
  isConnected: boolean;
  isConnecting: boolean;
  targetLanguage: string;
  availableLanguages: string[];
  dubbedVolume: number;
  originalVolume: number;
  onConnect: (lang?: string) => void;
  onDisconnect: () => void;
  onLanguageChange: (lang: string) => void;
  onDubbedVolumeChange: (volume: number) => void;
  onOriginalVolumeChange: (volume: number) => void;
}

export const LiveDubbingControlsMobile: React.FC<LiveDubbingControlsMobileProps> = ({
  channelId, isConnected, isConnecting, targetLanguage, availableLanguages,
  dubbedVolume, onConnect, onDisconnect, onLanguageChange, onDubbedVolumeChange, onOriginalVolumeChange,
}) => {
  const { t } = useTranslation();

  const handleRatio = useCallback((r: number) => {
    onDubbedVolumeChange(r);
    onOriginalVolumeChange(1 - r);
  }, [onDubbedVolumeChange, onOriginalVolumeChange]);

  const handleLang = useCallback((lang: string) => {
    onLanguageChange(lang);
    log.info('Live dubbing language changed', { channelId, lang });
  }, [channelId, onLanguageChange]);

  if (!isConnected) {
    return (
      <View style={styles.disconnected}>
        <GlassButton variant="primary" onPress={() => onConnect()} disabled={isConnecting}
          accessibilityLabel={t('dubbing.controls.start')} accessibilityHint={t('dubbing.controls.startHint')}
          accessibilityRole="button">
          {isConnecting ? t('dubbing.controls.connecting') : t('dubbing.controls.startDubbing')}
        </GlassButton>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.langSection}>
        <Text style={styles.label}>{t('dubbing.controls.language')}</Text>
        <View style={styles.pills}>
          {availableLanguages.map((lang) => (
            <Pressable key={lang} style={[styles.pill, targetLanguage === lang && styles.pillActive]}
              onPress={() => handleLang(lang)}
              accessibilityLabel={t('dubbing.controls.selectLanguage', { language: lang.toUpperCase() })}
              accessibilityRole="radio" accessibilityState={{ selected: targetLanguage === lang }}>
              <Text style={[styles.pillText, targetLanguage === lang && styles.pillTextActive]}>
                {lang.toUpperCase()}
              </Text>
            </Pressable>
          ))}
        </View>
      </View>
      <LanguageRatio ratio={dubbedVolume} onChange={handleRatio} originalLang="he" targetLang={targetLanguage} />
      <View style={styles.actionRow}>
        <GlassButton variant="ghost" size="small" onPress={onDisconnect}
          accessibilityLabel={t('dubbing.controls.stop')} accessibilityHint={t('dubbing.controls.stopHint')}
          accessibilityRole="button">
          <View style={styles.stopRow}>
            <NativeIcon name="square" size="xs" color={Colors.Error.default} />
            <Text style={styles.stopText}>{t('dubbing.controls.stopDubbing')}</Text>
          </View>
        </GlassButton>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: { gap: spacing.sm },
  disconnected: { alignItems: 'center', paddingVertical: spacing.sm },
  langSection: { gap: spacing.xs },
  label: { fontSize: 12, fontWeight: '600', color: Colors.Text.muted, textTransform: 'uppercase' },
  pills: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.xs },
  pill: {
    paddingHorizontal: spacing.md, paddingVertical: spacing.xs,
    borderRadius: borderRadius.full, borderWidth: 1, borderColor: Colors.Glass.border, backgroundColor: Colors.Glass.whiteSubtle,
  },
  pillActive: { borderColor: Colors.Primary.p500, backgroundColor: Colors.Glass.purpleLight },
  pillText: { fontSize: 13, fontWeight: '600', color: Colors.Text.muted },
  pillTextActive: { color: Colors.Primary.p400 },
  actionRow: { flexDirection: 'row', justifyContent: 'center' },
  stopRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.xs },
  stopText: { fontSize: 13, color: Colors.Error.default, fontWeight: '500' },
});
