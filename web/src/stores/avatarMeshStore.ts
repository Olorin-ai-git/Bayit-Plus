import { create } from 'zustand';
import i18n from 'i18next';
import api from '@/services/api';
import logger from '@bayit/shared-utils/logger';
import type {
  AvatarMeshStatus,
  MeshGlbUrl,
  BiometricConsentStatus,
  AvatarMeshStore,
} from './avatarMeshStore.types';

const meshLogger = logger.scope('AvatarMeshStore');

export const useAvatarMeshStore = create<AvatarMeshStore>((set) => ({
  mesh: null,
  glbUrl: null,
  consentStatus: null,
  loading: false,
  error: null,

  generateMesh: async (avatarId: string, profileId: string, pin: string) => {
    set({ loading: true, error: null });
    try {
      const data = await api.post('/zeh-ani/mesh/generate', {
        avatar_id: avatarId,
        profile_id: profileId,
        pin,
      }) as AvatarMeshStatus;
      set({ mesh: data, loading: false });
      meshLogger.info('Mesh generation initiated', { avatarId, status: data.status });
    } catch (error: any) {
      set({
        error: error?.detail || error?.message || i18n.t('zehAni.mesh.errors.generateFailed'),
        loading: false,
      });
      meshLogger.error('Failed to generate mesh', error);
    }
  },

  fetchMeshStatus: async (avatarId: string) => {
    set({ loading: true, error: null });
    try {
      const data = await api.get(`/zeh-ani/mesh/${avatarId}`) as AvatarMeshStatus;
      set({ mesh: data, loading: false });
      meshLogger.info('Fetched mesh status', { avatarId, status: data.status });
    } catch (error: any) {
      set({
        error: error?.detail || error?.message || i18n.t('zehAni.mesh.errors.fetchStatusFailed'),
        loading: false,
      });
      meshLogger.error('Failed to fetch mesh status', error);
    }
  },

  fetchGlbUrl: async (avatarId: string) => {
    set({ loading: true, error: null });
    try {
      const data = await api.get(`/zeh-ani/mesh/${avatarId}/glb`) as MeshGlbUrl;
      set({ glbUrl: data, loading: false });
      meshLogger.info('Fetched GLB URL', { avatarId, expiresIn: String(data.expires_in_seconds) });
    } catch (error: any) {
      set({
        error: error?.detail || error?.message || i18n.t('zehAni.mesh.errors.fetchGlbFailed'),
        loading: false,
      });
      meshLogger.error('Failed to fetch GLB URL', error);
    }
  },

  grantConsent: async (profileId: string, consentType: string, pin: string) => {
    set({ loading: true, error: null });
    try {
      const data = await api.post('/zeh-ani/consent/biometric', {
        profile_id: profileId,
        consent_type: consentType,
        pin,
      }) as BiometricConsentStatus;
      set({ consentStatus: data, loading: false });
      meshLogger.info('Biometric consent granted', { profileId, consentType });
      return true;
    } catch (error: any) {
      set({
        error: error?.detail || error?.message || i18n.t('zehAni.consent.biometric.errors.grantFailed'),
        loading: false,
      });
      meshLogger.error('Failed to grant biometric consent', error);
      return false;
    }
  },

  checkConsent: async (profileId: string) => {
    set({ loading: true, error: null });
    try {
      const data = await api.get(
        `/zeh-ani/consent/biometric/${profileId}`,
      ) as BiometricConsentStatus;
      set({ consentStatus: data, loading: false });
      meshLogger.info('Checked biometric consent', {
        profileId,
        count: String(data.consents.length),
      });
    } catch (error: any) {
      set({
        error: error?.detail || error?.message || i18n.t('zehAni.consent.biometric.errors.checkFailed'),
        loading: false,
      });
      meshLogger.error('Failed to check biometric consent', error);
    }
  },

  revokeConsent: async (profileId: string, consentType: string) => {
    set({ loading: true, error: null });
    try {
      await api.delete(`/zeh-ani/consent/biometric/${profileId}`, {
        params: { consent_type: consentType },
      });
      set({ loading: false });
      meshLogger.info('Biometric consent revoked', { profileId, consentType });
      return true;
    } catch (error: any) {
      set({
        error: error?.detail || error?.message || i18n.t('zehAni.consent.biometric.errors.revokeFailed'),
        loading: false,
      });
      meshLogger.error('Failed to revoke biometric consent', error);
      return false;
    }
  },

  clearError: () => set({ error: null }),
}));
