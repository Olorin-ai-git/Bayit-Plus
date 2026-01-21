/**
 * Voice Status Overlay Component
 * Minimal voice feedback UI for Voice Only mode
 * Shows: listening indicator, transcript preview, processing status
 * Auto-hides after response completes
 */

import React, { useEffect } from 'react';
import { SoundwaveVisualizer } from './SoundwaveVisualizer';
import { colors, spacing, borderRadius } from '../theme';

interface VoiceStatusOverlayProps {
  isListening: boolean;
  isProcessing: boolean;
  isSpeaking: boolean;
  currentTranscript?: string;
  autoHideDuration?: number; // ms to auto-hide after speaking completes
  onAutoHide?: () => void;
}

export function VoiceStatusOverlay({
  isListening,
  isProcessing,
  isSpeaking,
  currentTranscript = '',
  autoHideDuration = 3000,
  onAutoHide,
}: VoiceStatusOverlayProps) {
  const isActive = isListening || isProcessing || isSpeaking;

  // Auto-hide after speaking completes
  useEffect(() => {
    if (isSpeaking) {
      const hideTimer = setTimeout(() => {
        onAutoHide?.();
      }, autoHideDuration);

      return () => clearTimeout(hideTimer);
    }
  }, [isSpeaking, autoHideDuration, onAutoHide]);

  if (!isActive) {
    return null;
  }

  return (
    <div style={styles.container as any}>
      <style>{`
        @keyframes pulse {
          0%, 100% { opacity: 0.3; transform: scale(0.8); }
          50% { opacity: 1; transform: scale(1); }
        }
        @keyframes pulse-ring {
          0%, 100% { opacity: 0.5; transform: scale(1); }
          50% { opacity: 0; transform: scale(1.4); }
        }
        .processing-dot-animated {
          animation: pulse 1.5s ease-in-out infinite;
        }
        .processing-ring {
          position: absolute;
          width: 100%;
          height: 100%;
          border: 2px solid rgba(168, 85, 247, 0.6);
          border-radius: 50%;
          animation: pulse-ring 1.5s ease-in-out infinite;
        }
      `}</style>
      <div style={styles.overlay as any}>
        {/* Visual Indicator Section */}
        <div style={styles.indicatorSection as any}>
          {isListening && (
            <div style={styles.contentWrapper as any}>
              <div style={styles.visualizerContainer as any}>
                <SoundwaveVisualizer
                  audioLevel={0.6}
                  isListening={true}
                  isProcessing={false}
                  isSendingToServer={false}
                  compact={true}
                />
              </div>
              <div style={styles.statusText as any}>Listening...</div>
            </div>
          )}

          {isProcessing && (
            <div style={styles.contentWrapper as any}>
              <div style={styles.processingIndicator as any}>
                <div className="processing-ring" />
                <div style={styles.processingDot as any} className="processing-dot-animated" />
              </div>
              <div style={styles.statusText as any}>Processing...</div>
            </div>
          )}

          {isSpeaking && (
            <div style={styles.contentWrapper as any}>
              <div style={styles.visualizerContainer as any}>
                <SoundwaveVisualizer
                  audioLevel={0.7}
                  isListening={false}
                  isProcessing={false}
                  isSendingToServer={false}
                  compact={true}
                />
              </div>
              <div style={styles.statusText as any}>Speaking...</div>
            </div>
          )}
        </div>

        {/* Transcript Section */}
        {currentTranscript && (
          <div style={styles.transcriptSection as any}>
            <div style={styles.transcriptLabel as any}>You said:</div>
            <div style={styles.transcriptText as any}>
              {currentTranscript}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}


const styles = {
  container: {
    position: 'fixed',
    bottom: spacing.lg,
    left: 0,
    right: 0,
    display: 'flex',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 40,
    pointerEvents: 'none' as any,
  },
  overlay: {
    display: 'flex',
    flexDirection: 'column' as any,
    alignItems: 'center',
    justifyContent: 'center',
    padding: `${spacing.lg}px ${spacing.xl}px`,
    minWidth: 280,
    maxWidth: '90%',
    backgroundColor: 'rgba(26, 26, 46, 0.85)',
    borderRadius: borderRadius.xl,
    border: '1px solid rgba(255, 255, 255, 0.1)',
    backdropFilter: 'blur(20px)',
  },
  indicatorSection: {
    display: 'flex',
    flexDirection: 'column' as any,
    alignItems: 'center',
    gap: spacing.sm,
  },
  contentWrapper: {
    display: 'flex',
    flexDirection: 'column' as any,
    alignItems: 'center',
    gap: spacing.sm,
  },
  visualizerContainer: {
    height: 60,
    display: 'flex',
    justifyContent: 'center',
    alignItems: 'center',
  },
  processingIndicator: {
    position: 'relative' as any,
    width: 48,
    height: 48,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
  },
  processingDot: {
    position: 'relative' as any,
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: colors.primary,
    zIndex: 1,
  },
  statusText: {
    fontSize: 14,
    color: colors.textSecondary,
    fontWeight: 500,
  },
  transcriptSection: {
    borderTop: '1px solid rgba(255, 255, 255, 0.1)',
    paddingTop: spacing.md,
    marginTop: spacing.md,
    width: '100%',
  },
  transcriptLabel: {
    fontSize: 12,
    color: colors.textMuted,
    marginBottom: spacing.xs,
    textTransform: 'uppercase' as any,
  },
  transcriptText: {
    fontSize: 14,
    color: colors.text,
    lineHeight: 20,
  },
};

export default VoiceStatusOverlay;
