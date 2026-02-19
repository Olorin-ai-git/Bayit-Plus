import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { GlassCard } from '@bayit/glass';
import type { ContentCharacter } from '@/stores/movieInteractionStore.types';

interface CharacterCardProps {
  character: ContentCharacter;
  onClick: () => void;
}

export function CharacterCard({ character, onClick }: CharacterCardProps) {
  const { t } = useTranslation();
  const [imgError, setImgError] = useState(false);

  return (
    <GlassCard
      className="group cursor-pointer hover:scale-105 transition-all duration-300"
      onClick={onClick}
    >
      <div className="p-4 flex flex-col items-center gap-3">
        <div className="relative w-24 h-24 rounded-full overflow-hidden border-2 border-primary-400/40 group-hover:border-primary-400/80 transition-colors">
          {!imgError && character.frame_url ? (
            <img
              src={character.frame_url}
              alt={character.name}
              className="w-full h-full object-cover"
              onError={() => setImgError(true)}
            />
          ) : (
            <div className="w-full h-full bg-white/10 flex items-center justify-center">
              <span className="text-3xl text-white/40 font-bold select-none">
                {character.name.charAt(0).toUpperCase()}
              </span>
            </div>
          )}
        </div>

        <div className="text-center">
          <h3 className="text-sm font-semibold text-white leading-tight">
            {character.name}
          </h3>
          {character.actor_name && (
            <p className="text-xs text-white/50 mt-0.5">
              {t('zehAni.movieInteractions.playedBy', { actor: character.actor_name })}
            </p>
          )}
        </div>
      </div>
    </GlassCard>
  );
}
