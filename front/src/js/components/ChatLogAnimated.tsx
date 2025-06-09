import React, { useEffect, useRef, useState } from 'react';
import PropTypes from 'prop-types';
import { CommentMessage } from './CommentWindow';
import { ANIMATION_TIMING } from '../constants/definitions';

interface ChatLogAnimatedProps {
  messages: CommentMessage[];
  className?: string;
}

const ANIMATION_DELAY = 2500; // ms per message (record)

interface AnimatedTextProps {
  text: string;
  className?: string;
}

/**
 * Animated text that reveals one character at a time.
 * @param {AnimatedTextProps} props - The props for the AnimatedText component.
 * @returns {JSX.Element} The animated text span.
 */
const AnimatedText: React.FC<AnimatedTextProps> = ({
  text,
  className = '',
}) => {
  const [displayText, setDisplayText] = useState('');
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isAnimating, setIsAnimating] = useState(true);

  useEffect(() => {
    setDisplayText('');
    setCurrentIndex(0);
    setIsAnimating(true);
  }, [text]);

  useEffect(() => {
    if (!isAnimating) return;
    if (currentIndex < text.length) {
      const timer = setTimeout(() => {
        setDisplayText((prev) => prev + text[currentIndex]);
        setCurrentIndex((prev) => prev + 1);
      }, ANIMATION_TIMING.CHARACTER_SPEED);
      return () => clearTimeout(timer);
    }
    setIsAnimating(false);
  }, [currentIndex, text, isAnimating]);

  return <span className={className}>{displayText}</span>;
};

/**
 * Blinking caret shown after each animated chat message.
 * @returns {JSX.Element} The caret element.
 */
const Caret: React.FC = () => {
  const [isVisible, setIsVisible] = useState(true);
  useEffect(() => {
    const timer = setTimeout(
      () => setIsVisible(false),
      ANIMATION_TIMING.CARET_DURATION,
    );
    return () => clearTimeout(timer);
  }, []);
  if (!isVisible) return null;
  return (
    <span
      className="inline-block border-r-2 border-black ml-1 animate-blink"
      style={{ height: '1em' }}
    />
  );
};

/**
 * Animated chat log that reveals one message at a time with a delay.
 * @param {ChatLogAnimatedProps} props - The props for the ChatLogAnimated component.
 * @returns {JSX.Element} The animated chat log container.
 */
const ChatLogAnimated: React.FC<ChatLogAnimatedProps> = ({
  messages,
  className,
}) => {
  const [visibleCount, setVisibleCount] = useState(0);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setVisibleCount(0);
    if (!messages.length) return;
    let i = 0;
    const reveal = () => {
      setVisibleCount((v) => v + 1);
      i++;
      if (i < messages.length) {
        setTimeout(reveal, ANIMATION_DELAY);
      }
    };
    reveal();
    // Scroll to bottom as new messages appear
    return () => {};
  }, [messages]);

  useEffect(() => {
    if (containerRef.current) {
      containerRef.current.scrollTop = containerRef.current.scrollHeight;
    }
  }, [visibleCount]);

  return (
    <div
      ref={containerRef}
      className={`flex-1 overflow-y-auto ${className || ''}`}
      style={{ minHeight: 0 }}
      data-testid="chat-log-animated"
    >
      {messages.slice(0, visibleCount).map((msg) => (
        <div
          key={`${msg.timestamp ?? ''}`}
          className="mb-3 last:mb-0 animate-fade-in"
        >
          <div className="text-xs text-black-500 mb-1">
            {new Date(msg.timestamp ?? Date.now()).toLocaleDateString()}{' '}
            {new Date(msg.timestamp ?? Date.now()).toLocaleTimeString()}
          </div>
          <div className="text-xs flex items-baseline">
            <span className="font-semibold mr-1">{msg.sender ?? ''}</span>
            <AnimatedText text={msg.text ?? ''} />
            <Caret />
          </div>
        </div>
      ))}
    </div>
  );
};

ChatLogAnimated.propTypes = {
  className: PropTypes.string,
};

ChatLogAnimated.defaultProps = {
  className: '',
};

export default ChatLogAnimated;
