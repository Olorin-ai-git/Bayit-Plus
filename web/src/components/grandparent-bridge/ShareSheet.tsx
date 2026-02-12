/**
 * ShareSheet Component
 * Family sharing modal for grandparent bridge news clips.
 * WhatsApp share, email share, copy link, with PIN verification.
 */

import React, { useState, useCallback } from 'react';
import { View, Text } from 'react-native';
import { StyleSheet } from 'react-native';
import { useTranslation } from 'react-i18next';
import { Share2, Mail, Copy, Check } from 'lucide-react-native';
import { GlassModal, GlassButton, GlassInput } from '@bayit/shared/ui';
import { useGrandparentBridgeStore } from '@/stores/grandparentBridgeStore';
import api from '@/services/api';
import logger from '@bayit/shared-utils/logger';
import type { NewsClip } from '@/stores/grandparentBridgeStore.types';

const shareLogger = logger.scope('ShareSheet');

interface ShareSheetProps {
  clip: NewsClip;
  visible: boolean;
  onClose: () => void;
}

export function ShareSheet({ clip, visible, onClose }: ShareSheetProps) {
  const { t } = useTranslation();
  const { shareClip, error } = useGrandparentBridgeStore();

  const [pin, setPin] = useState('');
  const [pinVerified, setPinVerified] = useState(false);
  const [recipientName, setRecipientName] = useState('');
  const [linkCopied, setLinkCopied] = useState(false);
  const [verifying, setVerifying] = useState(false);

  const handleVerifyPin = useCallback(async () => {
    if (!clip.share_url || !pin) return;
    setVerifying(true);
    try {
      const shareToken = clip.share_url.split('/share/').pop() || '';
      const result = await api.post(`/grandparent-bridge/share/${shareToken}/verify-pin`, {
        pin,
      }) as { verified: boolean };
      setPinVerified(result.verified);
      shareLogger.info('PIN verification attempted', { verified: String(result.verified) });
    } catch (err: any) {
      shareLogger.error('PIN verification failed', err);
    } finally {
      setVerifying(false);
    }
  }, [clip.share_url, pin]);

  const handleWhatsAppShare = useCallback(async () => {
    const result = await shareClip(clip.id, recipientName);
    if (result?.whatsapp_link) {
      window.open(result.whatsapp_link, '_blank', 'noopener,noreferrer');
    }
  }, [clip.id, recipientName, shareClip]);

  const handleEmailShare = useCallback(() => {
    if (!clip.share_url) return;
    const subject = encodeURIComponent(t('grandparentBridge.share.shareMessage', { name: recipientName }));
    const body = encodeURIComponent(clip.share_url);
    window.open(`mailto:?subject=${subject}&body=${body}`, '_self');
    shareLogger.info('Email share initiated', { clipId: clip.id });
  }, [clip.share_url, clip.id, recipientName, t]);

  const handleCopyLink = useCallback(async () => {
    if (!clip.share_url) return;
    try {
      await navigator.clipboard.writeText(clip.share_url);
      setLinkCopied(true);
      shareLogger.info('Share link copied', { clipId: clip.id });
      setTimeout(() => setLinkCopied(false), 2000);
    } catch (err: any) {
      shareLogger.error('Failed to copy link', err);
    }
  }, [clip.share_url, clip.id]);

  return (
    <GlassModal visible={visible} onClose={onClose} title={t('grandparentBridge.share.title')}>
      <View style={shareStyles.content}>
        {!pinVerified ? (
          <View style={shareStyles.pinSection}>
            <Text style={shareStyles.pinLabel}>{t('grandparentBridge.share.enterPin')}</Text>
            <GlassInput
              value={pin}
              onChangeText={setPin}
              secureTextEntry
              maxLength={6}
              keyboardType="numeric"
            />
            <GlassButton
              label={verifying ? '...' : t('grandparentBridge.share.pinVerified')}
              onPress={handleVerifyPin}
              variant="primary"
              disabled={verifying || pin.length < 4}
            />
          </View>
        ) : (
          <View style={shareStyles.shareActions}>
            <GlassInput
              value={recipientName}
              onChangeText={setRecipientName}
              placeholder={t('grandparentBridge.share.title')}
            />
            <GlassButton
              label={t('grandparentBridge.share.whatsApp')}
              onPress={handleWhatsAppShare}
              variant="primary"
              icon={<Share2 size={16} color="#FFFFFF" />}
            />
            <GlassButton
              label={t('grandparentBridge.share.email')}
              onPress={handleEmailShare}
              variant="secondary"
              icon={<Mail size={16} color="#FFFFFF" />}
            />
            <GlassButton
              label={linkCopied ? t('grandparentBridge.share.linkCopied') : t('grandparentBridge.share.copyLink')}
              onPress={handleCopyLink}
              variant="secondary"
              icon={linkCopied ? <Check size={16} color="#34C759" /> : <Copy size={16} color="#FFFFFF" />}
            />
          </View>
        )}
        {error && <Text style={shareStyles.errorText}>{error}</Text>}
      </View>
    </GlassModal>
  );
}

const shareStyles = StyleSheet.create({
  content: { padding: 16, gap: 16 },
  pinSection: { gap: 12, alignItems: 'center' },
  pinLabel: { fontSize: 15, color: 'rgba(255,255,255,0.7)', textAlign: 'center' },
  shareActions: { gap: 12 },
  errorText: { color: '#FF3B30', fontSize: 13, textAlign: 'center', marginTop: 8 },
});
