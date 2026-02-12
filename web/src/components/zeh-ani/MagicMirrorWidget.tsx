import React, { useEffect, useState, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import api from '@/services/api';
import logger from '@bayit/shared-utils/logger';

const widgetLogger = logger.scope('MagicMirrorWidget');

interface MagicMirrorGreeting {
  greeting_text_he: string;
  greeting_text_en: string;
  avatar_thumbnail_url: string | null;
  vocabulary_word_he: string;
  vocabulary_transliteration: string;
  vocabulary_translation: string;
  vocabulary_category: string;
}

interface MagicMirrorWidgetProps {
  profileId: string;
}

export function MagicMirrorWidget({ profileId }: MagicMirrorWidgetProps) {
  const { t } = useTranslation();
  const [greeting, setGreeting] = useState<MagicMirrorGreeting | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchGreeting = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await api.get(
        `/zeh-ani/magic-mirror/${profileId}`,
      ) as MagicMirrorGreeting;
      setGreeting(data);
      widgetLogger.info('Magic mirror greeting fetched', { profileId });
    } catch (fetchError: any) {
      const msg = fetchError?.detail || fetchError?.message ||
        t('zehAni.magicMirror.errors.fetchFailed');
      setError(msg);
      widgetLogger.error('Failed to fetch magic mirror greeting', fetchError);
    } finally {
      setLoading(false);
    }
  }, [profileId, t]);

  useEffect(() => {
    fetchGreeting();
  }, [fetchGreeting]);

  if (loading) {
    return (
      <div className="rounded-2xl bg-gradient-to-br from-white/10 to-white/5 border border-white/15 p-5 backdrop-blur-md">
        <div className="flex items-center gap-4 animate-pulse">
          <div className="w-14 h-14 rounded-full bg-white/10" />
          <div className="flex-1 space-y-2">
            <div className="h-4 bg-white/10 rounded w-3/4" />
            <div className="h-3 bg-white/10 rounded w-1/2" />
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="rounded-2xl bg-gradient-to-br from-white/10 to-white/5 border border-white/15 p-5 backdrop-blur-md">
        <p className="text-sm text-red-400 text-center">{error}</p>
        <button type="button" onClick={fetchGreeting}
          className="mt-3 w-full py-2 rounded-lg bg-white/10 hover:bg-white/20 text-white/70 text-xs transition-colors">
          {t('common.retry')}
        </button>
      </div>
    );
  }

  if (!greeting) return null;

  return (
    <div className="rounded-2xl bg-gradient-to-br from-white/10 to-white/5 border border-white/15 p-5 backdrop-blur-md">
      <div className="flex items-start gap-4">
        {greeting.avatar_thumbnail_url ? (
          <img
            src={greeting.avatar_thumbnail_url}
            alt=""
            className="w-14 h-14 rounded-full border border-white/20 object-cover"
            aria-hidden="true"
          />
        ) : (
          <div className="w-14 h-14 rounded-full bg-white/10 border border-white/20 flex items-center justify-center">
            <span className="text-lg text-white/40" aria-hidden="true">A</span>
          </div>
        )}

        <div className="flex-1 min-w-0">
          <p className="text-base font-semibold text-white/90 font-hebrew" dir="rtl">
            {greeting.greeting_text_he}
          </p>
          <p className="text-sm text-white/50 mt-0.5">
            {greeting.greeting_text_en}
          </p>
        </div>
      </div>

      <div className="mt-4 p-3 rounded-xl bg-white/5 border border-white/10">
        <p className="text-xs text-white/40 mb-1">
          {t('zehAni.magicMirror.vocabOfTheDay')}
        </p>
        <div className="flex items-baseline gap-2">
          <span className="text-xl font-bold text-white/90 font-hebrew" dir="rtl">
            {greeting.vocabulary_word_he}
          </span>
          <span className="text-sm text-white/50">
            {greeting.vocabulary_transliteration}
          </span>
        </div>
        <p className="text-sm text-white/60 mt-1">
          {greeting.vocabulary_translation}
        </p>
        <span className="inline-block mt-1.5 px-2 py-0.5 rounded-md bg-white/10 text-xs text-white/40">
          {greeting.vocabulary_category}
        </span>
      </div>

      <button type="button" onClick={fetchGreeting}
        className="mt-3 w-full py-2 rounded-lg bg-white/5 hover:bg-white/10 text-white/40 text-xs transition-colors">
        {t('zehAni.magicMirror.refresh')}
      </button>
    </div>
  );
}
