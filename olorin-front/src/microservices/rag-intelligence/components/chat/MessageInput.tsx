import React, { useState, useCallback } from 'react';
import { Send, Loader2, MessageSquare } from 'lucide-react';

interface MessageInputProps {
  currentMessage: string;
  setCurrentMessage: (message: string) => void;
  onSendMessage: () => Promise<void>;
  isLoading: boolean;
  placeholder?: string;
  className?: string;
}

const MessageInput: React.FC<MessageInputProps> = ({
  currentMessage,
  setCurrentMessage,
  onSendMessage,
  isLoading,
  placeholder = "Ask anything about your data...",
  className = ""
}) => {
  const [isFocused, setIsFocused] = useState(false);

  const handleSubmit = useCallback(async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentMessage.trim() || isLoading) return;

    await onSendMessage();
  }, [currentMessage, isLoading, onSendMessage]);

  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSubmit(e as any);
    }
  }, [handleSubmit]);

  const handleTextareaChange = useCallback((e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setCurrentMessage(e.target.value);

    // Auto-resize textarea
    const textarea = e.target;
    textarea.style.height = 'auto';
    textarea.style.height = `${Math.min(textarea.scrollHeight, 120)}px`;
  }, [setCurrentMessage]);

  return (
    <form onSubmit={handleSubmit} className={`relative ${className}`}>
      <div className={`
        relative flex items-end bg-black/40 backdrop-blur-md rounded-lg border-2 transition-colors duration-200
        ${isFocused ? 'border-corporate-accentPrimary ring-2 ring-corporate-accentPrimary/20' : 'border-corporate-borderPrimary/40 hover:border-corporate-accentPrimary/60'}
        ${isLoading ? 'opacity-75' : ''}
      `}>
        {/* Message Icon */}
        <div className="flex-shrink-0 p-3">
          <MessageSquare className="w-5 h-5 text-corporate-textSecondary" />
        </div>

        {/* Textarea */}
        <div className="flex-1 min-h-0">
          <textarea
            value={currentMessage}
            onChange={handleTextareaChange}
            onKeyDown={handleKeyDown}
            onFocus={() => setIsFocused(true)}
            onBlur={() => setIsFocused(false)}
            placeholder={placeholder}
            disabled={isLoading}
            rows={1}
            className="
              w-full resize-none border-0 bg-transparent py-3 px-0
              text-corporate-textPrimary placeholder-corporate-textTertiary focus:outline-none focus:ring-0
              scrollbar-thin scrollbar-thumb-corporate-borderPrimary scrollbar-track-transparent
            "
            style={{
              minHeight: '24px',
              maxHeight: '120px',
              lineHeight: '1.5'
            }}
          />
        </div>

        {/* Send Button */}
        <div className="flex-shrink-0 p-2">
          <button
            type="submit"
            disabled={!currentMessage.trim() || isLoading}
            className={`
              flex items-center justify-center w-10 h-10 rounded-lg transition-all duration-200 border-2
              ${currentMessage.trim() && !isLoading
                ? 'bg-corporate-accentPrimary/80 text-white hover:bg-corporate-accentPrimary border-corporate-accentPrimary/40 focus:ring-2 focus:ring-corporate-accentPrimary/20 shadow-sm'
                : 'bg-black/40 text-corporate-textTertiary cursor-not-allowed border-corporate-borderPrimary/40'
              }
            `}
          >
            {isLoading ? (
              <Loader2 className="w-5 h-5 animate-spin" />
            ) : (
              <Send className="w-5 h-5" />
            )}
          </button>
        </div>
      </div>

      {/* Helper Text */}
      <div className="flex justify-between items-center mt-2 px-1">
        <div className="text-xs text-corporate-textTertiary">
          Press <kbd className="px-1 py-0.5 bg-black/40 border border-corporate-borderPrimary/40 rounded text-xs text-corporate-textSecondary">Enter</kbd> to send,
          <kbd className="px-1 py-0.5 bg-black/40 border border-corporate-borderPrimary/40 rounded text-xs text-corporate-textSecondary ml-1">Shift</kbd> +
          <kbd className="px-1 py-0.5 bg-black/40 border border-corporate-borderPrimary/40 rounded text-xs text-corporate-textSecondary">Enter</kbd> for new line
        </div>

        {currentMessage.length > 0 && (
          <div className="text-xs text-corporate-textTertiary">
            {currentMessage.length} characters
          </div>
        )}
      </div>
    </form>
  );
};

export default MessageInput;