import React, { useEffect, useState, useCallback } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { GlassCard, GlassButton } from '@bayit/glass';
import { useMovieInteractionStore } from '@/stores/movieInteractionStore';
import { useAuthStore } from '@/stores/authStore';
import { QuestionChip } from '@/components/movie-interactions/QuestionChip';
import { ResponsePlayer } from '@/components/movie-interactions/ResponsePlayer';
import type { DialogueExchange } from '@/components/movie-interactions/ResponsePlayer';
import api from '@/services/api';
import logger from '@bayit/shared-utils/logger';

const pageLogger = logger.scope('CharacterDialoguePage');

export default function CharacterDialoguePage() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { contentId, characterName } = useParams<{ contentId: string; characterName: string }>();
  const { currentProfile } = useAuthStore();
  const { characters, questions, loading, fetchCharacters, fetchQuestions } = useMovieInteractionStore();

  const [sessionId, setSessionId] = useState<string | null>(null);
  const [exchanges, setExchanges] = useState<DialogueExchange[]>([]);
  const [isSending, setIsSending] = useState(false);
  const [customText, setCustomText] = useState('');

  const decodedName = characterName ? decodeURIComponent(characterName) : '';
  const character = characters.find((c) => c.name === decodedName) ?? null;

  useEffect(() => {
    if (!contentId || !decodedName) return;
    pageLogger.info('CharacterDialoguePage mounted', { contentId, characterName: decodedName });
    if (characters.length === 0) fetchCharacters(contentId);
    fetchQuestions(contentId, decodedName);
  }, [contentId, decodedName]);

  const ensureSession = useCallback(async (): Promise<string> => {
    if (sessionId) return sessionId;
    if (!contentId || !currentProfile?.id || !decodedName) {
      throw new Error('Missing required session parameters');
    }
    const session = await api.post('/vod-interactions/sessions/start-free', {
      content_id: contentId,
      profile_id: currentProfile.id,
      avatar_id: currentProfile.id,
      character_name: decodedName,
      current_timestamp: 0,
    }) as { id: string };
    pageLogger.info('Free interaction session started', { sessionId: session.id });
    setSessionId(session.id);
    return session.id;
  }, [sessionId, contentId, currentProfile?.id, decodedName]);

  const sendMessage = useCallback(async (text: string) => {
    if (!text.trim() || isSending) return;
    const userExchange: DialogueExchange = { speaker: 'user', message_text: text.trim() };
    setExchanges((prev) => [...prev, userExchange]);
    setIsSending(true);
    setCustomText('');
    try {
      const sid = await ensureSession();
      const response = await api.post(`/vod-interactions/sessions/${sid}/message`, {
        message: text.trim(),
      }) as { response_text: string; audio_url?: string; animated_video_url?: string };
      const charExchange: DialogueExchange = {
        speaker: 'character',
        message_text: response.response_text,
        audio_url: response.audio_url,
        animated_video_url: response.animated_video_url,
      };
      setExchanges((prev) => [...prev, charExchange]);
      pageLogger.info('Message sent and response received', { sessionId: sid });
    } catch (err: any) {
      pageLogger.error('Failed to send message', err);
      setExchanges((prev) => [
        ...prev,
        { speaker: 'character', message_text: t('zehAni.movieInteractions.errors.sendFailed') },
      ]);
    } finally {
      setIsSending(false);
    }
  }, [isSending, ensureSession, t]);

  if (!contentId || !decodedName) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <GlassCard className="p-8 text-center">
          <p className="text-white/70">{t('zehAni.movieInteractions.errors.noContentId')}</p>
        </GlassCard>
      </div>
    );
  }

  const allQuestions = [
    ...(questions?.specific_questions ?? []),
    ...(questions?.generic_questions ?? []),
  ];

  return (
    <div className="min-h-screen bg-gradient-to-b from-background via-background/95 to-background/90 px-4 py-8">
      <div className="max-w-2xl mx-auto">
        <div className="mb-6">
          <button
            onClick={() => navigate(`/zeh-ani/movie-interactions/${contentId}`)}
            className="text-white/60 hover:text-white mb-4 flex items-center gap-2 text-sm"
          >
            {t('common.back')}
          </button>
          <h1 className="text-2xl font-bold text-white">{decodedName}</h1>
          {character?.actor_name && (
            <p className="text-white/50 text-sm mt-0.5">
              {t('zehAni.movieInteractions.playedBy', { actor: character.actor_name })}
            </p>
          )}
        </div>

        {character && (
          <GlassCard className="mb-4 p-4">
            <ResponsePlayer character={character} exchanges={exchanges} isSending={isSending} />
          </GlassCard>
        )}

        {loading && allQuestions.length === 0 ? (
          <div className="flex justify-center py-6">
            <div className="w-8 h-8 border-4 border-primary-400 border-t-transparent rounded-full animate-spin" />
          </div>
        ) : allQuestions.length > 0 ? (
          <GlassCard className="mb-4 p-4">
            <p className="text-white/50 text-xs uppercase tracking-wider mb-3">
              {t('zehAni.movieInteractions.dialogue.suggestedQuestions')}
            </p>
            <div className="flex flex-wrap gap-2">
              {allQuestions.map((q, idx) => (
                <QuestionChip
                  key={`q-${idx}`}
                  question={q}
                  onClick={() => sendMessage(q)}
                  disabled={isSending}
                />
              ))}
            </div>
          </GlassCard>
        ) : null}

        <GlassCard className="p-4">
          <p className="text-white/50 text-xs uppercase tracking-wider mb-3">
            {t('zehAni.movieInteractions.dialogue.askAnything')}
          </p>
          <div className="flex gap-2">
            <input
              className="flex-1 bg-white/8 border border-white/10 rounded-lg px-3 py-2 text-white text-sm placeholder:text-white/30 focus:outline-none focus:border-primary-400/60"
              placeholder={t('zehAni.movieInteractions.dialogue.inputPlaceholder', { name: decodedName })}
              value={customText}
              onChange={(e) => setCustomText(e.target.value)}
              onKeyDown={(e) => { if (e.key === 'Enter') sendMessage(customText); }}
              disabled={isSending}
            />
            <GlassButton
              onClick={() => sendMessage(customText)}
              disabled={!customText.trim() || isSending}
            >
              {t('common.send')}
            </GlassButton>
          </div>
        </GlassCard>
      </div>
    </div>
  );
}
