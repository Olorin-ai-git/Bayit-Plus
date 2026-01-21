import React, { useRef, useEffect, useState } from 'react';
import * as d3 from 'd3';
import { useRadarAnimation } from '../../hooks/useRadarAnimation';
import { useEventBus } from '../../hooks/useEventBus';
import {
  polarToCartesian,
  calculateSweepPath,
  calculateGridCircles,
  calculateCrosshairLines,
  RadarConfig
} from '../../utils/radarGeometry';

interface RadarVisualizationProps {
  investigationId: string;
  width?: number;
  height?: number;
  rotationSpeed?: number;
  className?: string;
}

interface AnomalyBlip {
  id: string;
  angle: number;
  radius: number;
  severity: 'low' | 'medium' | 'high' | 'critical';
  label: string;
  timestamp: number;
}

export function RadarVisualization({
  investigationId,
  width = 400,
  height = 400,
  rotationSpeed = 30,
  className = ''
}: RadarVisualizationProps) {
  const svgRef = useRef<SVGSVGElement>(null);
  const [anomalies, setAnomalies] = useState<AnomalyBlip[]>([]);
  const { angle, isAnimating, start, stop } = useRadarAnimation({ rotationSpeed, enabled: true });

  const radarConfig: RadarConfig = {
    centerX: width / 2,
    centerY: height / 2,
    radius: Math.min(width, height) / 2 - 20
  };

  useEventBus<{ data: { investigationId: string; anomaly: AnomalyBlip } }>(
    'agent:anomaly-detected',
    (event) => {
      if (event.data.investigationId === investigationId) {
        setAnomalies(prev => [...prev, event.data.anomaly].slice(-50));
      }
    }
  );

  useEffect(() => {
    if (!svgRef.current) return;

    const svg = d3.select(svgRef.current);
    svg.selectAll('*').remove();

    const g = svg.append('g');

    // Draw background circles
    const gridCircles = calculateGridCircles(radarConfig, 4);
    g.selectAll('circle.grid')
      .data(gridCircles)
      .enter()
      .append('circle')
      .attr('class', 'grid')
      .attr('cx', radarConfig.centerX)
      .attr('cy', radarConfig.centerY)
      .attr('r', d => d)
      .attr('fill', 'none')
      .attr('stroke', '#1A2332')
      .attr('stroke-width', 1);

    // Draw crosshair lines
    const crosshairLines = calculateCrosshairLines(radarConfig, 8);
    g.selectAll('line.crosshair')
      .data(crosshairLines)
      .enter()
      .append('line')
      .attr('class', 'crosshair')
      .attr('x1', d => d[0].x)
      .attr('y1', d => d[0].y)
      .attr('x2', d => d[1].x)
      .attr('y2', d => d[1].y)
      .attr('stroke', '#1A2332')
      .attr('stroke-width', 1);

    // Draw rotating sweep
    const sweepPath = calculateSweepPath(radarConfig, angle, 60);
    g.append('path')
      .attr('class', 'sweep')
      .attr('d', sweepPath)
      .attr('fill', 'url(#sweepGradient)')
      .attr('opacity', 0.3);

    // Define gradient for sweep
    const defs = svg.append('defs');
    const gradient = defs.append('radialGradient')
      .attr('id', 'sweepGradient');
    gradient.append('stop')
      .attr('offset', '0%')
      .attr('stop-color', '#10B981')
      .attr('stop-opacity', 0);
    gradient.append('stop')
      .attr('offset', '100%')
      .attr('stop-color', '#10B981')
      .attr('stop-opacity', 0.6);

    // Draw anomaly blips
    const severityColors = {
      low: '#6B7280',
      medium: '#F59E0B',
      high: '#F97316',
      critical: '#EF4444'
    };

    const now = Date.now();
    const fadeTime = 5000;

    g.selectAll('circle.anomaly')
      .data(anomalies)
      .enter()
      .append('circle')
      .attr('class', 'anomaly')
      .attr('cx', d => {
        const pos = polarToCartesian(
          { x: radarConfig.centerX, y: radarConfig.centerY },
          d.radius * radarConfig.radius,
          d.angle
        );
        return pos.x;
      })
      .attr('cy', d => {
        const pos = polarToCartesian(
          { x: radarConfig.centerX, y: radarConfig.centerY },
          d.radius * radarConfig.radius,
          d.angle
        );
        return pos.y;
      })
      .attr('r', 6)
      .attr('fill', d => severityColors[d.severity])
      .attr('stroke', '#FFF')
      .attr('stroke-width', 2)
      .attr('opacity', d => {
        const age = now - d.timestamp;
        return Math.max(0, 1 - age / fadeTime);
      })
      .append('title')
      .text(d => `${d.label} (${d.severity})`);

  }, [angle, anomalies, radarConfig]);

  const anomalyCount = anomalies.length;
  const criticalCount = anomalies.filter(a => a.severity === 'critical').length;

  return (
    <div className={`radar-visualization ${className}`}>
      <div className="flex items-center justify-between mb-2">
        <span className="text-xs text-gray-500 font-mono">Radar Monitor</span>
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-1">
            <span className="text-xs text-gray-400">Anomalies:</span>
            <span className="text-sm font-mono text-orange-400">{anomalyCount}</span>
          </div>
          {criticalCount > 0 && (
            <div className="flex items-center gap-1">
              <span className="text-xs text-gray-400">Critical:</span>
              <span className="text-sm font-mono text-red-400">{criticalCount}</span>
            </div>
          )}
          <button
            onClick={isAnimating ? stop : start}
            className="text-xs px-2 py-1 bg-gray-700 hover:bg-gray-600 rounded transition-colors"
          >
            {isAnimating ? 'Pause' : 'Resume'}
          </button>
        </div>
      </div>

      <svg
        ref={svgRef}
        width={width}
        height={height}
        className="bg-gray-900/50 rounded-lg border border-gray-700"
      />
    </div>
  );
}
