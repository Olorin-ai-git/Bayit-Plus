import { create } from 'zustand';
import axios from 'axios';
import { useAuthStore } from './authStore';


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


// Helper function to get authorization headers
const getAuthHeaders = () => {
  const token = useAuthStore.getState().token;
  if (!token) {
    return {};
  }
  return {
    'Authorization': `Bearer ${token}`
  };
};

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
      const response = await axios.get('/api/v1/friends/list', { headers: getAuthHeaders() });
      set({ friends: response.data.friends || [], loading: false });
    } catch (error: any) {
      const errorMessage = error.response?.data?.detail || error.message || 'Failed to fetch friends';
      set({ error: errorMessage, loading: false, friends: [] });
    }
  },

  fetchRequests: async () => {
    set({ loading: true, error: null });
    try {
      const response = await axios.get('/api/v1/friends/requests', { headers: getAuthHeaders() });
      set({
        incomingRequests: response.data.incoming || [],
        outgoingRequests: response.data.outgoing || [],
        loading: false
      });
    } catch (error: any) {
      const errorMessage = error.response?.data?.detail || error.message || 'Failed to fetch requests';
      set({ error: errorMessage, loading: false, incomingRequests: [], outgoingRequests: [] });
    }
  },

  sendFriendRequest: async (receiverId: string, message?: string) => {
    set({ loading: true, error: null });
    try {
      await axios.post('/api/v1/friends/request', { receiver_id: receiverId, message }, { headers: getAuthHeaders() });
      await get().fetchRequests();
      set({ loading: false });
    } catch (error: any) {
      set({ error: error.response?.data?.detail || 'Failed to send request', loading: false });
      throw error;
    }
  },

  acceptRequest: async (requestId: string) => {
    set({ loading: true, error: null });
    try {
      await axios.post('/api/v1/friends/request/accept', { request_id: requestId }, { headers: getAuthHeaders() });
      await get().fetchFriends();
      await get().fetchRequests();
      set({ loading: false });
    } catch (error: any) {
      set({ error: error.response?.data?.detail || 'Failed to accept request', loading: false });
    }
  },

  rejectRequest: async (requestId: string) => {
    set({ loading: true, error: null });
    try {
      await axios.post('/api/v1/friends/request/reject', { request_id: requestId }, { headers: getAuthHeaders() });
      await get().fetchRequests();
      set({ loading: false });
    } catch (error: any) {
      set({ error: error.response?.data?.detail || 'Failed to reject request', loading: false });
    }
  },

  cancelRequest: async (requestId: string) => {
    set({ loading: true, error: null });
    try {
      await axios.post('/api/v1/friends/request/cancel', { request_id: requestId }, { headers: getAuthHeaders() });
      await get().fetchRequests();
      set({ loading: false });
    } catch (error: any) {
      set({ error: error.response?.data?.detail || 'Failed to cancel request', loading: false });
    }
  },

  removeFriend: async (friendId: string) => {
    set({ loading: true, error: null });
    try {
      await axios.delete(`/api/v1/friends/${friendId}`, { headers: getAuthHeaders() });
      await get().fetchFriends();
      set({ loading: false });
    } catch (error: any) {
      set({ error: error.response?.data?.detail || 'Failed to remove friend', loading: false });
    }
  },

  searchUsers: async (query: string) => {
    const response = await axios.post('/api/v1/friends/search', { query }, { headers: getAuthHeaders() });
    return response.data.users;
  },
}));
