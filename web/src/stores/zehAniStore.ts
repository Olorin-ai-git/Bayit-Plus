import { create } from 'zustand';
import i18n from 'i18next';
import api from '@/services/api';
import logger from '@bayit/shared-utils/logger';
import type {
  HighlightReel,
  WhatsAppContact,
  FeedbackEntry,
  ZehAniStore,
} from './zehAniStore.types';

const zehAniLogger = logger.scope('ZehAniStore');

export const useZehAniStore = create<ZehAniStore>((set) => ({
  reels: [],
  contacts: [],
  feedback: [],
  loading: false,
  error: null,

  generateReel: async (profileId: string, avatarId: string) => {
    set({ loading: true, error: null });
    try {
      const reel = await api.post('/zeh-ani/highlights/generate', {
        profile_id: profileId,
        avatar_id: avatarId,
      }) as HighlightReel;
      set((state) => ({
        reels: [reel, ...state.reels],
        loading: false,
      }));
      zehAniLogger.info('Highlight reel generated', { reelId: reel.id, avatarId });
    } catch (error: any) {
      set({
        error: error?.detail || error?.message || i18n.t('zehAni.highlights.errors.generateFailed'),
        loading: false,
      });
      zehAniLogger.error('Failed to generate highlight reel', error);
    }
  },

  fetchReels: async (profileId: string) => {
    set({ loading: true, error: null });
    try {
      const data = await api.get('/zeh-ani/highlights', {
        params: { profile_id: profileId },
      }) as HighlightReel[];
      set({ reels: data || [], loading: false });
      zehAniLogger.info('Fetched highlight reels', { count: String(data?.length || 0) });
    } catch (error: any) {
      set({
        error: error?.detail || error?.message || i18n.t('zehAni.highlights.errors.fetchFailed'),
        loading: false,
      });
      zehAniLogger.error('Failed to fetch highlight reels', error);
    }
  },

  addContact: async (
    profileId: string,
    phoneNumber: string,
    displayName: string,
    relationship: string,
    language: string,
    pin: string,
  ) => {
    set({ loading: true, error: null });
    try {
      const contact = await api.post('/zeh-ani/contacts', {
        profile_id: profileId,
        phone_number: phoneNumber,
        display_name: displayName,
        relationship,
        language,
        pin,
      }) as WhatsAppContact;
      set((state) => ({
        contacts: [...state.contacts, contact],
        loading: false,
      }));
      zehAniLogger.info('Contact added', { contactId: contact.id });
      return true;
    } catch (error: any) {
      set({
        error: error?.detail || error?.message || i18n.t('zehAni.contacts.errors.addFailed'),
        loading: false,
      });
      zehAniLogger.error('Failed to add contact', error);
      return false;
    }
  },

  fetchContacts: async (profileId: string) => {
    set({ loading: true, error: null });
    try {
      const data = await api.get('/zeh-ani/contacts', {
        params: { profile_id: profileId },
      }) as WhatsAppContact[];
      set({ contacts: data || [], loading: false });
      zehAniLogger.info('Fetched contacts', { count: String(data?.length || 0) });
    } catch (error: any) {
      set({
        error: error?.detail || error?.message || i18n.t('zehAni.contacts.errors.fetchFailed'),
        loading: false,
      });
      zehAniLogger.error('Failed to fetch contacts', error);
    }
  },

  removeContact: async (contactId: string) => {
    set({ error: null });
    try {
      await api.delete(`/zeh-ani/contacts/${contactId}`);
      set((state) => ({
        contacts: state.contacts.filter((c) => c.id !== contactId),
      }));
      zehAniLogger.info('Contact removed', { contactId });
      return true;
    } catch (error: any) {
      set({
        error: error?.detail || error?.message || i18n.t('zehAni.contacts.errors.removeFailed'),
      });
      zehAniLogger.error('Failed to remove contact', error);
      return false;
    }
  },

  fetchFeedback: async (profileId: string) => {
    set({ loading: true, error: null });
    try {
      const data = await api.get('/zeh-ani/feedback', {
        params: { profile_id: profileId },
      }) as FeedbackEntry[];
      set({ feedback: data || [], loading: false });
      zehAniLogger.info('Fetched feedback', { count: String(data?.length || 0) });
    } catch (error: any) {
      set({
        error: error?.detail || error?.message || i18n.t('zehAni.feedback.errors.fetchFailed'),
        loading: false,
      });
      zehAniLogger.error('Failed to fetch feedback', error);
    }
  },

  clearError: () => set({ error: null }),
}));
