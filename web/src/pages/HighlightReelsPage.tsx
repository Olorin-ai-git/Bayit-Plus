import React from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useAuthStore } from '@/stores/authStore';
import { GlassCard } from '@bayit/glass';
import { HighlightReelPlayer } from '@/components/zeh-ani/HighlightReelPlayer';

export default function HighlightReelsPage() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { currentProfile } = useAuthStore();

  if (!currentProfile) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <GlassCard className="p-8 text-center">
          <p className="text-white/70">{t('zehAni.highlights.noProfile')}</p>
        </GlassCard>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-background via-background/95 to-background/90 px-4 py-8">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <button
            onClick={() => navigate('/zeh-ani')}
            className="text-white/60 hover:text-white mb-4 flex items-center gap-2"
          >
            ← {t('common.back')}
          </button>
          <h1 className="text-3xl font-bold text-white mb-2">
            🎬 {t('zehAni.highlights.title')}
          </h1>
          <p className="text-white/70">
            {t('zehAni.highlights.subtitle')}
          </p>
        </div>

        {/* Highlight Reel Player Component */}
        <HighlightReelPlayer profileId={currentProfile.id} />
      </div>
    </div>
  );
}
