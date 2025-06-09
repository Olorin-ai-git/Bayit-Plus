import React, { useState } from 'react';

/**
 * Represents a single comment message in the chat window.
 */
export interface CommentMessage {
  sender: string;
  text: string;
  timestamp: number;
  investigationId: string;
  entityId: string;
  entityType: string;
}

/**
 * Props for the ChatWindow component.
 */
interface ChatWindowProps {
  title: string;
  messages: CommentMessage[];
  onSend: (text: string) => void;
  sender: string;
  /** Optional prefix to prepend to the text */
  prefix?: string;
}

/**
 * ChatWindow component for displaying and sending chat messages.
 * @param {ChatWindowProps} props - The chat window props
 * @returns {JSX.Element} The rendered chat window
 */
const ChatWindow: React.FC<ChatWindowProps> = ({
  title,
  messages,
  onSend,
  sender,
  prefix = '',
}) => {
  const [input, setInput] = useState('');

  /**
   * Handles sending a message if input is not empty.
   * @returns {void}
   */
  const handleSend = () => {
    const trimmed = input.trim();
    if (trimmed) {
      onSend(`${prefix}${trimmed}`);
      setInput('');
    }
    return undefined;
  };

  return (
    <div className="bg-white border rounded-lg shadow-md p-4 w-full h-64 flex flex-col">
      <div className="font-bold mb-2">{title}</div>
      <div className="flex-1 overflow-y-auto mb-2 border p-1 rounded bg-gray-50">
        {messages.map((msg) => (
          <div
            key={`${msg.timestamp}-${msg.sender}-${msg.text}`}
            className="mb-1"
          >
            <span className="font-semibold">{msg.sender}:</span> {msg.text}
            <span className="text-xs text-gray-400 ml-2">
              {new Date(msg.timestamp).toLocaleTimeString()}
            </span>
          </div>
        ))}
      </div>
      <div className="flex gap-1">
        <input
          className="flex-1 border rounded px-2 py-1 text-sm"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && handleSend()}
          placeholder={`Type a comment as ${sender}...`}
        />
        <button
          type="button"
          className="bg-blue-500 text-white px-2 py-1 rounded text-sm"
          onClick={handleSend}
          title="Send message"
        >
          Send
        </button>
      </div>
    </div>
  );
};

export default ChatWindow;
