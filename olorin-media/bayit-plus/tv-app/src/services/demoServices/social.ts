/**
 * DEMO-ONLY: Demo social services (watch parties, chat).
 * Not used in production.
 */

import { demoUser, demoWatchParties, demoSeries } from '../../demo';
import { delay } from './delay';

export const demoPartyService = {
  create: async (data: any) => {
    await delay();
    return {
      id: 'demo-party-' + Date.now(),
      room_code: 'DEMO' + Math.random().toString(36).substring(2, 6).toUpperCase(),
      ...data,
    };
  },
  getMyParties: async () => {
    await delay();
    return { parties: demoWatchParties };
  },
  joinByCode: async (roomCode: string) => {
    await delay();
    return { party_id: 'demo-party-1', ...demoWatchParties[0] };
  },
  getParty: async (partyId: string) => {
    await delay();
    return demoWatchParties[0];
  },
  joinParty: async (partyId: string) => {
    await delay();
    return { message: 'Joined party' };
  },
  leaveParty: async (partyId: string) => {
    await delay();
    return { message: 'Left party' };
  },
  endParty: async (partyId: string) => {
    await delay();
    return { message: 'Party ended' };
  },
  sendMessage: async (partyId: string, message: string, messageType: string = 'text') => {
    await delay();
    return {
      id: 'msg-' + Date.now(),
      user_name: demoUser.name,
      message,
      message_type: messageType,
      timestamp: new Date().toISOString(),
    };
  },
  getChatHistory: async (partyId: string, limit: number = 50, before?: string) => {
    await delay();
    return {
      messages: [
        { id: 'msg-1', user_name: 'דני', message: 'מה קורה?', timestamp: new Date().toISOString() },
        { id: 'msg-2', user_name: 'שרה', message: '!איזה פרק מדהים', timestamp: new Date().toISOString() },
      ],
    };
  },
  syncPlayback: async (partyId: string, position: number, isPlaying: boolean = true) => {
    await delay();
    return { message: 'Playback synced' };
  },
};

export const demoChatService = {
  sendMessage: async (message: string, conversationId?: string) => {
    await delay(500);
    return {
      message: `זו תשובה לדוגמה על "${message}". במצב דמו, הבינה המלאכותית לא פעילה.`,
      conversation_id: conversationId || 'demo-conv-1',
      recommendations: demoSeries.slice(0, 3),
    };
  },
  getConversation: async (conversationId: string) => {
    await delay();
    return {
      id: conversationId,
      messages: [
        { role: 'user', content: 'מה כדאי לראות?', timestamp: new Date().toISOString() },
        { role: 'assistant', content: 'אני ממליץ על פאודה - סדרת מתח מעולה!', timestamp: new Date().toISOString() },
      ],
    };
  },
  clearConversation: async (conversationId: string) => {
    await delay();
    return { message: 'Conversation cleared' };
  },
  transcribeAudio: async (audioBlob: Blob) => {
    await delay(1000);
    return { text: 'אני רוצה לראות סרט פעולה', language: 'he' };
  },
};
