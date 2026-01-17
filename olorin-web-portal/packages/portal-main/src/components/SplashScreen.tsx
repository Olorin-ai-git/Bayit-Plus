import React, { useEffect, useState } from 'react';

export interface SplashScreenProps {
  onComplete?: () => void;
  duration?: number;
}

/**
 * SplashScreen Component
 *
 * Displays the comprehensive Olorin.AI splash screen with wizard branding
 * on initial load, then fades out smoothly.
 *
 * @param onComplete - Callback when splash screen completes
 * @param duration - Duration in ms before fade starts (default: 2000)
 */
export const SplashScreen: React.FC<SplashScreenProps> = ({
  onComplete,
  duration = 2000,
}) => {
  const [isVisible, setIsVisible] = useState(true);
  const [isFading, setIsFading] = useState(false);

  useEffect(() => {
    // Start fade animation after duration
    const fadeTimer = setTimeout(() => {
      setIsFading(true);
    }, duration);

    // Complete and hide after fade animation
    const completeTimer = setTimeout(() => {
      setIsVisible(false);
      if (onComplete) {
        onComplete();
      }
    }, duration + 800); // 800ms fade duration

    return () => {
      clearTimeout(fadeTimer);
      clearTimeout(completeTimer);
    };
  }, [duration, onComplete]);

  if (!isVisible) {
    return null;
  }

  return (
    <div
      className={`fixed inset-0 z-50 flex items-center justify-center bg-wizard-bg-deep transition-opacity duration-800 ${
        isFading ? 'opacity-0' : 'opacity-100'
      }`}
    >
      {/* Animated background particles */}
      <div className="absolute inset-0 overflow-hidden">
        <div className="wizard-particles" />
      </div>

      {/* Splash screen image */}
      <div className="relative z-10 animate-fade-in-up">
        <img
          src={`${process.env.PUBLIC_URL}/splash/olorin-comprehensive-ai.png`}
          alt="Olorin.AI - Comprehensive AI Solutions"
          className="w-full max-w-6xl h-auto px-8"
          style={{
            filter: 'drop-shadow(0 0 40px rgba(147, 51, 234, 0.4))',
          }}
        />

        {/* Loading indicator */}
        <div className="mt-8 flex justify-center">
          <div className="flex space-x-2">
            <div className="w-3 h-3 bg-wizard-accent-purple rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
            <div className="w-3 h-3 bg-wizard-accent-purple rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
            <div className="w-3 h-3 bg-wizard-accent-purple rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
          </div>
        </div>
      </div>
    </div>
  );
};

export default SplashScreen;
