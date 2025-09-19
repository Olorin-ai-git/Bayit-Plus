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
    }
  };

  const getMessageBorderColor = () => {
    switch (message.sender) {
      case 'user':
        return 'border-blue-200 bg-blue-50';
      case 'assistant':
        return 'border-green-200 bg-green-50';
      case 'system':
        return 'border-orange-200 bg-orange-50';
      default:
        return 'border-gray-200 bg-gray-50';
    }
  };

  const renderContent = () => {
    if (!message.structured_data || viewMode === 'raw') {
      return (
        <div className="prose prose-sm max-w-none">
          <pre className="whitespace-pre-wrap bg-gray-50 p-3 rounded text-sm border">
            {message.content}
          </pre>
        </div>
      );
    }

    if (viewMode === 'table' && message.structured_data) {
      return (
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200 border border-gray-200 rounded-lg">
            <thead className="bg-gray-50">
              <tr>
                {message.structured_data.columns.map((column, index) => (
                  <th
                    key={index}
                    className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider border-b"
                  >
                    {column}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {message.structured_data.data.slice(0, 10).map((row, rowIndex) => (
                <tr key={rowIndex} className="hover:bg-gray-50">
                  {message.structured_data!.columns.map((column, colIndex) => (
                    <td key={colIndex} className="px-4 py-2 text-sm text-gray-900 border-b">
                      {row[column] || '-'}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>

          {message.structured_data.data.length > 10 && (
            <div className="text-xs text-gray-500 mt-2 text-center">
              Showing 10 of {message.structured_data.data.length} records
            </div>
          )}
        </div>
      );
    }

    return (
      <div className="prose prose-sm max-w-none">
        <div dangerouslySetInnerHTML={{ __html: message.content }} />
      </div>
    );
  };

  const viewModeButtons = [
    { mode: 'enhanced' as ViewMode, icon: Eye, label: 'Enhanced' },
    { mode: 'table' as ViewMode, icon: Table, label: 'Table' },
    { mode: 'raw' as ViewMode, icon: Code, label: 'Raw' }
  ];

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
              </button>
            )}
          </div>

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
    </div>
  );
};

export default MessageViewer;