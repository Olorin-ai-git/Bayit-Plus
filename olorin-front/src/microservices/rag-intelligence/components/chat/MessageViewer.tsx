import React, { useState, useCallback } from 'react';
import {
  Copy,
  Edit3,
  Save,
  X,
  User,
  Bot,
  AlertCircle,
  ChevronDown,
  ChevronUp,
  Table,
  Code,
  Eye,
  Clock,
  Database,
  TrendingUp
} from 'lucide-react';
import { EnhancedChatMessage, ViewMode } from '../../types/ragIntelligence';

interface MessageViewerProps {
  message: EnhancedChatMessage;
  isExpanded: boolean;
  viewMode: ViewMode;
  onToggleExpand: (messageId: string) => void;
  onChangeViewMode: (messageId: string, mode: ViewMode) => void;
  onEditMessage?: (messageId: string, newQuery: string) => void;
  onCopy: (text: string) => void;
  className?: string;
}

const MessageViewer: React.FC<MessageViewerProps> = ({
  message,
  isExpanded,
  viewMode,
  onToggleExpand,
  onChangeViewMode,
  onEditMessage,
  onCopy,
  className = ""
}) => {
  const [isEditing, setIsEditing] = useState(false);
  const [editedQuery, setEditedQuery] = useState(message.translated_query || '');

  const handleSaveEdit = useCallback(() => {
    if (onEditMessage && editedQuery.trim()) {
      onEditMessage(message.id, editedQuery.trim());
      setIsEditing(false);
    }
  }, [onEditMessage, message.id, editedQuery]);

  const handleCancelEdit = useCallback(() => {
    setEditedQuery(message.translated_query || '');
    setIsEditing(false);
  }, [message.translated_query]);

<<<<<<< HEAD
  const getMessageIcon = () => {
    switch (message.sender) {
      case 'user':
        return <User className="w-5 h-5 text-blue-600" />;
      case 'assistant':
        return <Bot className="w-5 h-5 text-green-600" />;
      case 'system':
        return <AlertCircle className="w-5 h-5 text-orange-600" />;
      default:
        return <Bot className="w-5 h-5 text-gray-600" />;
=======
  const getMessageIcon = (forAvatar = false) => {
    switch (message.sender) {
      case 'user':
        // For user messages, use white icon in avatar to match the purple bubble
        return <User className={`w-5 h-5 ${forAvatar ? 'text-white' : 'text-corporate-accentPrimary'}`} />;
      case 'assistant':
        return <Bot className="w-5 h-5 text-corporate-success" />;
      case 'system':
        return <AlertCircle className="w-5 h-5 text-corporate-warning" />;
      default:
        return <Bot className="w-5 h-5 text-corporate-textSecondary" />;
>>>>>>> 001-modify-analyzer-method
    }
  };

  const getMessageBorderColor = () => {
    switch (message.sender) {
      case 'user':
<<<<<<< HEAD
        return 'border-blue-200 bg-blue-50';
      case 'assistant':
        return 'border-green-200 bg-green-50';
      case 'system':
        return 'border-orange-200 bg-orange-50';
      default:
        return 'border-gray-200 bg-gray-50';
=======
        return 'border-corporate-accentPrimary/40 bg-black/40 backdrop-blur-md';
      case 'assistant':
        return 'border-corporate-success/40 bg-black/40 backdrop-blur-md';
      case 'system':
        return 'border-corporate-warning/40 bg-black/40 backdrop-blur-md';
      default:
        return 'border-corporate-borderPrimary/40 bg-black/40 backdrop-blur-md';
>>>>>>> 001-modify-analyzer-method
    }
  };

  const renderContent = () => {
    if (!message.structured_data || viewMode === 'raw') {
<<<<<<< HEAD
      return (
        <div className="prose prose-sm max-w-none">
          <pre className="whitespace-pre-wrap bg-gray-50 p-3 rounded text-sm border">
            {message.content}
          </pre>
=======
      // Simple text content for chat bubbles
      return (
        <div className={`whitespace-pre-wrap break-words ${
          message.sender === 'user' 
            ? 'text-white text-base leading-relaxed' 
            : 'text-white text-base leading-relaxed font-normal'
        }`}>
          {message.content}
>>>>>>> 001-modify-analyzer-method
        </div>
      );
    }

    if (viewMode === 'table' && message.structured_data) {
      return (
<<<<<<< HEAD
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200 border border-gray-200 rounded-lg">
            <thead className="bg-gray-50">
=======
        <div className="overflow-x-auto -mx-2">
          <table className="min-w-full divide-y divide-corporate-borderPrimary/40 border border-corporate-borderPrimary/40 rounded-lg text-sm">
            <thead className="bg-black/40 backdrop-blur-md">
>>>>>>> 001-modify-analyzer-method
              <tr>
                {message.structured_data.columns.map((column, index) => (
                  <th
                    key={index}
<<<<<<< HEAD
                    className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider border-b"
=======
                    className="px-3 py-2 text-left text-xs font-medium text-corporate-textSecondary uppercase tracking-wider border-b border-corporate-borderPrimary/40"
>>>>>>> 001-modify-analyzer-method
                  >
                    {column}
                  </th>
                ))}
              </tr>
            </thead>
<<<<<<< HEAD
            <tbody className="bg-white divide-y divide-gray-200">
              {message.structured_data.data.slice(0, 10).map((row, rowIndex) => (
                <tr key={rowIndex} className="hover:bg-gray-50">
                  {message.structured_data!.columns.map((column, colIndex) => (
                    <td key={colIndex} className="px-4 py-2 text-sm text-gray-900 border-b">
=======
            <tbody className="bg-black/20 divide-y divide-corporate-borderPrimary/40">
              {message.structured_data.data.slice(0, 10).map((row, rowIndex) => (
                <tr key={rowIndex} className="hover:bg-black/40">
                  {message.structured_data!.columns.map((column, colIndex) => (
                    <td key={colIndex} className="px-3 py-2 text-sm text-corporate-textPrimary border-b border-corporate-borderPrimary/40">
>>>>>>> 001-modify-analyzer-method
                      {row[column] || '-'}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>

          {message.structured_data.data.length > 10 && (
<<<<<<< HEAD
            <div className="text-xs text-gray-500 mt-2 text-center">
=======
            <div className={`text-xs mt-2 text-center ${
              isUserMessage ? 'text-white/70' : 'text-corporate-textTertiary'
            }`}>
>>>>>>> 001-modify-analyzer-method
              Showing 10 of {message.structured_data.data.length} records
            </div>
          )}
        </div>
      );
    }

    return (
<<<<<<< HEAD
      <div className="prose prose-sm max-w-none">
=======
      <div className="prose prose-base max-w-none prose-invert prose-headings:text-white prose-p:text-white prose-strong:text-white prose-em:text-white prose-code:text-white prose-pre:text-white prose-a:text-white/90">
>>>>>>> 001-modify-analyzer-method
        <div dangerouslySetInnerHTML={{ __html: message.content }} />
      </div>
    );
  };

  const viewModeButtons = [
    { mode: 'enhanced' as ViewMode, icon: Eye, label: 'Enhanced' },
    { mode: 'table' as ViewMode, icon: Table, label: 'Table' },
    { mode: 'raw' as ViewMode, icon: Code, label: 'Raw' }
  ];

<<<<<<< HEAD
  return (
    <div className={`bg-white rounded-lg border ${getMessageBorderColor()} shadow-sm ${className}`}>
      {/* Message Header */}
      <div className="flex items-center justify-between p-4 border-b border-gray-200">
        <div className="flex items-center space-x-3">
          {getMessageIcon()}
          <div>
            <div className="font-medium text-gray-900 capitalize">
              {message.sender}
            </div>
            <div className="text-xs text-gray-500 flex items-center space-x-2">
              <Clock className="w-3 h-3" />
              <span>{message.timestamp.toLocaleTimeString()}</span>
            </div>
          </div>
        </div>

        <div className="flex items-center space-x-2">
          {/* View Mode Toggle */}
          {message.structured_data && (
            <div className="flex bg-gray-100 rounded-lg p-1">
              {viewModeButtons.map(({ mode, icon: Icon, label }) => (
                <button
                  key={mode}
                  onClick={() => onChangeViewMode(message.id, mode)}
                  className={`
                    px-2 py-1 rounded text-xs font-medium transition-colors
                    ${viewMode === mode
                      ? 'bg-white text-gray-900 shadow-sm'
                      : 'text-gray-600 hover:text-gray-900'
                    }
                  `}
                  title={label}
                >
                  <Icon className="w-3 h-3" />
                </button>
              ))}
            </div>
          )}

          {/* Action Buttons */}
          <button
            onClick={() => onCopy(message.content)}
            className="p-1.5 text-gray-400 hover:text-gray-600 rounded transition-colors"
            title="Copy content"
          >
            <Copy className="w-4 h-4" />
          </button>

          {/* Expand/Collapse */}
          <button
            onClick={() => onToggleExpand(message.id)}
            className="p-1.5 text-gray-400 hover:text-gray-600 rounded transition-colors"
            title={isExpanded ? "Collapse" : "Expand"}
          >
            {isExpanded ? (
              <ChevronUp className="w-4 h-4" />
            ) : (
              <ChevronDown className="w-4 h-4" />
            )}
          </button>
        </div>
      </div>

      {/* Natural Query (for user messages) */}
      {message.natural_query && (
        <div className="px-4 py-2 bg-blue-50 border-b border-blue-200">
          <div className="text-xs font-medium text-blue-700 mb-1">Natural Query:</div>
          <div className="text-sm text-blue-900">{message.natural_query}</div>
        </div>
      )}

      {/* Translated Query (for assistant messages) */}
      {message.translated_query && (
        <div className="px-4 py-2 bg-gray-50 border-b border-gray-200">
          <div className="flex items-center justify-between mb-1">
            <div className="text-xs font-medium text-gray-700">Translated Query:</div>
            {onEditMessage && (
              <button
                onClick={() => setIsEditing(!isEditing)}
                className="p-1 text-gray-400 hover:text-gray-600 rounded transition-colors"
                title="Edit query"
              >
                <Edit3 className="w-3 h-3" />
=======
  // Determine if this is a welcome/system message (should be centered)
  const isWelcomeMessage = message.sender === 'system' || message.id === 'welcome';
  
  // Chat bubble layout: user messages on right, assistant/system on left
  const isUserMessage = message.sender === 'user';
  
  if (isWelcomeMessage) {
    // Welcome message - centered card style
    return (
      <div className={`flex justify-center ${className}`}>
        <div className="max-w-2xl w-full bg-black/40 backdrop-blur-md rounded-lg border-2 border-corporate-accentPrimary/40 p-6">
          <div className="flex items-center justify-center mb-4">
            {getMessageIcon()}
          </div>
          <div className="prose prose-sm max-w-none text-corporate-textPrimary">
            <div dangerouslySetInnerHTML={{ __html: message.content.replace(/\n/g, '<br>') }} />
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className={`flex ${isUserMessage ? 'justify-end' : 'justify-start'} mb-4 group ${className}`}>
      <div className={`flex ${isUserMessage ? 'flex-row-reverse' : 'flex-row'} items-start gap-3 max-w-3xl w-full`}>
        {/* Avatar */}
        <div className={`flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center ${
          isUserMessage 
            ? 'bg-corporate-accentPrimary/80 border-2 border-corporate-accentPrimary/40' 
            : 'bg-corporate-success/20 border-2 border-corporate-success/40'
        }`}>
          {getMessageIcon(true)}
        </div>

        {/* Message Bubble */}
        <div className={`flex-1 ${isUserMessage ? 'items-end' : 'items-start'} flex flex-col`}>
          <div className={`rounded-2xl px-4 py-3 ${
            isUserMessage
              ? 'bg-corporate-accentPrimary text-white rounded-br-sm shadow-lg shadow-corporate-accentPrimary/20'
              : 'bg-black/70 backdrop-blur-md border-2 border-corporate-success/30 text-white rounded-bl-sm shadow-lg shadow-corporate-success/10'
          }`}>
            {/* Message Content */}
            <div className={`prose prose-base max-w-none ${
              isUserMessage 
                ? 'prose-invert prose-headings:text-white prose-p:text-white prose-strong:text-white prose-em:text-white prose-code:text-white prose-pre:text-white prose-a:text-white/90' 
                : 'prose-invert prose-headings:text-white prose-p:text-white prose-strong:text-white prose-em:text-white prose-code:text-white prose-pre:text-white prose-a:text-white/90'
            }`}>
              {renderContent()}
            </div>

            {/* Timestamp */}
            <div className={`text-xs mt-2 ${
              isUserMessage ? 'text-white/90' : 'text-white/70'
            }`}>
              {message.timestamp.toLocaleTimeString()}
            </div>
          </div>

          {/* Action Buttons - Only show on hover or when expanded */}
          <div className={`flex items-center gap-2 mt-1 group ${isUserMessage ? 'flex-row-reverse' : 'flex-row'}`}>
            {/* View Mode Toggle - Only for assistant messages with structured data */}
            {!isUserMessage && message.structured_data && (
              <div className="flex bg-black/40 rounded-lg p-1 border border-corporate-borderPrimary/40">
                {viewModeButtons.map(({ mode, icon: Icon, label }) => (
                  <button
                    key={mode}
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      onChangeViewMode(message.id, mode);
                    }}
                    className={`
                      px-2 py-1 rounded text-xs font-medium transition-colors cursor-pointer
                      ${viewMode === mode
                        ? 'bg-corporate-accentPrimary/40 text-corporate-accentPrimary shadow-sm'
                        : 'text-corporate-textTertiary hover:text-corporate-textSecondary'
                      }
                    `}
                    title={label}
                  >
                    <Icon className="w-3 h-3" />
                  </button>
                ))}
              </div>
            )}

            {/* Copy Button */}
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                onCopy(message.content);
              }}
              className="p-1.5 text-corporate-textSecondary hover:text-corporate-accentPrimary rounded transition-colors cursor-pointer opacity-70 hover:opacity-100"
              title="Copy content"
            >
              <Copy className="w-3 h-3" />
            </button>

            {/* Expand/Collapse - Only for assistant messages */}
            {!isUserMessage && message.query_metadata && (
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  onToggleExpand(message.id);
                }}
                className="p-1.5 text-corporate-textSecondary hover:text-corporate-accentPrimary rounded transition-colors cursor-pointer opacity-70 hover:opacity-100"
                title={isExpanded ? "Collapse" : "Expand"}
              >
                {isExpanded ? (
                  <ChevronUp className="w-3 h-3" />
                ) : (
                  <ChevronDown className="w-3 h-3" />
                )}
>>>>>>> 001-modify-analyzer-method
              </button>
            )}
          </div>

<<<<<<< HEAD
          {isEditing ? (
            <div className="space-y-2">
              <textarea
                value={editedQuery}
                onChange={(e) => setEditedQuery(e.target.value)}
                className="w-full p-2 text-sm border border-gray-300 rounded resize-none"
                rows={3}
              />
              <div className="flex space-x-2">
                <button
                  onClick={handleSaveEdit}
                  className="px-2 py-1 bg-green-600 text-white text-xs rounded hover:bg-green-700 transition-colors flex items-center space-x-1"
                >
                  <Save className="w-3 h-3" />
                  <span>Save</span>
                </button>
                <button
                  onClick={handleCancelEdit}
                  className="px-2 py-1 bg-gray-600 text-white text-xs rounded hover:bg-gray-700 transition-colors flex items-center space-x-1"
                >
                  <X className="w-3 h-3" />
                  <span>Cancel</span>
                </button>
              </div>
            </div>
          ) : (
            <div className="text-sm text-gray-900 font-mono bg-white p-2 rounded border">
              {message.translated_query}
            </div>
          )}
        </div>
      )}

      {/* Message Content */}
      <div className="p-4">
        {renderContent()}
      </div>

      {/* Query Metadata (expanded view) */}
      {isExpanded && message.query_metadata && (
        <div className="px-4 pb-4 border-t border-gray-200">
          <div className="text-xs font-medium text-gray-700 mb-2 mt-3">Query Metadata:</div>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-xs">
            {message.query_metadata.execution_time && (
              <div className="flex items-center space-x-1">
                <Clock className="w-3 h-3 text-gray-400" />
                <span className="text-gray-600">Time:</span>
                <span className="font-medium">{message.query_metadata.execution_time}ms</span>
              </div>
            )}

            {message.query_metadata.result_count !== undefined && (
              <div className="flex items-center space-x-1">
                <Database className="w-3 h-3 text-gray-400" />
                <span className="text-gray-600">Results:</span>
                <span className="font-medium">{message.query_metadata.result_count}</span>
              </div>
            )}

            {message.query_metadata.confidence && (
              <div className="flex items-center space-x-1">
                <TrendingUp className="w-3 h-3 text-gray-400" />
                <span className="text-gray-600">Confidence:</span>
                <span className="font-medium">{(message.query_metadata.confidence * 100).toFixed(1)}%</span>
              </div>
            )}

            {message.query_metadata.sources && message.query_metadata.sources.length > 0 && (
              <div className="flex items-center space-x-1">
                <Database className="w-3 h-3 text-gray-400" />
                <span className="text-gray-600">Sources:</span>
                <span className="font-medium">{message.query_metadata.sources.length}</span>
              </div>
            )}
          </div>

          {/* Sources List */}
          {isExpanded && message.query_metadata.sources && message.query_metadata.sources.length > 0 && (
            <div className="mt-3">
              <div className="text-xs font-medium text-gray-700 mb-1">Sources:</div>
              <div className="space-y-1">
                {message.query_metadata.sources.slice(0, 3).map((source, index) => (
                  <div key={index} className="text-xs text-gray-600 bg-gray-50 p-1 rounded">
                    {typeof source === 'string' ? source : JSON.stringify(source)}
                  </div>
                ))}
                {message.query_metadata.sources.length > 3 && (
                  <div className="text-xs text-gray-500">
                    ... and {message.query_metadata.sources.length - 3} more sources
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      )}
=======
          {/* Expanded Metadata Section - Only for assistant messages */}
          {!isUserMessage && isExpanded && message.query_metadata && (
            <div className={`mt-3 p-3 rounded-lg border-2 border-corporate-borderPrimary/40 bg-black/40 backdrop-blur-md`}>
              <div className="text-xs font-medium text-corporate-textSecondary mb-2">Query Metadata:</div>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-xs mb-3">
                {message.query_metadata.execution_time && (
                  <div className="flex items-center space-x-1">
                    <Clock className="w-3 h-3 text-corporate-textTertiary" />
                    <span className="text-corporate-textTertiary">Time:</span>
                    <span className="font-medium text-corporate-textPrimary">{message.query_metadata.execution_time}ms</span>
                  </div>
                )}

                {message.query_metadata.result_count !== undefined && (
                  <div className="flex items-center space-x-1">
                    <Database className="w-3 h-3 text-corporate-textTertiary" />
                    <span className="text-corporate-textTertiary">Results:</span>
                    <span className="font-medium text-corporate-textPrimary">{message.query_metadata.result_count}</span>
                  </div>
                )}

                {message.query_metadata.confidence && (
                  <div className="flex items-center space-x-1">
                    <TrendingUp className="w-3 h-3 text-corporate-textTertiary" />
                    <span className="text-corporate-textTertiary">Confidence:</span>
                    <span className="font-medium text-corporate-textPrimary">{(message.query_metadata.confidence * 100).toFixed(1)}%</span>
                  </div>
                )}

                {message.query_metadata.sources && message.query_metadata.sources.length > 0 && (
                  <div className="flex items-center space-x-1">
                    <Database className="w-3 h-3 text-corporate-textTertiary" />
                    <span className="text-corporate-textTertiary">Sources:</span>
                    <span className="font-medium text-corporate-textPrimary">{message.query_metadata.sources.length}</span>
                  </div>
                )}
              </div>

              {/* Sources List */}
              {message.query_metadata.sources && message.query_metadata.sources.length > 0 && (
                <div className="mt-3">
                  <div className="text-xs font-medium text-corporate-textSecondary mb-1">Sources:</div>
                  <div className="space-y-2">
                    {message.query_metadata.sources.slice(0, 5).map((source: any, index: number) => (
                      <div key={index} className="text-xs bg-black/40 backdrop-blur-md border-2 border-corporate-borderPrimary/40 p-2 rounded">
                        <div className="font-medium text-corporate-textPrimary mb-1">
                          {source.source_name || source.source_type || `Source ${index + 1}`}
                        </div>
                        <div className="text-corporate-textTertiary mb-1">
                          {source.content?.substring(0, 150)}{source.content?.length > 150 ? '...' : ''}
                        </div>
                        <div className="flex items-center space-x-3 text-corporate-textTertiary">
                          <span>Score: {(source.similarity_score * 100).toFixed(1)}%</span>
                          {source.source_type === 'investigation_results' && source.metadata?.investigation_id && (
                            <span>Investigation: {source.metadata.investigation_id}</span>
                          )}
                        </div>
                      </div>
                    ))}
                    {message.query_metadata.sources.length > 5 && (
                      <div className="text-xs text-corporate-textTertiary">
                        ... and {message.query_metadata.sources.length - 5} more sources
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* Citations */}
              {message.query_metadata.citations && message.query_metadata.citations.length > 0 && (
                <div className="mt-3">
                  <div className="text-xs font-medium text-corporate-textSecondary mb-1">Citations:</div>
                  <div className="space-y-1">
                    {message.query_metadata.citations.map((citation: any, index: number) => (
                      <div key={index} className="text-xs text-corporate-accentPrimary hover:text-corporate-accentSecondary cursor-pointer bg-corporate-accentPrimary/20 border-2 border-corporate-accentPrimary/40 p-1 rounded">
                        <span className="font-medium">{citation.source_name}</span>
                        {citation.investigation_id && (
                          <span className="text-corporate-textTertiary ml-2">(Investigation: {citation.investigation_id})</span>
                        )}
                        <span className="text-corporate-textTertiary ml-2">Score: {(citation.similarity_score * 100).toFixed(1)}%</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
>>>>>>> 001-modify-analyzer-method
    </div>
  );
};

export default MessageViewer;