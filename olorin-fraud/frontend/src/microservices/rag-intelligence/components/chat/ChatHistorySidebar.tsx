import React, { useState, useEffect, useCallback } from 'react';
import { useToast } from '@shared/components/ui/ToastProvider';
import { MessageSquare, Plus, Trash2, Clock, X } from 'lucide-react';
import RAGApiService from '@shared/services/RAGApiService';

interface ChatSession {
  id: string;
  title: string | null;
  created_at: string;
  updated_at: string;
  message_count: number;
  is_active: boolean;
}

interface ChatHistorySidebarProps {
  isOpen: boolean;
  onClose: () => void;
  onSelectSession: (sessionId: string) => void;
  currentSessionId: string | null;
}

const ChatHistorySidebar: React.FC<ChatHistorySidebarProps> = ({
  isOpen,
  onClose,
  onSelectSession,
  currentSessionId
}) => {
  const { showToast } = useToast();
  const [sessions, setSessions] = useState<ChatSession[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');

  const loadSessions = useCallback(async () => {
    try {
      setIsLoading(true);
      const data = await RAGApiService.getChatSessions(false);
      setSessions(data || []);
    } catch (error) {
      console.error('Failed to load chat sessions:', error);
      showToast('error', 'Error', 'Failed to load chat history');
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    if (isOpen) {
      loadSessions();
    }
  }, [isOpen, loadSessions]);

  const handleDeleteSession = async (sessionId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (!confirm('Are you sure you want to delete this chat?')) {
      return;
    }

    try {
      await RAGApiService.deleteChatSession(sessionId);
      showToast('success', 'Success', 'Chat deleted');
      await loadSessions();
      if (currentSessionId === sessionId) {
        onSelectSession('');
      }
    } catch (error) {
      console.error('Failed to delete chat session:', error);
      showToast('error', 'Error', 'Failed to delete chat');
    }
  };

  const handleNewChat = () => {
    onSelectSession('');
    onClose();
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    if (diffDays < 7) return `${diffDays}d ago`;
    return date.toLocaleDateString();
  };

  const filteredSessions = sessions.filter(session =>
    session.title?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    !searchTerm
  );

  if (!isOpen) return null;

  return (
    <div className="fixed inset-y-0 right-0 w-80 bg-black/60 backdrop-blur-md border-l-2 border-corporate-borderPrimary/40 z-50 flex flex-col">
      {/* Header */}
      <div className="flex-shrink-0 px-4 py-3 border-b-2 border-corporate-borderPrimary/40 flex items-center justify-between">
        <h3 className="text-lg font-semibold text-corporate-textPrimary flex items-center gap-2">
          <MessageSquare className="w-5 h-5 text-corporate-accentPrimary" />
          Chat History
        </h3>
        <button
          onClick={onClose}
          className="p-1.5 rounded-lg hover:bg-black/40 text-corporate-textSecondary hover:text-corporate-textPrimary transition-colors"
        >
          <X className="w-5 h-5" />
        </button>
      </div>

      {/* New Chat Button */}
      <div className="flex-shrink-0 px-4 py-3 border-b-2 border-corporate-borderPrimary/40">
        <button
          onClick={handleNewChat}
          className="w-full px-4 py-2 bg-corporate-accentPrimary/80 text-white rounded-lg hover:bg-corporate-accentPrimary transition-colors flex items-center justify-center gap-2 border-2 border-corporate-accentPrimary/40"
        >
          <Plus className="w-4 h-4" />
          New Chat
        </button>
      </div>

      {/* Search */}
      <div className="flex-shrink-0 px-4 py-3 border-b-2 border-corporate-borderPrimary/40">
        <input
          type="text"
          placeholder="Search chats..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="w-full px-3 py-2 bg-black/40 border-2 border-corporate-borderPrimary/40 rounded-lg text-corporate-textPrimary placeholder-corporate-textTertiary focus:outline-none focus:border-corporate-accentPrimary/60 transition-colors"
        />
      </div>

      {/* Sessions List */}
      <div className="flex-1 overflow-y-auto scrollbar-thin scrollbar-thumb-corporate-borderPrimary scrollbar-track-transparent">
        {isLoading ? (
          <div className="flex items-center justify-center py-8">
            <div className="text-sm text-corporate-textTertiary">Loading...</div>
          </div>
        ) : filteredSessions.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-8 px-4">
            <MessageSquare className="w-12 h-12 text-corporate-textTertiary mb-3" />
            <div className="text-sm text-corporate-textTertiary text-center">
              {searchTerm ? 'No chats found' : 'No chat history yet'}
            </div>
          </div>
        ) : (
          <div className="p-2 space-y-1">
            {filteredSessions.map((session) => (
              <div
                key={session.id}
                onClick={() => {
                  onSelectSession(session.id);
                  onClose();
                }}
                className={`group relative p-3 rounded-lg cursor-pointer transition-colors ${
                  currentSessionId === session.id
                    ? 'bg-corporate-accentPrimary/20 border-2 border-corporate-accentPrimary/60'
                    : 'bg-black/40 border-2 border-corporate-borderPrimary/40 hover:border-corporate-accentPrimary/40'
                }`}
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="flex-1 min-w-0">
                    <div className="text-sm font-medium text-corporate-textPrimary truncate mb-1">
                      {session.title || 'Untitled Chat'}
                    </div>
                    <div className="flex items-center gap-2 text-xs text-corporate-textTertiary">
                      <Clock className="w-3 h-3" />
                      <span>{formatDate(session.updated_at)}</span>
                      {session.message_count > 0 && (
                        <span className="ml-auto">• {session.message_count} messages</span>
                      )}
                    </div>
                  </div>
                  <button
                    onClick={(e) => handleDeleteSession(session.id, e)}
                    className="opacity-0 group-hover:opacity-100 p-1.5 rounded hover:bg-corporate-error/20 text-corporate-error transition-all"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default ChatHistorySidebar;

