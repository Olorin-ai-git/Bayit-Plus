import React, { useState, useEffect, useRef } from 'react';
import { Collaboration, CreateCollaborationRequest } from '../types';
import { useServices } from '../services';
import LoadingSpinner from '../../../shared/components/LoadingSpinner';
import ErrorAlert from '../../../shared/components/ErrorAlert';

interface InvestigationCollaborationProps {
  investigationId: string;
  className?: string;
}

export const InvestigationCollaboration: React.FC<InvestigationCollaborationProps> = ({
  investigationId,
  className = ''
}) => {
  const { websocket: webSocketService } = useServices();
  const [collaborations, setCollaborations] = useState<Collaboration[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [newMessage, setNewMessage] = useState('');
  const [sending, setSending] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    loadCollaborations();
    subscribeToUpdates();
  }, [investigationId]);

  useEffect(() => {
    scrollToBottom();
  }, [collaborations]);

  const loadCollaborations = async () => {
    try {
      setLoading(true);
      setError(null);

      const response = await fetch(
        `/api/investigations/${investigationId}/collaborations`,
        {
          headers: {
            'Authorization': `Bearer ${localStorage.getItem('auth_token')}`
          }
        }
      );

      if (!response.ok) {
        throw new Error('Failed to load collaborations');
      }

      const data = await response.json();
      setCollaborations(data.collaborations || []);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load collaborations');
    } finally {
      setLoading(false);
    }
  };

  const subscribeToUpdates = () => {
    const subscriptionId = webSocketService.subscribeToCollaboration(
      investigationId,
      (event) => {
        if (event.type === 'collaboration.comment_added') {
          setCollaborations(prev => [...prev, event.data.collaboration]);
        } else if (event.type === 'collaboration.comment_updated') {
          setCollaborations(prev =>
            prev.map(collab =>
              collab.id === event.data.collaboration.id
                ? event.data.collaboration
                : collab
            )
          );
        } else if (event.type === 'collaboration.comment_deleted') {
          setCollaborations(prev =>
            prev.filter(collab => collab.id !== event.data.collaboration_id)
          );
        }
      }
    );

    return () => {
      webSocketService.unsubscribe(subscriptionId);
    };
  };

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!newMessage.trim() || sending) return;

    try {
      setSending(true);

      const request: CreateCollaborationRequest = {
        investigation_id: investigationId,
        message: newMessage.trim(),
        message_type: 'text',
        visibility: 'public'
      };

      const response = await fetch('/api/collaborations', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('auth_token')}`
        },
        body: JSON.stringify(request)
      });

      if (!response.ok) {
        throw new Error('Failed to send message');
      }

      setNewMessage('');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to send message');
    } finally {
      setSending(false);
    }
  };

  const formatTimestamp = (timestamp: string) => {
    const date = new Date(timestamp);
    const now = new Date();
    const diffInHours = (now.getTime() - date.getTime()) / (1000 * 60 * 60);

    if (diffInHours < 24) {
      return date.toLocaleTimeString('en-US', {
        hour: '2-digit',
        minute: '2-digit',
      });
    } else {
      return date.toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      });
    }
  };

  const getMessageTypeIcon = (messageType: Collaboration['message_type']) => {
    switch (messageType) {
      case 'system':
        return (
          <svg className="w-4 h-4 text-blue-500" fill="currentColor" viewBox="0 0 20 20">
            <path
              fillRule="evenodd"
              d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z"
              clipRule="evenodd"
            />
          </svg>
        );
      case 'mention':
        return (
          <svg className="w-4 h-4 text-orange-500" fill="currentColor" viewBox="0 0 20 20">
            <path
              fillRule="evenodd"
              d="M18 13V5a2 2 0 00-2-2H4a2 2 0 00-2 2v8a2 2 0 002 2h3l3 3 3-3h3a2 2 0 002-2zM5 7a1 1 0 011-1h8a1 1 0 110 2H6a1 1 0 01-1-1zm1 3a1 1 0 100 2h3a1 1 0 100-2H6z"
              clipRule="evenodd"
            />
          </svg>
        );
      default:
        return null;
    }
  };

  if (loading) {
    return (
      <div className={`flex items-center justify-center p-8 ${className}`}>
        <LoadingSpinner size="lg" />
      </div>
    );
  }

  return (
    <div className={`bg-white border border-gray-200 rounded-lg shadow-sm flex flex-col h-96 ${className}`}>
      {/* Header */}
      <div className="px-4 py-3 border-b border-gray-200 bg-gray-50 rounded-t-lg">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-medium text-gray-900">
            Team Collaboration
          </h3>
          <span className="text-xs text-gray-500">
            {collaborations.length} messages
          </span>
        </div>
      </div>

      {/* Error Display */}
      {error && (
        <div className="px-4 py-2 border-b border-gray-200">
          <ErrorAlert
            message={error}
            onDismiss={() => setError(null)}
          />
        </div>
      )}

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-4 space-y-3">
        {collaborations.length === 0 ? (
          <div className="text-center py-8">
            <svg
              className="mx-auto h-8 w-8 text-gray-400"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z"
              />
            </svg>
            <p className="mt-2 text-sm text-gray-500">
              No messages yet. Start the conversation!
            </p>
          </div>
        ) : (
          collaborations.map((collaboration) => (
            <div
              key={collaboration.id}
              className={`flex space-x-3 ${
                collaboration.message_type === 'system'
                  ? 'justify-center'
                  : ''
              }`}
            >
              {collaboration.message_type !== 'system' && (
                <div className="flex-shrink-0">
                  <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center">
                    <span className="text-sm font-medium text-blue-600">
                      {collaboration.user.name?.[0]?.toUpperCase() || 'U'}
                    </span>
                  </div>
                </div>
              )}

              <div className={`flex-1 min-w-0 ${
                collaboration.message_type === 'system'
                  ? 'max-w-md'
                  : ''
              }`}>
                {collaboration.message_type !== 'system' && (
                  <div className="flex items-center space-x-2">
                    <span className="text-sm font-medium text-gray-900">
                      {collaboration.user.name || 'Unknown User'}
                    </span>
                    <span className="text-xs text-gray-500">
                      {formatTimestamp(collaboration.created_at)}
                    </span>
                    {getMessageTypeIcon(collaboration.message_type)}
                    {collaboration.is_edited && (
                      <span className="text-xs text-gray-400">(edited)</span>
                    )}
                  </div>
                )}

                <div className={`mt-1 ${
                  collaboration.message_type === 'system'
                    ? 'bg-blue-50 border border-blue-200 rounded-lg p-3 text-center'
                    : ''
                }`}>
                  <p className={`text-sm ${
                    collaboration.message_type === 'system'
                      ? 'text-blue-800 font-medium'
                      : 'text-gray-700'
                  }`}>
                    {collaboration.message}
                  </p>
                </div>

                {/* Attachments */}
                {collaboration.attachments.length > 0 && (
                  <div className="mt-2 space-y-1">
                    {collaboration.attachments.map((attachment) => (
                      <div
                        key={attachment.id}
                        className="flex items-center space-x-2 text-sm text-blue-600 hover:text-blue-800"
                      >
                        <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                          <path
                            fillRule="evenodd"
                            d="M8 4a3 3 0 00-3 3v4a5 5 0 0010 0V7a1 1 0 112 0v4a7 7 0 11-14 0V7a5 5 0 0110 0v4a3 3 0 11-6 0V7a1 1 0 012 0v4a1 1 0 102 0V7a3 3 0 00-3-3z"
                            clipRule="evenodd"
                          />
                        </svg>
                        <a
                          href={attachment.download_url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="hover:underline"
                        >
                          {attachment.filename}
                        </a>
                      </div>
                    ))}
                  </div>
                )}

                {/* Reactions */}
                {collaboration.reactions.length > 0 && (
                  <div className="mt-2 flex flex-wrap gap-1">
                    {collaboration.reactions.map((reaction) => (
                      <span
                        key={reaction.id}
                        className="inline-flex items-center px-2 py-1 rounded-full text-xs
                                 bg-gray-100 text-gray-700 hover:bg-gray-200 cursor-pointer"
                        title={`${reaction.user.name} reacted with ${reaction.emoji}`}
                      >
                        {reaction.emoji}
                      </span>
                    ))}
                  </div>
                )}
              </div>
            </div>
          ))
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Message Input */}
      <div className="px-4 py-3 border-t border-gray-200 bg-gray-50 rounded-b-lg">
        <form onSubmit={handleSendMessage} className="flex space-x-2">
          <input
            type="text"
            value={newMessage}
            onChange={(e) => setNewMessage(e.target.value)}
            placeholder="Type a message..."
            className="flex-1 min-w-0 px-3 py-2 border border-gray-300 rounded-md
                     text-sm placeholder-gray-500 focus:outline-none focus:ring-2
                     focus:ring-blue-500 focus:border-transparent"
            disabled={sending}
          />
          <button
            type="submit"
            disabled={!newMessage.trim() || sending}
            className="inline-flex items-center px-3 py-2 border border-transparent
                     text-sm font-medium rounded-md text-white bg-blue-600
                     hover:bg-blue-700 focus:outline-none focus:ring-2
                     focus:ring-offset-2 focus:ring-blue-500 transition-colors
                     disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {sending ? (
              <LoadingSpinner size="sm" />
            ) : (
              <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                <path d="M10.894 2.553a1 1 0 00-1.788 0l-7 14a1 1 0 001.169 1.409l5-1.429A1 1 0 009 15.571V11a1 1 0 112 0v4.571a1 1 0 00.725.962l5 1.428a1 1 0 001.17-1.408l-7-14z" />
              </svg>
            )}
          </button>
        </form>
      </div>
    </div>
  );
};