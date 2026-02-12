import React, { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';

interface V2VWaveformCompareProps {
  scoreBefore: number;
  scoreAfter: number;
  scoreDelta: number;
}

const MAX_SCORE = 100;
const ANIMATION_DELAY_MS = 150;

function clampPercentage(value: number): number {
  return Math.min(Math.max((value / MAX_SCORE) * 100, 0), 100);
}

function formatDelta(delta: number): string {
  const sign = delta >= 0 ? '+' : '';
  return `${sign}${delta.toFixed(1)}`;
}

export function V2VWaveformCompare({
  scoreBefore,
  scoreAfter,
  scoreDelta,
}: V2VWaveformCompareProps) {
  const { t } = useTranslation();
  const [animated, setAnimated] = useState(false);

  useEffect(() => {
    const timer = setTimeout(() => setAnimated(true), ANIMATION_DELAY_MS);
    return () => clearTimeout(timer);
  }, []);

  const beforeWidth = clampPercentage(scoreBefore);
  const afterWidth = clampPercentage(scoreAfter);
  const isPositive = scoreDelta >= 0;

  return (
    <div className="rounded-xl bg-white/5 border border-white/10 p-4">
      <h4 className="text-sm font-medium text-white/70 mb-4">
        {t('zehAni.v2v.comparison.title')}
      </h4>

      <div className="space-y-4">
        <div>
          <div className="flex items-center justify-between mb-1.5">
            <span className="text-xs text-white/50">
              {t('zehAni.v2v.comparison.before')}
            </span>
            <span className="text-xs font-medium text-amber-400">
              {scoreBefore.toFixed(1)}
            </span>
          </div>
          <div className="h-3 bg-white/10 rounded-full overflow-hidden">
            <div
              className="h-full bg-amber-500 rounded-full transition-all duration-700 ease-out"
              style={{ width: animated ? `${beforeWidth}%` : '0%' }}
            />
          </div>
        </div>

        <div>
          <div className="flex items-center justify-between mb-1.5">
            <span className="text-xs text-white/50">
              {t('zehAni.v2v.comparison.after')}
            </span>
            <span className="text-xs font-medium text-green-400">
              {scoreAfter.toFixed(1)}
            </span>
          </div>
          <div className="h-3 bg-white/10 rounded-full overflow-hidden">
            <div
              className="h-full bg-green-500 rounded-full transition-all duration-700 ease-out"
              style={{
                width: animated ? `${afterWidth}%` : '0%',
                transitionDelay: '200ms',
              }}
            />
          </div>
        </div>
      </div>

      <div className="mt-4 pt-3 border-t border-white/10 flex items-center justify-center gap-2">
        <span className="text-xs text-white/50">
          {t('zehAni.v2v.comparison.delta')}
        </span>
        <span
          className={`text-lg font-bold transition-opacity duration-500 ${
            isPositive ? 'text-green-400' : 'text-red-400'
          } ${animated ? 'opacity-100' : 'opacity-0'}`}
          style={{ transitionDelay: '400ms' }}
        >
          {formatDelta(scoreDelta)}
        </span>
      </div>
    </div>
  );
}
