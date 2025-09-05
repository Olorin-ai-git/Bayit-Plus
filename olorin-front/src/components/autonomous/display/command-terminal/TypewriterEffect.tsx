import React, { useState, useEffect, useCallback } from 'react';
import { TypewriterEffectProps } from '../../../../types/AutonomousDisplayTypes';

export const TypewriterEffect: React.FC<TypewriterEffectProps> = ({
  text,
  speed = 50,
  onComplete,
  className = ''
}) => {
  const [displayedText, setDisplayedText] = useState('');
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isComplete, setIsComplete] = useState(false);

  // Clean HTML tags from text for character counting
  const cleanText = React.useMemo(() => {
    return text.replace(/<[^>]*>/g, '');
  }, [text]);

  // Parse HTML and create character map
  const characterMap = React.useMemo(() => {
    const map: Array<{ char: string; html: string; isTag: boolean }> = [];
    let htmlIndex = 0;
    
    while (htmlIndex < text.length) {
      if (text[htmlIndex] === '<') {
        // Find the end of the HTML tag
        const tagEnd = text.indexOf('>', htmlIndex);
        if (tagEnd !== -1) {
          const tag = text.slice(htmlIndex, tagEnd + 1);
          map.push({ char: '', html: tag, isTag: true });
          htmlIndex = tagEnd + 1;
        } else {
          htmlIndex++;
        }
      } else {
        const char = text[htmlIndex];
        map.push({ char, html: char, isTag: false });
        htmlIndex++;
      }
    }
    
    return map;
  }, [text]);

  // Build displayed text with HTML tags
  const buildDisplayedText = useCallback((index: number) => {
    let result = '';
    let charCount = 0;
    
    for (const item of characterMap) {
      if (item.isTag) {
        result += item.html;
      } else {
        if (charCount < index) {
          result += item.html;
          charCount++;
        } else {
          break;
        }
      }
    }
    
    return result;
  }, [characterMap]);

  // Typewriter animation effect
  useEffect(() => {
    if (currentIndex < cleanText.length) {
      const timer = setTimeout(() => {
        setCurrentIndex(prev => prev + 1);
        setDisplayedText(buildDisplayedText(currentIndex + 1));
      }, speed);

      return () => clearTimeout(timer);
    } else if (!isComplete) {
      setIsComplete(true);
      onComplete?.();
    }
  }, [currentIndex, cleanText.length, speed, buildDisplayedText, isComplete, onComplete]);

  // Reset animation when text changes
  useEffect(() => {
    setCurrentIndex(0);
    setDisplayedText('');
    setIsComplete(false);
  }, [text]);

  return (
    <span className={`typewriter-text ${className}`}>
      <span dangerouslySetInnerHTML={{ __html: displayedText }} />
      {!isComplete && (
        <span className="typewriter-cursor inline-block w-2 h-5 bg-green-400 ml-1 animate-blink">
        </span>
      )}
    </span>
  );
};