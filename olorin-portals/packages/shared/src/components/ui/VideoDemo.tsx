/**
 * VideoDemo Component
 * Video player with features list, captions, and accessibility support
 */

import React, { useState, useRef, useEffect } from 'react';
import { VideoControls } from './VideoControls';
import { glassTokens } from '../../styles/glass-tokens';

export interface VideoDemoProps {
  videoSrc: string;
  posterSrc: string;
  captionsSrc?: string;
  title: string;
  description: string;
  features: string[];
  autoplay?: boolean;
  showControls?: boolean;
  className?: string;
}

/**
 * VideoDemo displays a video with custom controls and feature list
 *
 * @example
 * <VideoDemo
 *   videoSrc="/videos/demo.webm"
 *   posterSrc="/images/poster.webp"
 *   captionsSrc="/captions/he.vtt"
 *   title="AI Assistant Demo"
 *   description="Watch how our AI assistant helps you find content"
 *   features={['Hebrew voice search', 'Natural language', 'Smart suggestions']}
 * />
 */
export const VideoDemo: React.FC<VideoDemoProps> = ({
  videoSrc,
  posterSrc,
  captionsSrc,
  title,
  description,
  features,
  autoplay = false,
  showControls = true,
  className = '',
}) => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [isMuted, setIsMuted] = useState(autoplay);
  const [progress, setProgress] = useState(0);

  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;

    const handleTimeUpdate = () => {
      const percent = (video.currentTime / video.duration) * 100;
      setProgress(percent);
    };

    const handleEnded = () => {
      setIsPlaying(false);
    };

    video.addEventListener('timeupdate', handleTimeUpdate);
    video.addEventListener('ended', handleEnded);

    return () => {
      video.removeEventListener('timeupdate', handleTimeUpdate);
      video.removeEventListener('ended', handleEnded);
    };
  }, []);

  const togglePlay = () => {
    const video = videoRef.current;
    if (!video) return;

    if (video.paused) {
      video.play();
      setIsPlaying(true);
    } else {
      video.pause();
      setIsPlaying(false);
    }
  };

  const toggleMute = () => {
    const video = videoRef.current;
    if (!video) return;

    video.muted = !video.muted;
    setIsMuted(video.muted);
  };

  const toggleFullscreen = () => {
    const video = videoRef.current;
    if (!video) return;

    if (document.fullscreenElement) {
      document.exitFullscreen();
    } else {
      video.requestFullscreen();
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    switch (e.key) {
      case ' ':
      case 'k':
        e.preventDefault();
        togglePlay();
        break;
      case 'm':
        e.preventDefault();
        toggleMute();
        break;
      case 'f':
        e.preventDefault();
        toggleFullscreen();
        break;
    }
  };

  return (
    <div className={`${glassTokens.layers.card} rounded-2xl overflow-hidden ${className}`}>
      <div className="relative group">
        <video
          ref={videoRef}
          poster={posterSrc}
          className="w-full aspect-video object-cover"
          autoPlay={autoplay}
          muted={autoplay}
          playsInline
          webkit-playsinline="true"
          onKeyDown={handleKeyDown}
          tabIndex={0}
          aria-label={`${title} video`}
        >
          <source src={videoSrc.replace('.webm', '.mp4')} type="video/mp4" />
          <source src={videoSrc} type="video/webm" />
          {captionsSrc && (
            <track
              kind="captions"
              src={captionsSrc}
              srcLang="he"
              label="עברית"
              default
            />
          )}
        </video>

        {showControls && (
          <VideoControls
            isPlaying={isPlaying}
            isMuted={isMuted}
            progress={progress}
            onTogglePlay={togglePlay}
            onToggleMute={toggleMute}
            onToggleFullscreen={toggleFullscreen}
          />
        )}
      </div>

      <div className="p-6">
        <h3 className={`${glassTokens.text.primary} text-2xl font-bold mb-2`}>{title}</h3>
        <p className={`${glassTokens.text.secondary} mb-4`}>{description}</p>

        {features.length > 0 && (
          <ul className="space-y-2">
            {features.map((feature, index) => (
              <li
                key={index}
                className={`${glassTokens.text.secondary} flex items-start gap-2`}
              >
                <span className="text-wizard-accent-purple mt-1">✓</span>
                {feature}
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
};

export default VideoDemo;
