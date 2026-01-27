import { create } from 'zustand';
import api from '@/services/api';


interface Friend {
  user_id: string;
  name: string;
  avatar: string | null;
  friendship_id: string;
  friends_since: string;
  last_game_at: string | null;
}


interface FriendRequest {
  id: string;
  sender_id: string;
  sender_name: string;
  sender_avatar: string | null;
  receiver_id: string;
  receiver_name: string;
  message: string | null;
  sent_at: string;
}

interface FriendsStore {
  friends: Friend[];
  incomingRequests: FriendRequest[];
  outgoingRequests: FriendRequest[];
  loading: boolean;
  error: string | null;

  fetchFriends: () => Promise<void>;
  fetchRequests: () => Promise<void>;
  sendFriendRequest: (receiverId: string, message?: string) => Promise<void>;
  acceptRequest: (requestId: string) => Promise<void>;
  rejectRequest: (requestId: string) => Promise<void>;
  cancelRequest: (requestId: string) => Promise<void>;
  removeFriend: (friendId: string) => Promise<void>;
  searchUsers: (query: string) => Promise<any[]>;
}


export const useFriendsStore = create<FriendsStore>((set, get) => ({
  friends: [],
  incomingRequests: [],
  outgoingRequests: [],
  loading: false,
  error: null,

  fetchFriends: async () => {
    set({ loading: true, error: null });
    try {
      const data = await api.get('/friends/list') as { friends: Friend[] };
      set({ friends: data.friends || [], loading: false });
    } catch (error: any) {
      const errorMessage = error?.detail || error?.message || 'Failed to fetch friends';
      set({ error: errorMessage, loading: false, friends: [] });
    }
  },

  fetchRequests: async () => {
    set({ loading: true, error: null });
    try {
      const data = await api.get('/friends/requests') as { incoming: FriendRequest[]; outgoing: FriendRequest[] };
      set({
        incomingRequests: data.incoming || [],
        outgoingRequests: data.outgoing || [],
        loading: false
      });
    } catch (error: any) {
      const errorMessage = error?.detail || error?.message || 'Failed to fetch requests';
      set({ error: errorMessage, loading: false, incomingRequests: [], outgoingRequests: [] });
    }
  },

  sendFriendRequest: async (receiverId: string, message?: string) => {
    set({ loading: true, error: null });
    try {
      await api.post('/friends/request', { receiver_id: receiverId, message });
      await get().fetchRequests();
      set({ loading: false });
    } catch (error: any) {
      set({ error: error?.detail || 'Failed to send request', loading: false });
      throw error;
    }
  },

  acceptRequest: async (requestId: string) => {
    set({ loading: true, error: null });
    try {
      await api.post('/friends/request/accept', { request_id: requestId });
      await get().fetchFriends();
      await get().fetchRequests();
      set({ loading: false });
    } catch (error: any) {
      set({ error: error?.detail || 'Failed to accept request', loading: false });
    }
  },

  rejectRequest: async (requestId: string) => {
    set({ loading: true, error: null });
    try {
      await api.post('/friends/request/reject', { request_id: requestId });
      await get().fetchRequests();
      set({ loading: false });
    } catch (error: any) {
      set({ error: error?.detail || 'Failed to reject request', loading: false });
    }
  },

  cancelRequest: async (requestId: string) => {
    set({ loading: true, error: null });
    try {
      await api.post('/friends/request/cancel', { request_id: requestId });
      await get().fetchRequests();
      set({ loading: false });
    } catch (error: any) {
      set({ error: error?.detail || 'Failed to cancel request', loading: false });
    }
  },

  removeFriend: async (friendId: string) => {
    set({ loading: true, error: null });
    try {
      await api.delete(`/friends/${friendId}`);
      await get().fetchFriends();
      set({ loading: false });
    } catch (error: any) {
      set({ error: error?.detail || 'Failed to remove friend', loading: false });
    }
  },

  searchUsers: async (query: string) => {
    const data = await api.post('/friends/search', { query }) as { users: any[] };
    return data.users;
  },
}));
