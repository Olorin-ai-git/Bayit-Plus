import React from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useAuthStore } from '@/stores/authStore';
import { GlassCard } from '@bayit/glass';
import { FeedbackInbox } from '@/components/zeh-ani/FeedbackInbox';

export default function FeedbackInboxPage() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { user } = useAuthStore();

  if (!user) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <GlassCard className="p-8 text-center">
          <p className="text-white/70">{t('zehAni.feedback.noProfile')}</p>
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
            📬 {t('zehAni.feedback.title')}
          </h1>
          <p className="text-white/70">
            {t('zehAni.feedback.subtitle')}
          </p>
        </div>

        {/* Feedback Inbox Component */}
        <FeedbackInbox profileId={user.id} />
      </div>
    </div>
  );
}
