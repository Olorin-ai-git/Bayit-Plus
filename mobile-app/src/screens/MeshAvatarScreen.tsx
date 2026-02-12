/**
 * MeshAvatarScreen - Zeh Ani mesh generation and 3D avatar preview
 *
 * Biometric consent management, mesh generation with progress polling,
 * and thumbnail preview when mesh is ready.
 */
import React, { useEffect, useState, useCallback, useRef } from 'react';
import {
  View, Text, TextInput, Image, SafeAreaView,
  ScrollView, ActivityIndicator, Switch,
} from 'react-native';
import { useRoute } from '@react-navigation/native';
import { useTranslation } from 'react-i18next';
import { GlassButton, GlassLoadingSpinner } from '@bayit/shared/ui';
import { useDirection } from '@bayit/shared-hooks';
import api from '@bayit/shared-services/api';
import logger from '@/utils/logger';
import { Colors } from '../theme/colors';
import { styles } from './MeshAvatarScreen.styles';

const meshLogger = logger.scope('MeshAvatarScreen');

interface ConsentEntry { consent_type: string; active: boolean; }
interface ConsentStatus { profile_id: string; consents: ConsentEntry[]; }
interface MeshStatus {
  id: string; avatar_id: string; status: string;
  thumbnail_gcs_path: string | null; error_message: string | null;
}

type Phase = 'loading' | 'consent' | 'generating' | 'ready' | 'error';
const CONSENT_TYPES = ['face_scan', 'voice_print'] as const;
const POLL_INTERVAL_MS = 3000;
const TERMINAL_STATUSES = ['completed', 'failed'];

const allConsentsGranted = (entries: ConsentEntry[]) =>
  CONSENT_TYPES.every((ct) => entries.some((c) => c.consent_type === ct && c.active));

export const MeshAvatarScreen: React.FC = () => {
  const route = useRoute<any>();
  const { avatarId, profileId } = route.params;
  const { t } = useTranslation();
  const { textAlign } = useDirection();
  const [phase, setPhase] = useState<Phase>('loading');
  const [consents, setConsents] = useState<ConsentEntry[]>([]);
  const [pin, setPin] = useState('');
  const [meshStatus, setMeshStatus] = useState<MeshStatus | null>(null);
  const [thumbnailUrl, setThumbnailUrl] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    loadInitialState();
    return () => { if (pollRef.current) clearInterval(pollRef.current); };
  }, [avatarId, profileId]);

  const loadThumbnail = useCallback(async () => {
    try {
      const glb = await api.get(`/zeh-ani/mesh/${avatarId}/glb`) as { signed_url: string };
      setThumbnailUrl(glb.signed_url);
    } catch (err: any) {
      meshLogger.warn('Thumbnail load failed', { avatarId, error: err });
    }
  }, [avatarId]);

  const startPolling = useCallback(() => {
    if (pollRef.current) clearInterval(pollRef.current);
    pollRef.current = setInterval(async () => {
      try {
        const status = await api.get(`/zeh-ani/mesh/${avatarId}`) as MeshStatus;
        setMeshStatus(status);
        if (!TERMINAL_STATUSES.includes(status.status)) return;
        if (pollRef.current) clearInterval(pollRef.current);
        if (status.status === 'completed') { await loadThumbnail(); setPhase('ready'); }
        else { setError(status.error_message || t('zehAni.mesh.errors.generationFailed')); setPhase('error'); }
      } catch (err: any) { meshLogger.warn('Poll failed', { avatarId, error: err }); }
    }, POLL_INTERVAL_MS);
  }, [avatarId, t, loadThumbnail]);

  const checkMeshStatus = useCallback(async () => {
    try {
      const status = await api.get(`/zeh-ani/mesh/${avatarId}`) as MeshStatus;
      setMeshStatus(status);
      if (status.status === 'completed') { await loadThumbnail(); setPhase('ready'); }
      else if (status.status === 'failed') { setError(status.error_message || t('zehAni.mesh.errors.generationFailed')); setPhase('error'); }
      else { setPhase('generating'); startPolling(); }
    } catch { setPhase('consent'); }
  }, [avatarId, t, loadThumbnail, startPolling]);

  const loadInitialState = useCallback(async () => {
    setPhase('loading');
    try {
      const data = await api.get(`/zeh-ani/consent/biometric/${profileId}`) as ConsentStatus;
      setConsents(data.consents || []);
      if (!allConsentsGranted(data.consents || [])) { setPhase('consent'); return; }
      await checkMeshStatus();
    } catch (err: any) {
      meshLogger.error('Failed to load initial state', { avatarId, error: err });
      setError(err?.message || t('zehAni.mesh.errors.loadFailed'));
      setPhase('error');
    }
  }, [avatarId, profileId, t, checkMeshStatus]);

  const handleGrantConsent = useCallback(async (consentType: string) => {
    if (pin.length < 4) { setError(t('zehAni.mesh.errors.pinRequired')); return; }
    try {
      await api.post('/zeh-ani/consent/biometric', { profile_id: profileId, consent_type: consentType, pin });
      const updated = consents.map((c) => c.consent_type === consentType ? { ...c, active: true } : c);
      const filled = CONSENT_TYPES.map((ct) => updated.find((c) => c.consent_type === ct) || { consent_type: ct, active: false });
      setConsents(filled);
      setError(null);
      meshLogger.info('Consent granted', { consentType, profileId });
      if (allConsentsGranted(filled)) await checkMeshStatus();
    } catch (err: any) {
      setError(err?.message || t('zehAni.mesh.errors.consentFailed'));
      meshLogger.error('Consent grant failed', { consentType, error: err });
    }
  }, [pin, profileId, consents, t, checkMeshStatus]);

  const handleGenerateMesh = useCallback(async () => {
    if (pin.length < 4) { setError(t('zehAni.mesh.errors.pinRequired')); return; }
    setPhase('generating');
    setError(null);
    try {
      const status = await api.post('/zeh-ani/mesh/generate', { avatar_id: avatarId, profile_id: profileId, pin }) as MeshStatus;
      setMeshStatus(status);
      if (status.status === 'completed') { await loadThumbnail(); setPhase('ready'); }
      else { startPolling(); }
      meshLogger.info('Mesh generation started', { avatarId });
    } catch (err: any) {
      setError(err?.message || t('zehAni.mesh.errors.generationFailed'));
      setPhase('error');
      meshLogger.error('Mesh generation failed', { avatarId, error: err });
    }
  }, [avatarId, profileId, pin, t, loadThumbnail, startPolling]);

  if (phase === 'loading') {
    return (<SafeAreaView style={styles.container}><GlassLoadingSpinner size="large" /></SafeAreaView>);
  }

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={styles.scrollContent}>
        <Text style={[styles.heading, { textAlign }]}>{t('zehAni.mesh.title')}</Text>
        {phase === 'consent' && (
          <View style={styles.section}>
            <Text style={[styles.sectionTitle, { textAlign }]}>{t('zehAni.mesh.consentTitle')}</Text>
            {CONSENT_TYPES.map((ct) => {
              const entry = consents.find((c) => c.consent_type === ct);
              return (
                <View key={ct} style={styles.consentRow}>
                  <Text style={[styles.consentLabel, { textAlign }]}>{t(`zehAni.mesh.consent.${ct}`)}</Text>
                  <Switch value={entry?.active || false} onValueChange={() => handleGrantConsent(ct)} />
                </View>
              );
            })}
            <TextInput
              style={styles.pinInput} value={pin} onChangeText={setPin}
              secureTextEntry keyboardType="number-pad" maxLength={6}
              placeholder={t('zehAni.mesh.pinPlaceholder')} placeholderTextColor="rgba(255,255,255,0.3)"
            />
            {error && <Text style={styles.errorText}>{error}</Text>}
            <GlassButton title={t('zehAni.mesh.generateButton')} onPress={handleGenerateMesh} variant="primary" />
          </View>
        )}
        {phase === 'generating' && (
          <View style={styles.section}>
            <ActivityIndicator size="large" color={Colors.accent} />
            <Text style={styles.progressText}>{t('zehAni.mesh.generating')}</Text>
            {meshStatus && <Text style={styles.statusText}>{t('zehAni.mesh.status', { status: meshStatus.status })}</Text>}
          </View>
        )}
        {phase === 'ready' && (
          <View style={styles.section}>
            <Text style={[styles.readyText, { textAlign }]}>{t('zehAni.mesh.ready')}</Text>
            {thumbnailUrl && <Image source={{ uri: thumbnailUrl }} style={styles.thumbnail} resizeMode="contain" />}
            <GlassButton title={t('zehAni.mesh.regenerate')} onPress={handleGenerateMesh} variant="secondary" />
          </View>
        )}
        {phase === 'error' && (
          <View style={styles.section}>
            <Text style={styles.errorText}>{error}</Text>
            <GlassButton title={t('common.retry')} onPress={loadInitialState} variant="primary" />
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
};

export default MeshAvatarScreen;
