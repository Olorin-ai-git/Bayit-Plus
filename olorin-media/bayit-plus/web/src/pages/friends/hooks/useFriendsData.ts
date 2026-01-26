import { useState, useEffect } from 'react';
import { useFriendsStore } from '../../../stores/friendsStore';
import type { SearchResult, ModalType } from '../types';

export function useFriendsData(authReady: boolean = false) {
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<SearchResult[]>([]);
  const [searchLoading, setSearchLoading] = useState(false);
  const [friendMessage, setFriendMessage] = useState('');
  const [selectedUser, setSelectedUser] = useState<SearchResult | null>(null);

  const [modalVisible, setModalVisible] = useState(false);
  const [modalMessage, setModalMessage] = useState('');
  const [modalType, setModalType] = useState<ModalType>('info');

  const {
    friends,
    incomingRequests,
    outgoingRequests,
    loading,
    error,
    fetchFriends,
    fetchRequests,
    sendFriendRequest,
    acceptRequest,
    rejectRequest,
    cancelRequest,
    removeFriend,
    searchUsers,
  } = useFriendsStore();

  // Only fetch data when auth is ready
  useEffect(() => {
    if (authReady) {
      fetchFriends();
      fetchRequests();
    }
  }, [authReady, fetchFriends, fetchRequests]);

  const showModal = (message: string, type: ModalType = 'info') => {
    setModalMessage(message);
    setModalType(type);
    setModalVisible(true);
  };

  const handleSearch = async (t: any) => {
    if (!searchQuery.trim()) {
      setSearchResults([]);
      return;
    }

    setSearchLoading(true);
    try {
      const results = await searchUsers(searchQuery);
      setSearchResults(results);
    } catch (err: any) {
      showModal(err.message || t('friends.searchFailed', 'Failed to search users'), 'error');
    } finally {
      setSearchLoading(false);
    }
  };

  const handleSendRequest = async (receiverId: string, t: any) => {
    try {
      await sendFriendRequest(receiverId, friendMessage || undefined);
      setFriendMessage('');
      setSelectedUser(null);
      showModal(t('friends.requestSent', 'Friend request sent!'), 'success');
      handleSearch(t);
    } catch (err: any) {
      showModal(err.response?.data?.detail || t('friends.requestFailed', 'Failed to send request'), 'error');
    }
  };

  const handleAcceptRequest = async (requestId: string, t: any) => {
    try {
      await acceptRequest(requestId);
      showModal(t('friends.requestAccepted', 'Friend request accepted!'), 'success');
    } catch (err: any) {
      showModal(err.response?.data?.detail || t('friends.acceptFailed', 'Failed to accept request'), 'error');
    }
  };

  const handleRejectRequest = async (requestId: string, t: any) => {
    try {
      await rejectRequest(requestId);
      showModal(t('friends.requestRejected', 'Friend request rejected'), 'info');
    } catch (err: any) {
      showModal(err.response?.data?.detail || t('friends.rejectFailed', 'Failed to reject request'), 'error');
    }
  };

  const handleCancelRequest = async (requestId: string, t: any) => {
    try {
      await cancelRequest(requestId);
      showModal(t('friends.requestCancelled', 'Friend request cancelled'), 'info');
    } catch (err: any) {
      showModal(err.response?.data?.detail || t('friends.cancelFailed', 'Failed to cancel request'), 'error');
    }
  };

  const handleRemoveFriend = async (friendId: string, t: any) => {
    try {
      await removeFriend(friendId);
      showModal(t('friends.friendRemoved', 'Friend removed'), 'info');
    } catch (err: any) {
      showModal(err.response?.data?.detail || t('friends.removeFailed', 'Failed to remove friend'), 'error');
    }
  };

  return {
    friends,
    incomingRequests,
    outgoingRequests,
    loading,
    error,
    searchQuery,
    setSearchQuery,
    searchResults,
    searchLoading,
    friendMessage,
    setFriendMessage,
    selectedUser,
    setSelectedUser,
    modalVisible,
    setModalVisible,
    modalMessage,
    modalType,
    showModal,
    handleSearch,
    handleSendRequest,
    handleAcceptRequest,
    handleRejectRequest,
    handleCancelRequest,
    handleRemoveFriend,
  };
}
