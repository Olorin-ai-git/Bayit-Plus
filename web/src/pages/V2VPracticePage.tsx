import React from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useAuthStore } from '@/stores/authStore';
import { GlassCard } from '@bayit/glass';
import { V2VPracticePanel } from '@/components/zeh-ani/V2VPracticePanel';
import { V2VWaveformCompare } from '@/components/zeh-ani/V2VWaveformCompare';

export default function V2VPracticePage() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { currentProfile } = useAuthStore();

  if (!currentProfile) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <GlassCard className="p-8 text-center">
          <p className="text-white/70">{t('zehAni.v2v.noProfile')}</p>
        </GlassCard>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-background via-background/95 to-background/90 px-4 py-8">
      <div className="max-w-5xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <button
            onClick={() => navigate('/zeh-ani')}
            className="text-white/60 hover:text-white mb-4 flex items-center gap-2"
          >
            ← {t('common.back')}
          </button>
          <h1 className="text-3xl font-bold text-white mb-2">
            🎤 {t('zehAni.v2v.title')}
          </h1>
          <p className="text-white/70">
            {t('zehAni.v2v.subtitle')}
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Practice Panel */}
          <div className="lg:col-span-2">
            <V2VPracticePanel profileId={currentProfile.id} />
          </div>

          {/* Waveform Comparison */}
          <div className="lg:col-span-1">
            <GlassCard>
              <div className="p-6">
                <h3 className="text-lg font-semibold text-white mb-4">
                  {t('zehAni.v2v.comparison')}
                </h3>
                <V2VWaveformCompare />
              </div>
            </GlassCard>
          </div>

          {/* Instructions */}
          <div className="lg:col-span-3">
            <GlassCard className="border border-primary-500/30">
              <div className="p-6">
                <h3 className="text-lg font-semibold text-white mb-4">
                  📖 {t('zehAni.v2v.howTo')}
                </h3>
                <ol className="space-y-3 text-white/70">
                  <li className="flex gap-3">
                    <span className="text-primary-400 font-semibold">1.</span>
                    <span>{t('zehAni.v2v.step1')}</span>
                  </li>
                  <li className="flex gap-3">
                    <span className="text-primary-400 font-semibold">2.</span>
                    <span>{t('zehAni.v2v.step2')}</span>
                  </li>
                  <li className="flex gap-3">
                    <span className="text-primary-400 font-semibold">3.</span>
                    <span>{t('zehAni.v2v.step3')}</span>
                  </li>
                  <li className="flex gap-3">
                    <span className="text-primary-400 font-semibold">4.</span>
                    <span>{t('zehAni.v2v.step4')}</span>
                  </li>
                </ol>
              </div>
            </GlassCard>
          </div>
        </div>
      </div>
    </div>
  );
}
