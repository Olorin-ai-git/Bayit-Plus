import { useState, useEffect, useCallback, useRef } from 'react';
import {
  Comment,
  Collaborator,
  NotificationSettings
} from '../types/manualInvestigation';
import {
  collaborationService,
  CollaborationEvent,
  UserPresence,
  TypingIndicator
} from '../services/collaborationService';
import { manualInvestigationService } from '../services/manualInvestigationService';
import { notificationService } from '../services/notificationService';

interface UseCollaborationState {
  // Comments
  comments: Comment[];
  isLoadingComments: boolean;
  isAddingComment: boolean;

  // Team members
  collaborators: Collaborator[];
  availableUsers: Omit<Collaborator, 'addedAt' | 'addedBy' | 'permissions'>[];
  isLoadingCollaborators: boolean;
  isAddingCollaborator: boolean;

  // Real-time features
  onlineUsers: UserPresence[];
  typingUsers: TypingIndicator[];
  isConnected: boolean;
  connectionStatus: 'connecting' | 'connected' | 'disconnected' | 'error';

  // Notifications
  notificationSettings: NotificationSettings;
  unreadNotifications: number;

  // General
  error: string | null;
}

interface UseCollaborationActions {
  // Comments
  addComment: (comment: Omit<Comment, 'id' | 'createdAt' | 'authorId' | 'authorName'>) => Promise<void>;
  updateComment: (commentId: string, content: string) => Promise<void>;
  deleteComment: (commentId: string) => Promise<void>;
  loadComments: () => Promise<void>;

  // Team management
  addCollaborator: (collaborator: Omit<Collaborator, 'id' | 'addedAt' | 'addedBy'>) => Promise<void>;
  removeCollaborator: (collaboratorId: string) => Promise<void>;
  updateCollaboratorPermissions: (collaboratorId: string, permissions: Collaborator['permissions']) => Promise<void>;
  loadCollaborators: () => Promise<void>;
  loadAvailableUsers: () => Promise<void>;

  // Real-time collaboration
  connectToInvestigation: (investigationId: string) => Promise<void>;
  disconnect: () => void;
  sendTypingIndicator: (componentType: 'comment' | 'step_notes' | 'evidence_description', componentId?: string, isTyping?: boolean) => void;
  sendPresenceUpdate: (status: 'online' | 'away' | 'offline', currentView?: string) => void;

  // Notifications
  updateNotificationSettings: (settings: NotificationSettings) => Promise<void>;
  mentionUser: (userId: string) => void;

  // Event handlers
  onCollaborationEvent: (eventType: string, callback: (event: CollaborationEvent) => void) => () => void;
  onPresenceUpdate: (callback: (users: UserPresence[]) => void) => () => void;
  onTypingUpdate: (callback: (typingUsers: TypingIndicator[]) => void) => () => void;

  // Utility
  clearError: () => void;
  getUserPermissions: (userId: string) => Collaborator['permissions'] | null;
  isUserOnline: (userId: string) => boolean;
  isUserTyping: (userId: string, componentType?: string, componentId?: string) => boolean;
}

interface UseCollaborationOptions {
  investigationId: string;
  currentUserId: string;
  currentUserName: string;
  autoConnect?: boolean;
  enableTypingIndicators?: boolean;
  enablePresence?: boolean;
}

export function useCollaboration(
  options: UseCollaborationOptions
): UseCollaborationState & UseCollaborationActions {
  const {
    investigationId,
    currentUserId,
    currentUserName,
    autoConnect = true,
    enableTypingIndicators = true,
    enablePresence = true
  } = options;

  const [state, setState] = useState<UseCollaborationState>({
    comments: [],
    isLoadingComments: false,
    isAddingComment: false,
    collaborators: [],
    availableUsers: [],
    isLoadingCollaborators: false,
    isAddingCollaborator: false,
    onlineUsers: [],
    typingUsers: [],
    isConnected: false,
    connectionStatus: 'disconnected',
    notificationSettings: {
      stepAssigned: true,
      stepCompleted: true,
      evidenceAdded: true,
      reviewRequired: true,
      statusChanged: true,
      dueDate: true,
      mentions: true
    },
    unreadNotifications: 0,
    error: null
  });

  const cleanupFunctionsRef = useRef<(() => void)[]>([]);
  const typingTimeoutRef = useRef<NodeJS.Timeout>();

  // Comments management
  const loadComments = useCallback(async () => {
    setState(prev => ({ ...prev, isLoadingComments: true, error: null }));

    try {
      const response = await manualInvestigationService.getComments(investigationId);

      if (!response.success) {
        throw new Error(response.error || 'Failed to load comments');
      }

      setState(prev => ({
        ...prev,
        comments: response.data || [],
        isLoadingComments: false
      }));
    } catch (error) {
      setState(prev => ({
        ...prev,
        error: error instanceof Error ? error.message : 'Failed to load comments',
        isLoadingComments: false
      }));
    }
  }, [investigationId]);

  const addComment = useCallback(async (
    comment: Omit<Comment, 'id' | 'createdAt' | 'authorId' | 'authorName'>
  ) => {
    setState(prev => ({ ...prev, isAddingComment: true, error: null }));

    try {
      const response = await manualInvestigationService.addComment(investigationId, {
        comment,
        authorId: currentUserId,
        authorName: currentUserName
      });

      if (!response.success) {
        throw new Error(response.error || 'Failed to add comment');
      }

      const newComment = response.data!;

      setState(prev => ({
        ...prev,
        comments: [newComment, ...prev.comments],
        isAddingComment: false
      }));

      // Send real-time update
      collaborationService.sendCommentAdded(newComment);

      // Send mentions notifications
      if (comment.mentions && comment.mentions.length > 0) {
        comment.mentions.forEach(userId => {
          mentionUser(userId);
        });
      }
    } catch (error) {
      setState(prev => ({
        ...prev,
        error: error instanceof Error ? error.message : 'Failed to add comment',
        isAddingComment: false
      }));
    }
  }, [investigationId, currentUserId, currentUserName]);

  const updateComment = useCallback(async (commentId: string, content: string) => {
    setState(prev => ({ ...prev, error: null }));

    try {
      const response = await manualInvestigationService.updateComment(
        investigationId,
        commentId,
        content
      );

      if (!response.success) {
        throw new Error(response.error || 'Failed to update comment');
      }

      const updatedComment = response.data!;

      setState(prev => ({
        ...prev,
        comments: prev.comments.map(comment =>
          comment.id === commentId ? updatedComment : comment
        )
      }));
    } catch (error) {
      setState(prev => ({
        ...prev,
        error: error instanceof Error ? error.message : 'Failed to update comment'
      }));
    }
  }, [investigationId]);

  const deleteComment = useCallback(async (commentId: string) => {
    setState(prev => ({ ...prev, error: null }));

    try {
      const response = await manualInvestigationService.deleteComment(
        investigationId,
        commentId
      );

      if (!response.success) {
        throw new Error(response.error || 'Failed to delete comment');
      }

      setState(prev => ({
        ...prev,
        comments: prev.comments.filter(comment => comment.id !== commentId)
      }));
    } catch (error) {
      setState(prev => ({
        ...prev,
        error: error instanceof Error ? error.message : 'Failed to delete comment'
      }));
    }
  }, [investigationId]);

  // Team management
  const loadCollaborators = useCallback(async () => {
    setState(prev => ({ ...prev, isLoadingCollaborators: true, error: null }));

    try {
      const response = await manualInvestigationService.getCollaborators(investigationId);

      if (!response.success) {
        throw new Error(response.error || 'Failed to load collaborators');
      }

      setState(prev => ({
        ...prev,
        collaborators: response.data || [],
        isLoadingCollaborators: false
      }));
    } catch (error) {
      setState(prev => ({
        ...prev,
        error: error instanceof Error ? error.message : 'Failed to load collaborators',
        isLoadingCollaborators: false
      }));
    }
  }, [investigationId]);

  const loadAvailableUsers = useCallback(async () => {
    try {
      const response = await manualInvestigationService.getAvailableUsers();

      if (response.success) {
        setState(prev => ({
          ...prev,
          availableUsers: response.data || []
        }));
      }
    } catch (error) {
      console.error('Failed to load available users:', error);
    }
  }, []);

  const addCollaborator = useCallback(async (
    collaborator: Omit<Collaborator, 'id' | 'addedAt' | 'addedBy'>
  ) => {
    setState(prev => ({ ...prev, isAddingCollaborator: true, error: null }));

    try {
      const response = await manualInvestigationService.addCollaborator(
        investigationId,
        collaborator
      );

      if (!response.success) {
        throw new Error(response.error || 'Failed to add collaborator');
      }

      const newCollaborator = response.data!;

      setState(prev => ({
        ...prev,
        collaborators: [...prev.collaborators, newCollaborator],
        isAddingCollaborator: false
      }));
    } catch (error) {
      setState(prev => ({
        ...prev,
        error: error instanceof Error ? error.message : 'Failed to add collaborator',
        isAddingCollaborator: false
      }));
    }
  }, [investigationId]);

  const removeCollaborator = useCallback(async (collaboratorId: string) => {
    setState(prev => ({ ...prev, error: null }));

    try {
      const response = await manualInvestigationService.removeCollaborator(
        investigationId,
        collaboratorId
      );

      if (!response.success) {
        throw new Error(response.error || 'Failed to remove collaborator');
      }

      setState(prev => ({
        ...prev,
        collaborators: prev.collaborators.filter(c => c.id !== collaboratorId)
      }));
    } catch (error) {
      setState(prev => ({
        ...prev,
        error: error instanceof Error ? error.message : 'Failed to remove collaborator'
      }));
    }
  }, [investigationId]);

  const updateCollaboratorPermissions = useCallback(async (
    collaboratorId: string,
    permissions: Collaborator['permissions']
  ) => {
    setState(prev => ({ ...prev, error: null }));

    try {
      const response = await manualInvestigationService.updateCollaboratorPermissions(
        investigationId,
        collaboratorId,
        permissions
      );

      if (!response.success) {
        throw new Error(response.error || 'Failed to update permissions');
      }

      const updatedCollaborator = response.data!;

      setState(prev => ({
        ...prev,
        collaborators: prev.collaborators.map(c =>
          c.id === collaboratorId ? updatedCollaborator : c
        )
      }));
    } catch (error) {
      setState(prev => ({
        ...prev,
        error: error instanceof Error ? error.message : 'Failed to update permissions'
      }));
    }
  }, [investigationId]);

  // Real-time collaboration
  const connectToInvestigation = useCallback(async (invId: string) => {
    setState(prev => ({ ...prev, connectionStatus: 'connecting', error: null }));

    try {
      await collaborationService.connect(invId, currentUserId, currentUserName);

      setState(prev => ({
        ...prev,
        isConnected: true,
        connectionStatus: 'connected'
      }));

      // Set up visibility handling
      const cleanupVisibility = collaborationService.setupVisibilityHandling();
      cleanupFunctionsRef.current.push(cleanupVisibility);
    } catch (error) {
      setState(prev => ({
        ...prev,
        isConnected: false,
        connectionStatus: 'error',
        error: error instanceof Error ? error.message : 'Failed to connect'
      }));
    }
  }, [currentUserId, currentUserName]);

  const disconnect = useCallback(() => {
    collaborationService.disconnect();
    setState(prev => ({
      ...prev,
      isConnected: false,
      connectionStatus: 'disconnected',
      onlineUsers: [],
      typingUsers: []
    }));

    // Clean up event listeners
    cleanupFunctionsRef.current.forEach(cleanup => cleanup());
    cleanupFunctionsRef.current = [];
  }, []);

  const sendTypingIndicator = useCallback((
    componentType: 'comment' | 'step_notes' | 'evidence_description',
    componentId?: string,
    isTyping = true
  ) => {
    if (!enableTypingIndicators || !state.isConnected) return;

    collaborationService.sendTypingIndicator(componentType, componentId, isTyping);

    // Clear existing timeout
    if (typingTimeoutRef.current) {
      clearTimeout(typingTimeoutRef.current);
    }

    // Stop typing indicator after 3 seconds of inactivity
    if (isTyping) {
      typingTimeoutRef.current = setTimeout(() => {
        collaborationService.sendTypingIndicator(componentType, componentId, false);
      }, 3000);
    }
  }, [enableTypingIndicators, state.isConnected]);

  const sendPresenceUpdate = useCallback((
    status: 'online' | 'away' | 'offline',
    currentView?: string
  ) => {
    if (!enablePresence || !state.isConnected) return;

    collaborationService.sendPresenceUpdate(status, currentView);
  }, [enablePresence, state.isConnected]);

  // Notifications
  const updateNotificationSettings = useCallback(async (settings: NotificationSettings) => {
    try {
      const response = await manualInvestigationService.updateNotificationSettings(
        currentUserId,
        settings
      );

      if (response.success) {
        setState(prev => ({
          ...prev,
          notificationSettings: settings
        }));

        // Update the notification service
        notificationService.updateSettings(settings);
      }
    } catch (error) {
      setState(prev => ({
        ...prev,
        error: error instanceof Error ? error.message : 'Failed to update notification settings'
      }));
    }
  }, [currentUserId]);

  const mentionUser = useCallback((userId: string) => {
    notificationService.createNotification({
      type: 'mention',
      investigationId,
      investigationTitle: '', // Will be filled by the service
      variables: { userName: currentUserName }
    });
  }, [investigationId, currentUserName]);

  // Event handlers
  const onCollaborationEvent = useCallback((
    eventType: string,
    callback: (event: CollaborationEvent) => void
  ) => {
    const unsubscribe = collaborationService.onEvent(eventType, callback);
    cleanupFunctionsRef.current.push(unsubscribe);
    return unsubscribe;
  }, []);

  const onPresenceUpdate = useCallback((callback: (users: UserPresence[]) => void) => {
    const unsubscribe = collaborationService.onPresenceUpdate(callback);
    cleanupFunctionsRef.current.push(unsubscribe);
    return unsubscribe;
  }, []);

  const onTypingUpdate = useCallback((callback: (typingUsers: TypingIndicator[]) => void) => {
    const unsubscribe = collaborationService.onTypingUpdate(callback);
    cleanupFunctionsRef.current.push(unsubscribe);
    return unsubscribe;
  }, []);

  // Utility functions
  const getUserPermissions = useCallback((userId: string): Collaborator['permissions'] | null => {
    const collaborator = state.collaborators.find(c => c.id === userId);
    return collaborator?.permissions || null;
  }, [state.collaborators]);

  const isUserOnline = useCallback((userId: string): boolean => {
    return state.onlineUsers.some(user => user.userId === userId && user.status === 'online');
  }, [state.onlineUsers]);

  const isUserTyping = useCallback((
    userId: string,
    componentType?: string,
    componentId?: string
  ): boolean => {
    return state.typingUsers.some(typing =>
      typing.userId === userId &&
      (!componentType || typing.componentType === componentType) &&
      (!componentId || typing.componentId === componentId)
    );
  }, [state.typingUsers]);

  const clearError = useCallback(() => {
    setState(prev => ({ ...prev, error: null }));
  }, []);

  // Set up real-time event listeners
  useEffect(() => {
    if (!state.isConnected) return;

    // Comment events
    const unsubscribeCommentAdded = collaborationService.onEvent('comment_added', (event) => {
      if (event.userId !== currentUserId) {
        setState(prev => ({
          ...prev,
          comments: [event.data.comment, ...prev.comments]
        }));
      }
    });

    // User presence events
    const unsubscribePresence = collaborationService.onPresenceUpdate((users) => {
      setState(prev => ({ ...prev, onlineUsers: users }));
    });

    // Typing events
    const unsubscribeTyping = collaborationService.onTypingUpdate((typingUsers) => {
      setState(prev => ({ ...prev, typingUsers }));
    });

    cleanupFunctionsRef.current.push(
      unsubscribeCommentAdded,
      unsubscribePresence,
      unsubscribeTyping
    );

    return () => {
      unsubscribeCommentAdded();
      unsubscribePresence();
      unsubscribeTyping();
    };
  }, [state.isConnected, currentUserId]);

  // Load notification settings
  useEffect(() => {
    const loadNotificationSettings = async () => {
      try {
        const response = await manualInvestigationService.getNotificationSettings(currentUserId);
        if (response.success) {
          setState(prev => ({
            ...prev,
            notificationSettings: response.data!
          }));
        }
      } catch (error) {
        console.error('Failed to load notification settings:', error);
      }
    };

    loadNotificationSettings();
  }, [currentUserId]);

  // Subscribe to notification updates
  useEffect(() => {
    const unsubscribe = notificationService.subscribe(() => {
      setState(prev => ({
        ...prev,
        unreadNotifications: notificationService.getUnreadCount()
      }));
    });

    // Initial count
    setState(prev => ({
      ...prev,
      unreadNotifications: notificationService.getUnreadCount()
    }));

    return unsubscribe;
  }, []);

  // Auto-connect on mount
  useEffect(() => {
    if (autoConnect && investigationId) {
      connectToInvestigation(investigationId);
      loadComments();
      loadCollaborators();
      loadAvailableUsers();
    }
  }, [autoConnect, investigationId]); // Only run on mount

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (typingTimeoutRef.current) {
        clearTimeout(typingTimeoutRef.current);
      }
      cleanupFunctionsRef.current.forEach(cleanup => cleanup());
      disconnect();
    };
  }, [disconnect]);

  return {
    // State
    ...state,

    // Actions
    addComment,
    updateComment,
    deleteComment,
    loadComments,
    addCollaborator,
    removeCollaborator,
    updateCollaboratorPermissions,
    loadCollaborators,
    loadAvailableUsers,
    connectToInvestigation,
    disconnect,
    sendTypingIndicator,
    sendPresenceUpdate,
    updateNotificationSettings,
    mentionUser,
    onCollaborationEvent,
    onPresenceUpdate,
    onTypingUpdate,
    clearError,
    getUserPermissions,
    isUserOnline,
    isUserTyping
  };
}