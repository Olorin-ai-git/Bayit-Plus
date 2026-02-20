import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { GlassCard, GlassButton } from '@bayit/glass';
import { useMovieInteractionStore } from '@/stores/movieInteractionStore';
import { useAuthStore } from '@/stores/authStore';
import logger from '@bayit/shared-utils/logger';

const pageLogger = logger.scope('MovieInteractionsPage');

export default function MovieInteractionsPage() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { user } = useAuthStore();
  const { movies, loading, error, fetchMovies, tagMovie, clearError } = useMovieInteractionStore();
  const [tagInputVisible, setTagInputVisible] = useState(false);
  const [tagContentId, setTagContentId] = useState('');

  useEffect(() => {
    pageLogger.info('MovieInteractionsPage mounted');
    fetchMovies();
  }, [fetchMovies]);

  const handleMovieClick = (contentId: string) => {
    pageLogger.info('Movie selected', { contentId });
    navigate(`/zeh-ani/movie-interactions/${contentId}`);
  };

  const handleTagSubmit = async () => {
    if (!tagContentId.trim() || !user?.id) return;
    pageLogger.info('Tagging movie', { contentId: tagContentId });
    await tagMovie(tagContentId.trim(), user!.id);
    setTagContentId('');
    setTagInputVisible(false);
    fetchMovies();
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-background via-background/95 to-background/90 px-4 py-8">
      <div className="max-w-6xl mx-auto">
        <div className="mb-8">
          <button
            onClick={() => navigate('/zeh-ani')}
            className="text-white/60 hover:text-white mb-4 flex items-center gap-2 text-sm"
          >
            {t('common.back')}
          </button>
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-white mb-1">
                {t('zehAni.movieInteractions.title')}
              </h1>
              <p className="text-white/60 text-sm">{t('zehAni.movieInteractions.subtitle')}</p>
            </div>
            <GlassButton onClick={() => setTagInputVisible((v) => !v)}>
              {t('zehAni.movieInteractions.tagMovie')}
            </GlassButton>
          </div>
        </div>

        {tagInputVisible && (
          <GlassCard className="mb-6 p-4">
            <p className="text-white/70 text-sm mb-3">{t('zehAni.movieInteractions.tagInstructions')}</p>
            <div className="flex gap-3">
              <input
                className="flex-1 bg-white/8 border border-white/10 rounded-lg px-3 py-2 text-white text-sm placeholder:text-white/30 focus:outline-none focus:border-primary-400/60"
                placeholder={t('zehAni.movieInteractions.contentIdPlaceholder')}
                value={tagContentId}
                onChange={(e) => setTagContentId(e.target.value)}
                onKeyDown={(e) => { if (e.key === 'Enter') handleTagSubmit(); }}
              />
              <GlassButton onClick={handleTagSubmit} disabled={!tagContentId.trim() || loading}>
                {t('zehAni.movieInteractions.submit')}
              </GlassButton>
            </div>
          </GlassCard>
        )}

        {error && (
          <GlassCard className="mb-6 p-4 border border-error-500/30">
            <p className="text-error-400 text-sm">{error}</p>
            <GlassButton variant="ghost" size="sm" className="mt-2" onClick={clearError}>
              {t('common.dismiss')}
            </GlassButton>
          </GlassCard>
        )}

        {loading && movies.length === 0 ? (
          <div className="flex justify-center py-16">
            <div className="w-10 h-10 border-4 border-primary-400 border-t-transparent rounded-full animate-spin" />
          </div>
        ) : movies.length === 0 ? (
          <GlassCard className="p-10 text-center">
            <p className="text-white/50 text-lg mb-4">{t('zehAni.movieInteractions.noMovies')}</p>
            <p className="text-white/30 text-sm">{t('zehAni.movieInteractions.noMoviesHint')}</p>
          </GlassCard>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
            {movies.map((movie) => (
              <GlassCard
                key={movie.content_id}
                className="group cursor-pointer hover:scale-105 transition-all duration-300"
                onClick={() => handleMovieClick(movie.content_id)}
              >
                <div className="aspect-[2/3] relative overflow-hidden rounded-t-xl">
                  {movie.poster_url ? (
                    <img
                      src={movie.poster_url}
                      alt={movie.title}
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <div className="w-full h-full bg-white/5 flex items-center justify-center">
                      <span className="text-white/20 text-4xl font-bold">
                        {movie.title.charAt(0)}
                      </span>
                    </div>
                  )}
                  <div className={`absolute top-2 right-2 text-xs px-2 py-0.5 rounded-full font-medium ${
                    movie.status === 'ready'
                      ? 'bg-green-500/80 text-white'
                      : 'bg-yellow-500/80 text-white'
                  }`}>
                    {t(`zehAni.movieInteractions.status.${movie.status}`, { defaultValue: movie.status })}
                  </div>
                </div>
                <div className="p-3">
                  <p className="text-white text-sm font-medium leading-tight line-clamp-2">{movie.title}</p>
                  <p className="text-white/40 text-xs mt-1">
                    {t('zehAni.movieInteractions.characterCount', { count: movie.character_count })}
                  </p>
                </div>
              </GlassCard>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
