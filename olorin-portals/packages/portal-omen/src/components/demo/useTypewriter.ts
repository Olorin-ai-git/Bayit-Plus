import { useState, useEffect } from 'react';
import { ANIMATION_CONFIG } from '../../config/animation.config';

export const useTypewriter = (text: string, trigger: boolean) => {
  const [displayText, setDisplayText] = useState('');

  useEffect(() => {
    if (!trigger) {
      setDisplayText('');
      return;
    }

    let i = 0;
    const interval = setInterval(() => {
      if (i < text.length) {
        setDisplayText(text.slice(0, i + 1));
        i++;
      } else {
        clearInterval(interval);
      }
    }, ANIMATION_CONFIG.wizard.typewriterMs);

    return () => clearInterval(interval);
  }, [text, trigger]);

  return displayText;
};
