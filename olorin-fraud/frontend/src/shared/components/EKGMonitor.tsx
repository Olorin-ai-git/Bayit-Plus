/**
 * EKGMonitor Component - Canvas-based P-Q-R-S-T Waveform Visualization
 * Copied from Olorin web plugin - EXACT STYLE PRESERVED
 *
 * Displays a medical-grade EKG (electrocardiogram) waveform that responds to
 * investigation activity. The BPM (beats per minute) drives the waveform speed.
 *
 * Features:
 * - Realistic P-Q-R-S-T cardiac waveform using Gaussian curves
 * - Hardware-accelerated canvas rendering (60 FPS)
 * - Trailing glow effect with persistence fade
 * - Pre-rendered grid for crisp performance
 * - Oscilloscope-style sweep animation
 *
 * Performance:
 * - requestAnimationFrame loop for smooth 60 FPS
 * - Canvas 2D context with willReadFrequently: false for GPU acceleration
 * - Pre-rendered grid to offscreen canvas (drawn once)
 * - Minimal re-renders via refs instead of state
 */

import React, { useEffect, useRef } from 'react';

export interface EKGMonitorProps {
  /** Heart rate in beats per minute (40-200) */
  bpm: number;
  /** Canvas width in pixels */
  width?: number;
  /** Canvas height in pixels */
  height?: number;
  /** Waveform line color (hex) */
  lineColor?: string;
  /** Grid line color (hex) */
  gridColor?: string;
  /** Whether investigation is running (false shows flatline) */
  isRunning?: boolean;
}

/**
 * Draw EKG grid background with major/minor grid lines
 */
function drawGrid(
  ctx: CanvasRenderingContext2D,
  width: number,
  height: number,
  gridColor: string
): void {
  // Dark background
  ctx.fillStyle = '#06101e';
  ctx.fillRect(0, 0, width, height);

  // Grid lines
  ctx.strokeStyle = gridColor;
  ctx.lineWidth = 1;

  // Vertical lines (every 20px, major every 100px)
  for (let x = 0; x < width; x += 20) {
    ctx.globalAlpha = x % 100 === 0 ? 0.35 : 0.15;
    ctx.beginPath();
    ctx.moveTo(x + 0.5, 0);
    ctx.lineTo(x + 0.5, height);
    ctx.stroke();
  }

  // Horizontal lines (every 20px, major every 100px)
  for (let y = 0; y < height; y += 20) {
    ctx.globalAlpha = y % 100 === 0 ? 0.35 : 0.15;
    ctx.beginPath();
    ctx.moveTo(0, y + 0.5);
    ctx.lineTo(width, y + 0.5);
    ctx.stroke();
  }

  ctx.globalAlpha = 1;
}

/**
 * Calculate realistic EKG waveform using Gaussian curves for P-Q-R-S-T waves
 *
 * The waveform consists of:
 * - P wave: Atrial depolarization (small positive deflection)
 * - Q wave: Initial ventricular depolarization (small negative deflection)
 * - R wave: Main ventricular depolarization (large positive spike)
 * - S wave: Final ventricular depolarization (negative deflection)
 * - T wave: Ventricular repolarization (positive deflection)
 *
 * @param phase - Current phase within beat cycle (0-1)
 * @returns Waveform amplitude value
 */
function ekgWave(phase: number): number {
  // Gaussian function: amp * exp(-0.5 * ((x - mu) / sigma)^2)
  const gauss = (x: number, mu: number, sigma: number, amp: number): number =>
    amp * Math.exp(-0.5 * Math.pow((x - mu) / sigma, 2));

  // P wave: Atrial depolarization
  const p = gauss(phase, 0.18, 0.02, 10);

  // Q wave: Initial ventricular depolarization
  const q = gauss(phase, 0.48, 0.008, -20);

  // R wave: Main ventricular depolarization (QRS complex peak)
  const r = gauss(phase, 0.50, 0.006, 55);

  // S wave: Final ventricular depolarization
  const s = gauss(phase, 0.53, 0.01, -28);

  // T wave: Ventricular repolarization
  const t = gauss(phase, 0.80, 0.04, 18);

  // Add subtle noise for realism
  const noise = (Math.random() - 0.5) * 1.0;

  return p + q + r + s + t + noise;
}

/**
 * EKGMonitor - Canvas-based cardiac waveform display
 *
 * Performance: Wrapped with React.memo to prevent re-renders when props unchanged.
 * This is critical since canvas rendering is expensive (60 FPS animation loop).
 */
const EKGMonitorComponent: React.FC<EKGMonitorProps> = ({
  bpm = 80,
  width = 900,
  height = 180,
  lineColor = '#34f3a0',
  gridColor = '#142238',
  isRunning = true,
}) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const lastTimeRef = useRef(0);
  const phaseRef = useRef(0); // Current phase within beat (0-1)
  const sweepXRef = useRef(0); // Current x position of sweep
  const prevYRef = useRef(height / 2); // Previous y position for line drawing

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    // Set up canvas with device pixel ratio for crisp rendering
    const dpr = window.devicePixelRatio || 1;
    canvas.width = width * dpr;
    canvas.height = height * dpr;
    canvas.style.width = width + 'px';
    canvas.style.height = height + 'px';

    const ctx = canvas.getContext('2d', { willReadFrequently: false });
    if (!ctx) return;

    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

    // Pre-render grid to offscreen canvas for performance
    const gridCanvas = document.createElement('canvas');
    gridCanvas.width = width;
    gridCanvas.height = height;
    const gridCtx = gridCanvas.getContext('2d');
    if (gridCtx) {
      drawGrid(gridCtx, width, height, gridColor);
      ctx.drawImage(gridCanvas, 0, 0);
    }

    let rafId = 0;

    const animate = (timestamp: number) => {
      if (!lastTimeRef.current) {
        lastTimeRef.current = timestamp;
      }

      const dt = (timestamp - lastTimeRef.current) / 1000; // Delta time in seconds
      lastTimeRef.current = timestamp;

      // Calculate y position - flatline if not running, else EKG waveform
      let y: number;
      const yMid = height * 0.55; // Baseline position

      if (!isRunning) {
        // Flatline - investigation is dead
        y = yMid;
      } else {
        // Calculate waveform phase based on BPM
        const period = 60 / Math.max(1, bpm); // Period in seconds per beat
        phaseRef.current = (phaseRef.current + dt / period) % 1;

        // Calculate waveform y position
        const amp = height * 0.35; // Amplitude
        y = yMid - ekgWave(phaseRef.current) * (amp / 60);
      }

      // Persistence fade effect (oscilloscope trail)
      ctx.globalCompositeOperation = 'source-over';
      ctx.fillStyle = 'rgba(6,16,30,0.06)';
      ctx.fillRect(0, 0, width, height);

      // Reveal clean grid strip at sweep position
      const x = sweepXRef.current;
      const stripWidth = 2;
      if (gridCanvas) {
        ctx.drawImage(
          gridCanvas,
          x,
          0,
          stripWidth,
          height,
          x,
          0,
          stripWidth,
          height
        );
      }

      // Draw waveform with triple-layer glow (outer → mid → core)
      const prevY = prevYRef.current;
      const nextX = (x + 2) % width;

      // Outer glow layer
      ctx.save();
      ctx.shadowBlur = 18;
      ctx.shadowColor = lineColor;
      ctx.globalAlpha = 0.45;
      ctx.strokeStyle = lineColor;
      ctx.lineWidth = 4;
      ctx.lineJoin = 'round';
      ctx.lineCap = 'round';
      ctx.beginPath();
      ctx.moveTo(x, prevY);
      ctx.lineTo(nextX, y);
      ctx.stroke();
      ctx.restore();

      // Mid glow layer
      ctx.save();
      ctx.shadowBlur = 8;
      ctx.shadowColor = lineColor;
      ctx.globalAlpha = 0.65;
      ctx.strokeStyle = lineColor;
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.moveTo(x, prevY);
      ctx.lineTo(nextX, y);
      ctx.stroke();
      ctx.restore();

      // Core line
      ctx.save();
      ctx.globalAlpha = 0.95;
      ctx.strokeStyle = lineColor;
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(x, prevY);
      ctx.lineTo(nextX, y);
      ctx.stroke();
      ctx.restore();

      // Advance sweep position
      sweepXRef.current = nextX;
      prevYRef.current = y;

      // Refresh grid on wrap-around
      if (nextX < x && gridCanvas) {
        ctx.drawImage(gridCanvas, 0, 0);
      }

      rafId = requestAnimationFrame(animate);
    };

    rafId = requestAnimationFrame(animate);

    // Cleanup on unmount
    return () => {
      cancelAnimationFrame(rafId);
    };
  }, [bpm, width, height, lineColor, gridColor]);

  return <canvas ref={canvasRef} className="rounded-lg shadow-lg" />;
};

/**
 * Export memoized component
 * Performance optimization - prevent unnecessary re-renders
 */
export const EKGMonitor = React.memo(EKGMonitorComponent);
EKGMonitor.displayName = 'EKGMonitor';

export default EKGMonitor;
