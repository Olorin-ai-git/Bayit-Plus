import React, { useEffect, useRef, useState } from 'react';
import PropTypes from 'prop-types';
import { Box, Typography, useTheme, keyframes } from '@mui/material';
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

const blink = keyframes`
  0%, 100% { opacity: 1; }
  50% { opacity: 0; }
`;

const fadeIn = keyframes`
  from { opacity: 0; transform: translateY(10px); }
  to { opacity: 1; transform: translateY(0); }
`;

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
  const theme = useTheme();
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
    <Box
      component="span"
      sx={{
        display: 'inline-block',
        width: '2px',
        height: '1em',
        backgroundColor: theme.palette.text.primary,
        ml: 0.5,
        animation: `${blink} 1s step-end infinite`,
      }}
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
  className = '',
}) => {
  const theme = useTheme();
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
    <Box
      ref={containerRef}
      className={className}
      sx={{
        flex: 1,
        overflowY: 'auto',
        minHeight: 0,
        pr: 1,
      }}
      data-testid="chat-log-animated"
    >
      {messages.slice(0, visibleCount).map((msg) => (
        <Box
          key={`${msg.timestamp ?? ''}`}
          sx={{
            mb: 1.5,
            '&:last-child': { mb: 0 },
            animation: `${fadeIn} 0.3s ease-out`,
          }}
        >
          <Typography
            variant="caption"
            sx={{
              color: theme.palette.text.secondary,
              display: 'block',
              mb: 0.5,
            }}
          >
            {new Date(msg.timestamp ?? Date.now()).toLocaleDateString()}{' '}
            {new Date(msg.timestamp ?? Date.now()).toLocaleTimeString()}
          </Typography>
          <Box sx={{ display: 'flex', alignItems: 'baseline' }}>
            <Typography
              component="span"
              variant="caption"
              sx={{ fontWeight: 600, mr: 0.5 }}
            >
              {msg.sender ?? ''}
            </Typography>
            <Typography component="span" variant="caption">
              <AnimatedText text={msg.text ?? ''} />
            </Typography>
            <Caret />
          </Box>
        </Box>
      ))}
    </Box>
  );
};

ChatLogAnimated.propTypes = {
  className: PropTypes.string,
};

export default ChatLogAnimated;
