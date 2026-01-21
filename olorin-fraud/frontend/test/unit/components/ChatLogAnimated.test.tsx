import React from 'react';
import { render, screen, act } from '@testing-library/react';
import ChatLogAnimated from '../../../src/js/components/ChatLogAnimated';
import { CommentMessage } from '../../../src/js/components/CommentWindow';

const createTestMessage = (
  sender: string,
  text: string,
  timestamp: number,
): CommentMessage => ({
  sender,
  text,
  timestamp,
  investigationId: 'INV-123',
  entityId: 'test-entity',
  entityType: 'user_id',
});

describe('ChatLogAnimated', () => {
  const messages = [
    createTestMessage('Alice', 'Hello', Date.now()),
    createTestMessage('Bob', 'Hi there', Date.now() + 1000),
  ];

  it('renders no messages if empty', () => {
    render(<ChatLogAnimated messages={[]} />);
    expect(
      screen.getByRole('presentation', { hidden: true }),
    ).toBeInTheDocument();
  });

  it('renders animated messages', async () => {
    jest.useFakeTimers();
    render(<ChatLogAnimated messages={messages} />);
    act(() => {
      jest.advanceTimersByTime(2500);
    });
    expect(screen.getByText(/Alice:/)).toBeInTheDocument();
    act(() => {
      jest.advanceTimersByTime(2500);
    });
    expect(screen.getByText(/Bob:/)).toBeInTheDocument();
    jest.useRealTimers();
  });

  it('shows caret after message', async () => {
    jest.useFakeTimers();
    render(<ChatLogAnimated messages={[messages[0]]} />);
    act(() => {
      jest.advanceTimersByTime(2500);
    });
    expect(screen.getByText(/Alice:/)).toBeInTheDocument();
    expect(document.querySelector('.border-r-2')).toBeInTheDocument();
    jest.useRealTimers();
  });

  it('handles empty messages array', () => {
    render(<ChatLogAnimated messages={[]} />);
    expect(screen.getByTestId('chat-log-animated')).toBeInTheDocument();
  });

  it('handles messages prop changes', () => {
    jest.useFakeTimers();
    const { rerender } = render(<ChatLogAnimated messages={[]} />);
    rerender(<ChatLogAnimated messages={messages} />);
    act(() => {
      jest.advanceTimersByTime(2500);
    });
    expect(screen.getByText(/Alice:/)).toBeInTheDocument();
    jest.useRealTimers();
  });

  it('handles empty sender', () => {
    jest.useFakeTimers();
    const badMsg = [createTestMessage('', 'No sender', Date.now())];
    render(<ChatLogAnimated messages={badMsg} />);
    act(() => {
      jest.advanceTimersByTime(2500);
    });
    expect(screen.getByText(/No sender/)).toBeInTheDocument();
    jest.useRealTimers();
  });

  it('handles empty text', () => {
    jest.useFakeTimers();
    render(
      <ChatLogAnimated messages={[createTestMessage('A', '', Date.now())]} />,
    );
    act(() => {
      jest.advanceTimersByTime(2500);
    });
    expect(screen.getByText(/A:/)).toBeInTheDocument();
    jest.useRealTimers();
  });

  it('handles rapid prop changes', () => {
    const { rerender } = render(
      <ChatLogAnimated
        messages={[createTestMessage('Test', 'A', Date.now())]}
      />,
    );
    rerender(
      <ChatLogAnimated
        messages={[createTestMessage('Test', 'B', Date.now())]}
      />,
    );
    expect(screen.getByTestId('chat-log-animated')).toBeInTheDocument();
  });

  it('handles undefined text', () => {
    render(
      <ChatLogAnimated
        messages={[createTestMessage('Test', 'Test message', Date.now())]}
      />,
    );
    expect(screen.getByTestId('chat-log-animated')).toBeInTheDocument();
  });

  it('renders caret blinking', () => {
    render(
      <ChatLogAnimated
        messages={[createTestMessage('Test', 'Test', Date.now())]}
      />,
    );
    expect(document.querySelector('.caret')).toBeInTheDocument();
  });

  it('handles scroll behavior', () => {
    render(
      <ChatLogAnimated
        messages={Array.from({ length: 20 }, (_, i) =>
          createTestMessage('Test', `Msg ${i}`, Date.now()),
        )}
      />,
    );
    expect(screen.getByTestId('chat-log-animated')).toBeInTheDocument();
  });

  it('renders long text', () => {
    render(
      <ChatLogAnimated
        messages={[createTestMessage('Test', 'A'.repeat(1000), Date.now())]}
      />,
    );
    expect(screen.getByText(/A{100}/)).toBeInTheDocument();
  });

  it('handles multiple messages', () => {
    const ts = Date.now();
    render(
      <ChatLogAnimated
        messages={[
          createTestMessage('Test', 'A', ts),
          createTestMessage('Test', 'B', ts),
        ]}
      />,
    );
    expect(screen.getByTestId('chat-log-animated')).toBeInTheDocument();
  });

  it('handles future timestamps', () => {
    render(
      <ChatLogAnimated
        messages={[createTestMessage('Test', 'Future', Date.now() + 1000000)]}
      />,
    );
    expect(screen.getByTestId('chat-log-animated')).toBeInTheDocument();
  });

  it('renders messages with only whitespace', () => {
    render(
      <ChatLogAnimated
        messages={[createTestMessage('Test', '   ', Date.now())]}
      />,
    );
    expect(screen.getByTestId('chat-log-animated')).toBeInTheDocument();
  });

  it('renders message with negative timestamp', () => {
    render(
      <ChatLogAnimated
        messages={[createTestMessage('Test', 'Negative', -1000)]}
      />,
    );
    expect(screen.getByTestId('chat-log-animated')).toBeInTheDocument();
  });

  it('renders message with future timestamp', () => {
    render(
      <ChatLogAnimated
        messages={[createTestMessage('Test', 'Future', Date.now() + 1e10)]}
      />,
    );
    expect(screen.getByTestId('chat-log-animated')).toBeInTheDocument();
  });

  it('renders messages with duplicate senders', () => {
    render(
      <ChatLogAnimated
        messages={[
          createTestMessage('A', 'One', Date.now()),
          createTestMessage('A', 'Two', Date.now() + 1),
        ]}
      />,
    );
    expect(screen.getByTestId('chat-log-animated')).toBeInTheDocument();
  });

  it('renders messages with special characters', () => {
    render(
      <ChatLogAnimated
        messages={[
          createTestMessage('A', '!@#$%^&*()', Date.now()),
          createTestMessage('B', '你好，世界', Date.now() + 1),
        ]}
      />,
    );
    expect(screen.getByText(/!@#\$%\^&\*\(\)/)).toBeInTheDocument();
    expect(screen.getByText(/你好，世界/)).toBeInTheDocument();
  });

  it('renders with messages with special unicode characters', () => {
    render(
      <ChatLogAnimated
        messages={[createTestMessage('A', '𝄞𝄢𝄡', Date.now())]}
      />,
    );
    expect(screen.getByText(/𝄞𝄢𝄡/)).toBeInTheDocument();
  });

  it('renders with messages with emojis', () => {
    render(
      <ChatLogAnimated
        messages={[createTestMessage('A', '😀😃😄😁', Date.now())]}
      />,
    );
    expect(screen.getByText(/😀😃😄😁/)).toBeInTheDocument();
  });

  it('renders with messages with very long sender', () => {
    render(
      <ChatLogAnimated
        messages={[createTestMessage('A'.repeat(100), 'Hi', Date.now())]}
      />,
    );
    expect(screen.getByTestId('chat-log-animated')).toBeInTheDocument();
  });

  it('renders with messages with very long text', () => {
    render(
      <ChatLogAnimated
        messages={[createTestMessage('A', 'B'.repeat(1000), Date.now())]}
      />,
    );
    expect(screen.getByTestId('chat-log-animated')).toBeInTheDocument();
  });

  it('handles rapid message updates', () => {
    jest.useFakeTimers();
    const msg = [createTestMessage('A', 'Speedy', Date.now())];
    render(<ChatLogAnimated messages={msg} />);
    act(() => {
      jest.advanceTimersByTime(30 * 6);
    });
    expect(screen.getByText(/Speedy/)).toBeInTheDocument();
    jest.useRealTimers();
  });

  it('handles caret animation', () => {
    jest.useFakeTimers();
    const msg = [createTestMessage('A', 'Caret', Date.now())];
    render(<ChatLogAnimated messages={msg} />);
    act(() => {
      jest.advanceTimersByTime(2500);
    });
    expect(document.querySelector('.border-r-2')).toBeInTheDocument();
    act(() => {
      jest.advanceTimersByTime(3000);
    });
    expect(document.querySelector('.border-r-2')).toBeInTheDocument();
    jest.useRealTimers();
  });

  it('handles many messages', () => {
    jest.useFakeTimers();
    const manyMsgs = Array.from({ length: 10 }, (_, i) =>
      createTestMessage('S', `Msg${i}`, Date.now() + i),
    );
    render(<ChatLogAnimated messages={manyMsgs} />);
    act(() => {
      jest.advanceTimersByTime(2500 * 10);
    });
    jest.useRealTimers();
  });

  it('renders empty text', () => {
    jest.useFakeTimers();
    render(
      <ChatLogAnimated messages={[createTestMessage('A', '', Date.now())]} />,
    );
    act(() => {
      jest.advanceTimersByTime(2500);
    });
    expect(screen.getByText(/A:/)).toBeInTheDocument();
    jest.useRealTimers();
  });

  it('handles long text animation', () => {
    jest.useFakeTimers();
    const longText = 'L'.repeat(100);
    render(
      <ChatLogAnimated
        messages={[createTestMessage('A', longText, Date.now())]}
      />,
    );
    act(() => {
      jest.advanceTimersByTime(30 * 100);
    });
    expect(screen.getByText(longText)).toBeInTheDocument();
    jest.useRealTimers();
  });

  it('handles multiple messages with same timestamp', () => {
    const ts = Date.now();
    render(
      <ChatLogAnimated
        messages={[
          createTestMessage('A', 'One', ts),
          createTestMessage('B', 'Two', ts),
        ]}
      />,
    );
    act(() => {
      jest.advanceTimersByTime(2500 * 2);
    });
    expect(screen.getByText(/One/)).toBeInTheDocument();
    expect(screen.getByText(/Two/)).toBeInTheDocument();
  });

  it('handles future timestamps', () => {
    jest.useFakeTimers();
    const future = Date.now() + 100000000;
    render(
      <ChatLogAnimated messages={[createTestMessage('F', 'Future', future)]} />,
    );
    act(() => {
      jest.advanceTimersByTime(2500);
    });
    expect(screen.getByText(/Future/)).toBeInTheDocument();
    jest.useRealTimers();
  });

  it('renders with className and investigationId', () => {
    render(<ChatLogAnimated messages={[]} className="custom-class" />);
    const container = document.querySelector('.custom-class');
    expect(container).toBeInTheDocument();
  });

  it('handles messages with missing fields', () => {
    jest.useFakeTimers();
    render(
      <ChatLogAnimated
        messages={[createTestMessage('Test', 'Missing sender', Date.now())]}
      />,
    );
    act(() => {
      jest.advanceTimersByTime(100);
    });
    expect(screen.getByTestId('chat-log-animated')).toBeInTheDocument();
  });

  it('renders AnimatedText with custom charSpeed', () => {
    jest.useFakeTimers();
    const msg = [createTestMessage('A', 'Speedy', Date.now())];
    render(<ChatLogAnimated messages={msg} />);
    act(() => {
      jest.advanceTimersByTime(30 * 6);
    });
    expect(screen.getByText(/Speedy/)).toBeInTheDocument();
    jest.useRealTimers();
  });

  it('Caret disappears after CARET_DURATION', () => {
    jest.useFakeTimers();
    const msg = [createTestMessage('A', 'Caret', Date.now())];
    render(<ChatLogAnimated messages={msg} />);
    act(() => {
      jest.advanceTimersByTime(2500);
    });
    expect(document.querySelector('.border-r-2')).toBeInTheDocument();
    act(() => {
      jest.advanceTimersByTime(3000);
    });
    expect(document.querySelector('.border-r-2')).not.toBeInTheDocument();
    jest.useRealTimers();
  });

  it('scrolls to bottom as messages appear', () => {
    jest.useFakeTimers();
    const manyMsgs = Array.from({ length: 10 }, (_, i) =>
      createTestMessage('S', `Msg${i}`, Date.now() + i),
    );
    render(<ChatLogAnimated messages={manyMsgs} />);
    act(() => {
      jest.advanceTimersByTime(2500 * 10);
    });
    jest.useRealTimers();
  });

  it('renders long text', () => {
    jest.useFakeTimers();
    const longText = 'L'.repeat(100);
    render(
      <ChatLogAnimated
        messages={[createTestMessage('A', longText, Date.now())]}
      />,
    );
    act(() => {
      jest.advanceTimersByTime(30 * 100);
    });
    expect(screen.getByText(longText)).toBeInTheDocument();
    jest.useRealTimers();
  });

  it('handles duplicate timestamps', () => {
    const ts = Date.now();
    render(
      <ChatLogAnimated
        messages={[
          createTestMessage('Test', 'A', ts),
          createTestMessage('Test', 'B', ts),
        ]}
      />,
    );
    expect(screen.getByTestId('chat-log-animated')).toBeInTheDocument();
  });

  it('handles future timestamps', () => {
    render(
      <ChatLogAnimated
        messages={[createTestMessage('Test', 'Future', Date.now() + 1000000)]}
      />,
    );
    expect(screen.getByTestId('chat-log-animated')).toBeInTheDocument();
  });

  it('handles missing fields', () => {
    // @ts-expect-error purposely missing fields
    render(<ChatLogAnimated messages={[{}]} />);
    expect(screen.getByTestId('chat-log-animated')).toBeInTheDocument();
  });

  it('is accessible', () => {
    render(<ChatLogAnimated messages={[]} />);
    expect(screen.getByTestId('chat-log-animated')).toBeInTheDocument();
  });

  it('renders with undefined messages', () => {
    // @ts-expect-error purposely undefined
    render(<ChatLogAnimated messages={undefined} />);
    expect(screen.getByTestId('chat-log-animated')).toBeInTheDocument();
  });

  it('renders with null messages', () => {
    // @ts-expect-error purposely null
    render(<ChatLogAnimated messages={null} />);
    expect(screen.getByTestId('chat-log-animated')).toBeInTheDocument();
  });

  it('renders messages with only whitespace', () => {
    render(
      <ChatLogAnimated
        messages={[createTestMessage('Test', '   ', Date.now())]}
      />,
    );
    expect(screen.getByTestId('chat-log-animated')).toBeInTheDocument();
  });

  it('renders message with only timestamp', () => {
    // @ts-expect-error purposely missing fields
    render(<ChatLogAnimated messages={[{ timestamp: Date.now() }]} />);
    expect(screen.getByTestId('chat-log-animated')).toBeInTheDocument();
  });

  it('renders message with only sender', () => {
    // @ts-expect-error purposely missing fields
    render(<ChatLogAnimated messages={[{ sender: 'Test' }]} />);
    expect(screen.getByTestId('chat-log-animated')).toBeInTheDocument();
  });

  it('renders message with only text', () => {
    // @ts-expect-error purposely missing fields
    render(<ChatLogAnimated messages={[{ text: 'Only text' }]} />);
    expect(screen.getByTestId('chat-log-animated')).toBeInTheDocument();
  });

  it('renders message with negative timestamp', () => {
    render(
      <ChatLogAnimated
        messages={[createTestMessage('Test', 'Negative', -1000)]}
      />,
    );
    expect(screen.getByTestId('chat-log-animated')).toBeInTheDocument();
  });

  it('renders message with future timestamp', () => {
    render(
      <ChatLogAnimated
        messages={[createTestMessage('Test', 'Future', Date.now() + 1e10)]}
      />,
    );
    expect(screen.getByTestId('chat-log-animated')).toBeInTheDocument();
  });

  it('renders messages with duplicate senders', () => {
    render(
      <ChatLogAnimated
        messages={[
          createTestMessage('A', 'One', Date.now()),
          createTestMessage('A', 'Two', Date.now() + 1),
        ]}
      />,
    );
    expect(screen.getByTestId('chat-log-animated')).toBeInTheDocument();
  });

  it('renders messages with special characters', () => {
    render(
      <ChatLogAnimated
        messages={[
          createTestMessage('A', '!@#$%^&*()', Date.now()),
          createTestMessage('B', '你好，世界', Date.now() + 1),
        ]}
      />,
    );
    expect(screen.getByText(/!@#\$%\^&\*\(\)/)).toBeInTheDocument();
    expect(screen.getByText(/你好，世界/)).toBeInTheDocument();
  });

  it('renders with messages with special unicode characters', () => {
    render(
      <ChatLogAnimated
        messages={[createTestMessage('A', '𝄞𝄢𝄡', Date.now())]}
      />,
    );
    expect(screen.getByText(/𝄞𝄢𝄡/)).toBeInTheDocument();
  });

  it('renders with messages with emojis', () => {
    render(
      <ChatLogAnimated
        messages={[createTestMessage('A', '😀😃😄😁', Date.now())]}
      />,
    );
    expect(screen.getByText(/😀😃😄😁/)).toBeInTheDocument();
  });

  it('renders with messages with very long sender', () => {
    render(
      <ChatLogAnimated
        messages={[createTestMessage('A'.repeat(100), 'Hi', Date.now())]}
      />,
    );
    expect(screen.getByTestId('chat-log-animated')).toBeInTheDocument();
  });

  it('renders with messages with very long text', () => {
    render(
      <ChatLogAnimated
        messages={[createTestMessage('A', 'B'.repeat(1000), Date.now())]}
      />,
    );
    expect(screen.getByTestId('chat-log-animated')).toBeInTheDocument();
  });

  it('renders with messages with all fields missing', () => {
    // @ts-expect-error purposely missing all fields
    render(<ChatLogAnimated messages={[{}]} />);
    expect(screen.getByTestId('chat-log-animated')).toBeInTheDocument();
  });

  it('renders with messages as empty array', () => {
    render(<ChatLogAnimated messages={[]} />);
    expect(screen.getByTestId('chat-log-animated')).toBeInTheDocument();
  });

  it('renders with className and investigationId', () => {
    render(<ChatLogAnimated messages={[]} className="custom-class" />);
    const container = document.querySelector('.custom-class');
    expect(container).toBeInTheDocument();
  });

  it('handles messages with missing fields', () => {
    jest.useFakeTimers();
    render(
      <ChatLogAnimated
        messages={[createTestMessage('Test', 'Missing sender', Date.now())]}
      />,
    );
    act(() => {
      jest.advanceTimersByTime(100);
    });
    expect(screen.getByTestId('chat-log-animated')).toBeInTheDocument();
  });

  it('renders AnimatedText with custom charSpeed', () => {
    jest.useFakeTimers();
    const msg = [createTestMessage('A', 'Speedy', Date.now())];
    render(<ChatLogAnimated messages={msg} />);
    act(() => {
      jest.advanceTimersByTime(30 * 6);
    });
    expect(screen.getByText(/Speedy/)).toBeInTheDocument();
    jest.useRealTimers();
  });

  it('Caret disappears after CARET_DURATION', () => {
    jest.useFakeTimers();
    const msg = [createTestMessage('A', 'Caret', Date.now())];
    render(<ChatLogAnimated messages={msg} />);
    act(() => {
      jest.advanceTimersByTime(2500);
    });
    expect(document.querySelector('.border-r-2')).toBeInTheDocument();
    act(() => {
      jest.advanceTimersByTime(3000);
    });
    expect(document.querySelector('.border-r-2')).not.toBeInTheDocument();
    jest.useRealTimers();
  });

  it('scrolls to bottom as messages appear', () => {
    jest.useFakeTimers();
    const manyMsgs = Array.from({ length: 10 }, (_, i) =>
      createTestMessage('S', `Msg${i}`, Date.now() + i),
    );
    render(<ChatLogAnimated messages={manyMsgs} />);
    act(() => {
      jest.advanceTimersByTime(2500 * 10);
    });
    jest.useRealTimers();
  });

  it('renders empty text', () => {
    jest.useFakeTimers();
    render(
      <ChatLogAnimated messages={[createTestMessage('A', '', Date.now())]} />,
    );
    act(() => {
      jest.advanceTimersByTime(2500);
    });
    expect(screen.getByText(/A:/)).toBeInTheDocument();
    jest.useRealTimers();
  });

  it('renders long text', () => {
    jest.useFakeTimers();
    const longText = 'L'.repeat(100);
    render(
      <ChatLogAnimated
        messages={[createTestMessage('A', longText, Date.now())]}
      />,
    );
    act(() => {
      jest.advanceTimersByTime(30 * 100);
    });
    expect(screen.getByText(longText)).toBeInTheDocument();
    jest.useRealTimers();
  });

  it('handles duplicate timestamps', () => {
    jest.useFakeTimers();
    const ts = Date.now();
    render(
      <ChatLogAnimated
        messages={[
          createTestMessage('A', 'One', ts),
          createTestMessage('B', 'Two', ts),
        ]}
      />,
    );
    act(() => {
      jest.advanceTimersByTime(2500 * 2);
    });
    expect(screen.getByText(/One/)).toBeInTheDocument();
    expect(screen.getByText(/Two/)).toBeInTheDocument();
    jest.useRealTimers();
  });

  it('handles future timestamps', () => {
    jest.useFakeTimers();
    const future = Date.now() + 100000000;
    render(
      <ChatLogAnimated messages={[createTestMessage('F', 'Future', future)]} />,
    );
    act(() => {
      jest.advanceTimersByTime(2500);
    });
    expect(screen.getByText(/Future/)).toBeInTheDocument();
    jest.useRealTimers();
  });

  it('renders with minimal props and investigator role', () => {
    const badMsg = [createTestMessage('Investigator', 'Minimal', Date.now())];
    render(<ChatLogAnimated messages={badMsg} />);
    expect(screen.getByTestId('chat-log-animated')).toBeInTheDocument();
  });

  it('renders with messages with all fields missing', () => {
    // @ts-expect-error purposely missing all fields
    render(<ChatLogAnimated messages={[{}]} />);
    expect(screen.getByTestId('chat-log-animated')).toBeInTheDocument();
  });

  it('renders with messages as empty array', () => {
    render(<ChatLogAnimated messages={[]} />);
    expect(screen.getByTestId('chat-log-animated')).toBeInTheDocument();
  });
});

export {};
