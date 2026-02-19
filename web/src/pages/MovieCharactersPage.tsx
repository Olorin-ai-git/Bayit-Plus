import React, { useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { GlassCard } from '@bayit/glass';
import { useMovieInteractionStore } from '@/stores/movieInteractionStore';
import { CharacterCard } from '@/components/movie-interactions/CharacterCard';
import logger from '@bayit/shared-utils/logger';

const pageLogger = logger.scope('MovieCharactersPage');

export default function MovieCharactersPage() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { contentId } = useParams<{ contentId: string }>();
  const { characters, tagStatus, loading, error, fetchCharacters, clearError } = useMovieInteractionStore();

  useEffect(() => {
    if (!contentId) return;
    pageLogger.info('MovieCharactersPage mounted', { contentId });
    fetchCharacters(contentId);
  }, [contentId, fetchCharacters]);

  const handleCharacterClick = (characterName: string) => {
    pageLogger.info('Character selected', { contentId, characterName });
    navigate(`/zeh-ani/movie-interactions/${contentId}/${encodeURIComponent(characterName)}`);
  };

  if (!contentId) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <GlassCard className="p-8 text-center">
          <p className="text-white/70">{t('zehAni.movieInteractions.errors.noContentId')}</p>
        </GlassCard>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-background via-background/95 to-background/90 px-4 py-8">
      <div className="max-w-4xl mx-auto">
        <div className="mb-8">
          <button
            onClick={() => navigate('/zeh-ani/movie-interactions')}
            className="text-white/60 hover:text-white mb-4 flex items-center gap-2 text-sm"
          >
            {t('common.back')}
          </button>
          <h1 className="text-3xl font-bold text-white mb-1">
            {t('zehAni.movieInteractions.characters.title')}
          </h1>
          {tagStatus?.status && tagStatus.status !== 'ready' && (
            <p className="text-yellow-400/80 text-sm mt-2">
              {t('zehAni.movieInteractions.characters.processingNotice')}
            </p>
          )}
        </div>

        {error && (
          <GlassCard className="mb-6 p-4 border border-error-500/30">
            <p className="text-error-400 text-sm">{error}</p>
          </GlassCard>
        )}

        {loading ? (
          <div className="flex justify-center py-16">
            <div className="w-10 h-10 border-4 border-primary-400 border-t-transparent rounded-full animate-spin" />
          </div>
        ) : characters.length === 0 ? (
          <GlassCard className="p-10 text-center">
            <p className="text-white/50">{t('zehAni.movieInteractions.characters.noCharacters')}</p>
          </GlassCard>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
            {characters.map((character) => (
              <CharacterCard
                key={character.name}
                character={character}
                onClick={() => handleCharacterClick(character.name)}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
