/**
 * Social Services - Chat, Party, Recording, Downloads API endpoints
 */

import { api } from './client';
import type { ResolveContentResponse, Download } from './types';

// Chat Service (API)
export const apiChatService = {
  sendMessage: (message: string, conversationId?: string, context?: any, language?: string) =>
    api.post('/chat/message', { message, conversation_id: conversationId, context, language }),
  clearConversation: (conversationId: string) =>
    api.delete(`/chat/conversation/${conversationId}`),
  getConversation: (conversationId: string) =>
    api.get(`/chat/conversation/${conversationId}`),
  transcribeAudio: (audioBlob: Blob, language: string = 'he') => {
    const formData = new FormData();
    formData.append('audio', audioBlob);
    formData.append('language', language);
    return api.post('/chat/transcribe', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
  },
  resolveContent: (items: Array<{ name: string; type: string }>, language: string = 'he'): Promise<ResolveContentResponse> =>
    api.post('/chat/resolve-content', { items, language }),
  searchUsers: (name: string): Promise<{ users: Array<{ id: string; name: string; avatar?: string }> }> =>
    api.get('/users/search', { params: { name } }),
};

// Watch Party Service (API)
export const apiPartyService = {
  create: (data: {
    content_id: string;
    content_type: string;
    content_title?: string;
    is_private?: boolean;
    audio_enabled?: boolean;
    chat_enabled?: boolean;
    sync_playback?: boolean;
  }) => api.post('/party/create', data),
  getMyParties: () => api.get('/party/my-parties'),
  joinByCode: (roomCode: string) => api.get(`/party/join/${roomCode}`),
  getParty: (partyId: string) => api.get(`/party/${partyId}`),
  joinParty: (partyId: string) => api.post(`/party/${partyId}/join`),
  leaveParty: (partyId: string) => api.post(`/party/${partyId}/leave`),
  endParty: (partyId: string) => api.post(`/party/${partyId}/end`),
  sendMessage: (partyId: string, message: string, messageType: string = 'text') =>
    api.post(`/party/${partyId}/chat`, { message, message_type: messageType }),
  getChatHistory: (partyId: string, limit: number = 50, before?: string) =>
    api.get(`/party/${partyId}/chat`, { params: { limit, before } }),
  syncPlayback: (partyId: string, position: number, isPlaying: boolean = true) =>
    api.post(`/party/${partyId}/sync`, null, { params: { position, is_playing: isPlaying } }),
};

// Recording Service (API)
export const apiRecordingService = {
  getRecordings: () => api.get('/recordings'),
  getRecording: (recordingId: string) => api.get(`/recordings/${recordingId}`),
  deleteRecording: (recordingId: string) => api.delete(`/recordings/${recordingId}`),
  scheduleRecording: (data: {
    channel_id: string;
    start_time: string;
    end_time: string;
    title?: string;
  }) => api.post('/recordings/schedule', data),
  cancelScheduledRecording: (recordingId: string) =>
    api.delete(`/recordings/${recordingId}/schedule`),
};

// Downloads Service (API)
export const apiDownloadsService = {
  getDownloads: (): Promise<Download[]> => api.get('/downloads'),
  startDownload: (contentId: string, contentType: string, quality: string = 'hd') =>
    api.post('/downloads', { content_id: contentId, content_type: contentType, quality }),
  deleteDownload: (downloadId: string) => api.delete(`/downloads/${downloadId}`),
  checkDownload: (contentId: string): Promise<{ is_downloaded: boolean; download_id?: string }> =>
    api.get(`/downloads/check/${contentId}`),
};
