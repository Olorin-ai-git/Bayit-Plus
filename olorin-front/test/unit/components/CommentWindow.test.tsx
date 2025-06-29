import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import '@testing-library/jest-dom';
import ChatWindow from 'src/js/components/CommentWindow';

describe('CommentWindow', () => {
  let baseProps: any;
  beforeEach(() => {
    baseProps = {
      messages: [
        { id: 1, text: 'Hello', sender: 'user', timestamp: Date.now() },
        { id: 2, text: 'Hi', sender: 'bot', timestamp: Date.now() },
      ],
      onSend: jest.fn(),
      title: 'Comment',
      sender: 'user',
    };
  });

  it('renders messages', () => {
    render(<ChatWindow {...baseProps} />);
    expect(screen.getByText('Hello')).toBeInTheDocument();
    expect(screen.getByText('Hi')).toBeInTheDocument();
  });

  it('calls onSend when sending a message', () => {
    render(<ChatWindow {...baseProps} />);
    const input = screen.getByPlaceholderText(`Type a comment as user...`);
    fireEvent.change(input, { target: { value: 'Test message' } });
    const sendBtn = screen.getByTitle('Send message');
    fireEvent.click(sendBtn);
    expect(baseProps.onSend).toHaveBeenCalledWith('Test message');
  });

  it('handles empty messages array', () => {
    render(<ChatWindow {...baseProps} messages={[]} />);
    expect(
      screen.getByPlaceholderText(`Type a comment as user...`),
    ).toBeInTheDocument();
  });

  it('does not call onSend for empty input', () => {
    render(<ChatWindow {...baseProps} />);
    const sendBtn = screen.getByTitle('Send message');
    fireEvent.click(sendBtn);
    expect(baseProps.onSend).not.toHaveBeenCalled();
  });

  it('does not call onSend for whitespace-only input', () => {
    render(<ChatWindow {...baseProps} />);
    const input = screen.getByPlaceholderText(`Type a comment as user...`);
    fireEvent.change(input, { target: { value: '   ' } });
    const sendBtn = screen.getByTitle('Send message');
    fireEvent.click(sendBtn);
    expect(baseProps.onSend).not.toHaveBeenCalled();
  });

  it('handles input focus and blur', () => {
    render(<ChatWindow {...baseProps} />);
    const input = screen.getByPlaceholderText(`Type a comment as user...`);
    input.focus();
    expect(input).toHaveFocus();
    input.blur();
    expect(input).not.toHaveFocus();
  });

  it('calls onSend rapidly for multiple messages', () => {
    render(<ChatWindow {...baseProps} />);
    const input = screen.getByPlaceholderText(`Type a comment as user...`);
    const sendBtn = screen.getByTitle('Send message');
    for (let i = 0; i < 3; i++) {
      fireEvent.change(input, { target: { value: `msg${i}` } });
      fireEvent.click(sendBtn);
    }
    expect(baseProps.onSend).toHaveBeenCalledTimes(3);
  });
});
