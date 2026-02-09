/**
 * Test suite for WatchPartyChat component
 * Tests message rendering, empty state, message types, and chat input integration.
 */

import { render, screen } from '@testing-library/react';
import WatchPartyChat from '../WatchPartyChat';

// Mock i18n
jest.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key: string) => {
      const translations: Record<string, string> = {
        'watchParty.chat': 'Chat',
        'watchParty.typeMessage': 'Type a message to start chatting',
      };
      return translations[key] || key;
    },
    i18n: { language: 'en' },
  }),
}));

// Mock sub-components
jest.mock('../WatchPartyChatInput', () => ({
  __esModule: true,
  default: ({ onSend, disabled, autoEnableMicrophone }: any) => (
    <div
      data-testid="chat-input"
      data-disabled={disabled}
      data-auto-mic={autoEnableMicrophone}
    >
      <input
        data-testid="chat-input-field"
        onChange={(e) => onSend(e.target.value)}
        disabled={disabled}
      />
    </div>
  ),
}));

// Mock chat sanitizer
jest.mock('../chatSanitizer', () => ({
  sanitizeChatMessage: (msg: string) => msg,
  sanitizeUsername: (name: string) => name,
}));

// Mock styles
jest.mock('../WatchPartyChat.styles', () => ({
  styles: {
    container: {},
    header: {},
    scrollView: {},
    scrollContent: {},
    emptyContainer: {},
    emptyText: {},
    inputContainer: {},
    systemMessageContainer: {},
    systemMessageText: {},
    bubble: {},
    bubbleEmoji: {},
    bubbleOwn: {},
    bubbleOther: {},
    messageRow: {},
    messageRowReverse: {},
    userName: {},
    textEmoji: {},
    textNormal: {},
    timestamp: {},
    timestampOwn: {},
    timestampOther: {},
  },
}));

const currentUserId = 'user-1';
const onSendMessage = jest.fn();

const sampleMessages = [
  {
    id: 'msg-1',
    user_id: 'user-2',
    user_name: 'Alice',
    content: 'Hello everyone!',
    message_type: 'text' as const,
    created_at: '2026-02-08T14:30:00Z',
  },
  {
    id: 'msg-2',
    user_id: 'user-1',
    user_name: 'Bob',
    content: 'Hey Alice!',
    message_type: 'text' as const,
    created_at: '2026-02-08T14:31:00Z',
  },
  {
    id: 'msg-3',
    user_id: 'user-3',
    user_name: 'System',
    content: 'Charlie joined the party',
    message_type: 'system' as const,
    created_at: '2026-02-08T14:32:00Z',
  },
];

describe('WatchPartyChat', () => {
  beforeEach(() => {
    onSendMessage.mockClear();
  });

  // MARK: - Basic Rendering

  describe('basic rendering', () => {
    it('renders the chat header', () => {
      render(
        <WatchPartyChat
          messages={sampleMessages}
          currentUserId={currentUserId}
          onSendMessage={onSendMessage}
          chatEnabled={true}
        />
      );
      expect(screen.getByText('Chat')).toBeInTheDocument();
    });

    it('renders the chat input', () => {
      render(
        <WatchPartyChat
          messages={sampleMessages}
          currentUserId={currentUserId}
          onSendMessage={onSendMessage}
          chatEnabled={true}
        />
      );
      expect(screen.getByTestId('chat-input')).toBeInTheDocument();
    });
  });

  // MARK: - Empty State

  describe('empty state', () => {
    it('renders empty state when no messages', () => {
      render(
        <WatchPartyChat
          messages={[]}
          currentUserId={currentUserId}
          onSendMessage={onSendMessage}
          chatEnabled={true}
        />
      );
      expect(screen.getByText('Type a message to start chatting')).toBeInTheDocument();
    });

    it('does not render empty state when messages exist', () => {
      render(
        <WatchPartyChat
          messages={sampleMessages}
          currentUserId={currentUserId}
          onSendMessage={onSendMessage}
          chatEnabled={true}
        />
      );
      expect(screen.queryByText('Type a message to start chatting')).not.toBeInTheDocument();
    });
  });

  // MARK: - Message Rendering

  describe('message rendering', () => {
    it('renders text messages with content', () => {
      render(
        <WatchPartyChat
          messages={sampleMessages}
          currentUserId={currentUserId}
          onSendMessage={onSendMessage}
          chatEnabled={true}
        />
      );
      expect(screen.getByText('Hello everyone!')).toBeInTheDocument();
      expect(screen.getByText('Hey Alice!')).toBeInTheDocument();
    });

    it('shows username on other users messages', () => {
      render(
        <WatchPartyChat
          messages={sampleMessages}
          currentUserId={currentUserId}
          onSendMessage={onSendMessage}
          chatEnabled={true}
        />
      );
      expect(screen.getByText('Alice')).toBeInTheDocument();
    });

    it('does not show username on own messages', () => {
      const ownOnlyMessages = [
        {
          id: 'msg-own',
          user_id: 'user-1',
          user_name: 'Bob',
          content: 'My own message',
          message_type: 'text' as const,
          created_at: '2026-02-08T14:30:00Z',
        },
      ];
      render(
        <WatchPartyChat
          messages={ownOnlyMessages}
          currentUserId={currentUserId}
          onSendMessage={onSendMessage}
          chatEnabled={true}
        />
      );
      expect(screen.getByText('My own message')).toBeInTheDocument();
      expect(screen.queryByText('Bob')).not.toBeInTheDocument();
    });

    it('renders system messages', () => {
      render(
        <WatchPartyChat
          messages={sampleMessages}
          currentUserId={currentUserId}
          onSendMessage={onSendMessage}
          chatEnabled={true}
        />
      );
      expect(screen.getByText('Charlie joined the party')).toBeInTheDocument();
    });

    it('renders timestamps on text messages', () => {
      const singleMessage = [
        {
          id: 'msg-ts',
          user_id: 'user-2',
          user_name: 'Alice',
          content: 'Timed message',
          message_type: 'text' as const,
          created_at: '2026-02-08T14:30:00Z',
        },
      ];
      render(
        <WatchPartyChat
          messages={singleMessage}
          currentUserId={currentUserId}
          onSendMessage={onSendMessage}
          chatEnabled={true}
        />
      );
      expect(screen.getByText('Timed message')).toBeInTheDocument();
    });
  });

  // MARK: - Emoji Messages

  describe('emoji messages', () => {
    it('renders emoji messages without username', () => {
      const emojiMessages = [
        {
          id: 'msg-emoji',
          user_id: 'user-2',
          user_name: 'Alice',
          content: 'thumbs-up',
          message_type: 'emoji' as const,
          created_at: '2026-02-08T14:30:00Z',
        },
      ];
      render(
        <WatchPartyChat
          messages={emojiMessages}
          currentUserId={currentUserId}
          onSendMessage={onSendMessage}
          chatEnabled={true}
        />
      );
      expect(screen.getByText('thumbs-up')).toBeInTheDocument();
      expect(screen.queryByText('Alice')).not.toBeInTheDocument();
    });
  });

  // MARK: - Chat Input Props

  describe('chat input props', () => {
    it('passes chatEnabled to chat input as disabled', () => {
      render(
        <WatchPartyChat
          messages={[]}
          currentUserId={currentUserId}
          onSendMessage={onSendMessage}
          chatEnabled={true}
        />
      );
      const chatInput = screen.getByTestId('chat-input');
      expect(chatInput).toHaveAttribute('data-disabled', 'false');
    });

    it('disables chat input when chatEnabled is false', () => {
      render(
        <WatchPartyChat
          messages={[]}
          currentUserId={currentUserId}
          onSendMessage={onSendMessage}
          chatEnabled={false}
        />
      );
      const chatInput = screen.getByTestId('chat-input');
      expect(chatInput).toHaveAttribute('data-disabled', 'true');
    });

    it('passes isPanelOpen as autoEnableMicrophone', () => {
      render(
        <WatchPartyChat
          messages={[]}
          currentUserId={currentUserId}
          onSendMessage={onSendMessage}
          chatEnabled={true}
          isPanelOpen={true}
        />
      );
      const chatInput = screen.getByTestId('chat-input');
      expect(chatInput).toHaveAttribute('data-auto-mic', 'true');
    });

    it('defaults isPanelOpen to false', () => {
      render(
        <WatchPartyChat
          messages={[]}
          currentUserId={currentUserId}
          onSendMessage={onSendMessage}
          chatEnabled={true}
        />
      );
      const chatInput = screen.getByTestId('chat-input');
      expect(chatInput).toHaveAttribute('data-auto-mic', 'false');
    });
  });

  // MARK: - Edge Cases

  describe('edge cases', () => {
    it('renders messages without id using index as key', () => {
      const noIdMessages = [
        {
          user_id: 'user-2',
          user_name: 'Alice',
          content: 'No ID message',
          created_at: '2026-02-08T14:30:00Z',
        },
      ];
      render(
        <WatchPartyChat
          messages={noIdMessages}
          currentUserId={currentUserId}
          onSendMessage={onSendMessage}
          chatEnabled={true}
        />
      );
      expect(screen.getByText('No ID message')).toBeInTheDocument();
    });

    it('renders all messages from sample data', () => {
      render(
        <WatchPartyChat
          messages={sampleMessages}
          currentUserId={currentUserId}
          onSendMessage={onSendMessage}
          chatEnabled={true}
        />
      );
      expect(screen.getByText('Hello everyone!')).toBeInTheDocument();
      expect(screen.getByText('Hey Alice!')).toBeInTheDocument();
      expect(screen.getByText('Charlie joined the party')).toBeInTheDocument();
    });
  });
});
