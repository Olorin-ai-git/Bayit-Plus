/**
 * Waveform Visualization Hook
 *
 * Manages canvas-based waveform rendering using Web Audio API AnalyserNode
 */

import { useRef, useEffect } from 'react';

export function useWaveform(
  canvasRef: React.RefObject<HTMLCanvasElement>,
  analyserRef: React.RefObject<AnalyserNode | null>,
  isPlaying: boolean
) {
  const animationFrameRef = useRef<number>(0);

  useEffect(() => {
    const canvas = canvasRef.current;
    const analyser = analyserRef.current;

    if (!canvas || !analyser) return;

    const canvasCtx = canvas.getContext('2d');
    if (!canvasCtx) return;

    const bufferLength = analyser.frequencyBinCount;
    const dataArray = new Uint8Array(bufferLength);

    function draw() {
      if (!canvasCtx || !analyser || !canvas) return;

      animationFrameRef.current = requestAnimationFrame(draw);

      analyser.getByteTimeDomainData(dataArray);

      // Clear canvas
      canvasCtx.fillStyle = 'rgba(0, 0, 0, 0.05)';
      canvasCtx.fillRect(0, 0, canvas.width, canvas.height);

      // Draw waveform
      canvasCtx.lineWidth = 2;
      canvasCtx.strokeStyle = 'rgba(96, 165, 250, 0.8)'; // blue-400
      canvasCtx.beginPath();

      const sliceWidth = canvas.width / bufferLength;
      let x = 0;

      for (let i = 0; i < bufferLength; i++) {
        const v = dataArray[i] / 128.0;
        const y = (v * canvas.height) / 2;

        if (i === 0) {
          canvasCtx.moveTo(x, y);
        } else {
          canvasCtx.lineTo(x, y);
        }

        x += sliceWidth;
      }

      canvasCtx.lineTo(canvas.width, canvas.height / 2);
      canvasCtx.stroke();
    }

    if (isPlaying) {
      draw();
    } else {
      // Draw flat line when not playing
      canvasCtx.fillStyle = 'rgba(0, 0, 0, 0.05)';
      canvasCtx.fillRect(0, 0, canvas.width, canvas.height);
      canvasCtx.strokeStyle = 'rgba(96, 165, 250, 0.3)';
      canvasCtx.lineWidth = 2;
      canvasCtx.beginPath();
      canvasCtx.moveTo(0, canvas.height / 2);
      canvasCtx.lineTo(canvas.width, canvas.height / 2);
      canvasCtx.stroke();
    }

    return () => {
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
    };
  }, [canvasRef, analyserRef, isPlaying]);
}
