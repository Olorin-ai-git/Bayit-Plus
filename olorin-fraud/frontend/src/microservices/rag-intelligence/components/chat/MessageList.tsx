import React, { useEffect, useRef, useMemo } from 'react';
import { Search, Filter, Download, Trash2, MessageCircle } from 'lucide-react';
import { EnhancedChatMessage, ViewMode } from '../../types/ragIntelligence';
import MessageViewer from './MessageViewer';

interface MessageListProps {
  messages: EnhancedChatMessage[];
  expandedMessages: Set<string>;
  messageViewModes: Record<string, ViewMode>;
  searchTerm: string;
  onSearchChange: (term: string) => void;
  onToggleExpand: (messageId: string) => void;
  onChangeViewMode: (messageId: string, mode: ViewMode) => void;
  onEditMessage?: (messageId: string, newQuery: string) => void;
  onCopy: (text: string) => void;
  onClearMessages?: () => void;
  onExportMessages?: () => void;
  autoScroll?: boolean;
  className?: string;
}

const MessageList: React.FC<MessageListProps> = ({
  messages,
  expandedMessages,
  messageViewModes,
  searchTerm,
  onSearchChange,
  onToggleExpand,
  onChangeViewMode,
  onEditMessage,
  onCopy,
  onClearMessages,
  onExportMessages,
  autoScroll = true,
  className = ""
}) => {
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const listRef = useRef<HTMLDivElement>(null);

  // Auto-scroll to bottom when new messages arrive
  useEffect(() => {
    if (autoScroll && messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages.length, autoScroll]);

  // Filter messages based on search term
  const filteredMessages = useMemo(() => {
    if (!searchTerm.trim()) return messages;

    const term = searchTerm.toLowerCase();
    return messages.filter(message =>
      message.content.toLowerCase().includes(term) ||
      message.natural_query?.toLowerCase().includes(term) ||
      message.translated_query?.toLowerCase().includes(term) ||
      message.sender.toLowerCase().includes(term)
    );
  }, [messages, searchTerm]);

  const handleExport = () => {
    if (onExportMessages) {
      onExportMessages();
      return;
    }

    // Default export implementation
    const exportData = {
      timestamp: new Date().toISOString(),
      total_messages: messages.length,
      messages: messages.map(msg => ({
        id: msg.id,
        sender: msg.sender,
        content: msg.content,
        timestamp: msg.timestamp.toISOString(),
        natural_query: msg.natural_query,
        translated_query: msg.translated_query,
        query_metadata: msg.query_metadata,
        structured_data: msg.structured_data
      }))
    };

    const blob = new Blob([JSON.stringify(exportData, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `rag-chat-export-${new Date().toISOString().split('T')[0]}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  if (messages.length === 0) {
    return (
      <div className={`flex-1 flex items-center justify-center ${className}`}>
        <div className="text-center max-w-md mx-auto">
          <div className="w-16 h-16 bg-black/40 backdrop-blur-md border-2 border-corporate-accentPrimary/40 rounded-full flex items-center justify-center mx-auto mb-4">
            <MessageCircle className="w-8 h-8 text-corporate-textSecondary" />
          </div>
          <h3 className="text-lg font-medium text-corporate-textPrimary mb-2">
            No messages yet
          </h3>
          <p className="text-corporate-textSecondary text-sm">
            Start a conversation by asking a question about your data.
            Try asking about specific records, patterns, or insights.
          </p>
          <div className="mt-6 space-y-2 text-left">
            <div className="text-xs font-medium text-corporate-textSecondary mb-2">Example queries:</div>
            <div className="space-y-1">
              <div className="text-xs text-corporate-textTertiary bg-black/40 backdrop-blur-md border border-corporate-borderPrimary/40 p-2 rounded">
                "Show me all suspicious transactions from last week"
              </div>
              <div className="text-xs text-corporate-textTertiary bg-black/40 backdrop-blur-md border border-corporate-borderPrimary/40 p-2 rounded">
                "Find patterns in user behavior data"
              </div>
              <div className="text-xs text-corporate-textTertiary bg-black/40 backdrop-blur-md border border-corporate-borderPrimary/40 p-2 rounded">
                "What are the top risk indicators?"
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className={`flex flex-col h-full ${className}`}>
      {/* Toolbar */}
      <div className="flex-shrink-0 p-4 border-b-2 border-corporate-accentPrimary/40 bg-black/40 backdrop-blur-md">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <h3 className="text-lg font-medium text-corporate-textPrimary">
              Chat History
            </h3>
            <div className="text-sm text-corporate-textSecondary">
              {filteredMessages.length} {filteredMessages.length === 1 ? 'message' : 'messages'}
            </div>
          </div>

          <div className="flex items-center space-x-2">
            {/* Export Button */}
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                handleExport();
              }}
              className="p-2 text-corporate-textSecondary hover:text-corporate-accentPrimary rounded-lg transition-colors cursor-pointer"
              title="Export messages"
            >
              <Download className="w-4 h-4" />
            </button>

            {/* Clear Button */}
            {onClearMessages && (
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  onClearMessages();
                }}
                className="p-2 text-corporate-textSecondary hover:text-corporate-error rounded-lg transition-colors cursor-pointer"
                title="Clear all messages"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            )}
          </div>
        </div>

        {/* Search Bar */}
        <div className="mt-3 relative">
          <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
            <Search className="h-4 w-4 text-corporate-textTertiary" />
          </div>
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => onSearchChange(e.target.value)}
            placeholder="Search messages..."
            className="
              block w-full pl-10 pr-3 py-2 bg-black/40 border-2 border-corporate-borderPrimary/40 rounded-lg
              text-sm text-corporate-textPrimary placeholder-corporate-textTertiary focus:outline-none focus:ring-2
              focus:ring-corporate-accentPrimary/20 focus:border-corporate-accentPrimary/60
            "
          />
          {searchTerm && (
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                onSearchChange('');
              }}
              className="absolute inset-y-0 right-0 pr-3 flex items-center cursor-pointer"
            >
              <span className="text-corporate-textTertiary hover:text-corporate-textSecondary text-sm">Clear</span>
            </button>
          )}
        </div>

        {/* Search Results Info */}
        {searchTerm && (
          <div className="mt-2 text-xs text-corporate-textTertiary">
            {filteredMessages.length === messages.length ?
              `Showing all ${messages.length} messages` :
              `Found ${filteredMessages.length} of ${messages.length} messages`
            }
          </div>
        )}
      </div>

      {/* Messages Container */}
      <div
        ref={listRef}
        className="flex-1 overflow-y-auto bg-black px-4 py-6 scrollbar-thin scrollbar-thumb-corporate-borderPrimary scrollbar-track-transparent"
      >
        {filteredMessages.length === 0 ? (
          <div className="text-center py-12">
            <Search className="w-12 h-12 text-corporate-textTertiary mx-auto mb-4" />
            <h3 className="text-lg font-medium text-corporate-textPrimary mb-2">
              No messages found
            </h3>
            <p className="text-corporate-textSecondary">
              Try adjusting your search terms or clear the search to see all messages.
            </p>
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                onSearchChange('');
              }}
              className="mt-4 text-corporate-accentPrimary hover:text-corporate-accentSecondary text-sm font-medium cursor-pointer"
            >
              Clear search
            </button>
          </div>
        ) : (
          <>
            {filteredMessages.map((message, index) => (
              <MessageViewer
                key={message.id}
                message={message}
                isExpanded={expandedMessages.has(message.id)}
                viewMode={messageViewModes[message.id] || 'enhanced'}
                onToggleExpand={onToggleExpand}
                onChangeViewMode={onChangeViewMode}
                onEditMessage={onEditMessage}
                onCopy={onCopy}
                className={`
                  ${index === filteredMessages.length - 1 ? 'mb-4' : ''}
                  ${searchTerm ? 'ring-1 ring-corporate-accentPrimary/40' : ''}
                `}
              />
            ))}

            {/* Auto-scroll anchor */}
            <div ref={messagesEndRef} className="h-1" />
          </>
        )}
      </div>

      {/* Message Count Footer */}
      <div className="flex-shrink-0 px-4 py-2 bg-black/40 backdrop-blur-md border-t-2 border-corporate-accentPrimary/40">
        <div className="flex justify-between items-center text-xs text-corporate-textTertiary">
          <div>
            Total: {messages.length} message{messages.length !== 1 ? 's' : ''}
          </div>
          <div>
            {searchTerm && `Filtered: ${filteredMessages.length}`}
          </div>
        </div>
      </div>
    </div>
  );
};

export default MessageList;