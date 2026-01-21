import React, { useRef, useEffect, useState } from 'react';
import { useEventBus } from '../../hooks/useEventBus';

interface EKGMonitorProps {
  investigationId: string;
  width?: number;
  height?: number;
  waveformColor?: string;
  backgroundColor?: string;
  gridColor?: string;
  className?: string;
}

interface HeartbeatData {
  timestamp: number;
  value: number;
}

export function EKGMonitor({
  investigationId,
  width = 400,
  height = 150,
  waveformColor = '#10B981',
  backgroundColor = '#0B1221',
  gridColor = '#1A2332',
  className = ''
}: EKGMonitorProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [heartbeats, setHeartbeats] = useState<HeartbeatData[]>([]);
  const [isConnected, setIsConnected] = useState(false);
  const animationFrameRef = useRef<number>();
  const lastHeartbeatRef = useRef<number>(Date.now());

  useEventBus<{ data: { investigationId: string; timestamp: string; status: string } }>(
    'agent:heartbeat',
    (event) => {
      if (event.data.investigationId === investigationId) {
        const now = Date.now();
        const timeSinceLastBeat = now - lastHeartbeatRef.current;
        lastHeartbeatRef.current = now;

        const value = Math.min(100, Math.max(0, 100 - timeSinceLastBeat / 10));

        setHeartbeats(prev => [...prev.slice(-100), { timestamp: now, value }]);
        setIsConnected(true);
      }
    }
  );

  useEffect(() => {
    const checkConnection = setInterval(() => {
      const timeSinceLastBeat = Date.now() - lastHeartbeatRef.current;
      if (timeSinceLastBeat > 5000) {
        setIsConnected(false);
      }
    }, 1000);

    return () => clearInterval(checkConnection);
  }, []);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const draw = () => {
      ctx.fillStyle = backgroundColor;
      ctx.fillRect(0, 0, width, height);

      drawGrid(ctx, width, height, gridColor);
      drawWaveform(ctx, heartbeats, width, height, waveformColor);
      drawConnectionStatus(ctx, isConnected, width, height);

      animationFrameRef.current = requestAnimationFrame(draw);
    };

    draw();

    return () => {
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
    };
  }, [heartbeats, width, height, isConnected, backgroundColor, gridColor, waveformColor]);

  return (
    <div className={`ekg-monitor ${className}`}>
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-2">
          <div className={`w-2 h-2 rounded-full ${isConnected ? 'bg-green-500 animate-pulse' : 'bg-red-500'}`} />
          <span className="text-xs text-gray-400">{isConnected ? 'Connected' : 'Disconnected'}</span>
        </div>
        <span className="text-xs text-gray-500 font-mono">EKG Monitor</span>
      </div>

      <canvas
        ref={canvasRef}
        width={width}
        height={height}
        className="border border-gray-700 rounded-lg"
      />
    </div>
  );
}

function drawGrid(ctx: CanvasRenderingContext2D, width: number, height: number, gridColor: string) {
  ctx.strokeStyle = gridColor;
  ctx.lineWidth = 1;

  const gridSpacing = 20;

  for (let x = 0; x < width; x += gridSpacing) {
    ctx.beginPath();
    ctx.moveTo(x, 0);
    ctx.lineTo(x, height);
    ctx.stroke();
  }

  for (let y = 0; y < height; y += gridSpacing) {
    ctx.beginPath();
    ctx.moveTo(0, y);
    ctx.lineTo(width, y);
    ctx.stroke();
  }
}

function drawWaveform(
  ctx: CanvasRenderingContext2D,
  data: HeartbeatData[],
  width: number,
  height: number,
  color: string
) {
  if (data.length < 2) return;

  const pointSpacing = width / 100;
  const centerY = height / 2;
  const amplitude = height * 0.3;

  ctx.strokeStyle = color;
  ctx.lineWidth = 2;
  ctx.shadowBlur = 8;
  ctx.shadowColor = color;

  ctx.beginPath();

  const startIndex = Math.max(0, data.length - 100);

  data.slice(startIndex).forEach((point, index) => {
    const x = index * pointSpacing;
    const y = centerY - (point.value / 100) * amplitude;

    if (index === 0) {
      ctx.moveTo(x, y);
    } else {
      ctx.lineTo(x, y);
    }
  });

  ctx.stroke();
  ctx.shadowBlur = 0;
}

function drawConnectionStatus(
  ctx: CanvasRenderingContext2D,
  connected: boolean,
  width: number,
  height: number
) {
  if (connected) return;

  ctx.fillStyle = 'rgba(239, 68, 68, 0.1)';
  ctx.fillRect(0, 0, width, height);

  ctx.font = '14px monospace';
  ctx.fillStyle = '#EF4444';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText('NO SIGNAL', width / 2, height / 2);
}
