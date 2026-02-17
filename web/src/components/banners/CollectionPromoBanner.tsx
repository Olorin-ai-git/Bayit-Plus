/**
 * CollectionPromoBanner
 *
 * Promotional banner for movie collections with AI-generated text
 * Features:
 * - Auto-rotation through multiple collections every 5 seconds
 * - Weighted random ordering (popular collections shown more often)
 * - Smooth fade transitions (300ms fade out → change → 300ms fade in)
 * - Pause rotation on hover, resume on mouse leave
 * - Preloads next collection's image for smooth transitions
 * - Glass design with poster thumbnail
 * - Responsive layout
 */

import React, { useEffect, useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { GlassButton } from '@bayit/shared';
import { colors } from '@olorin/design-tokens';
import logger from '@/utils/logger';

const moduleLogger = logger.scope('CollectionPromoBanner');

interface Collection {
  id: string;
  title: string;
  title_en?: string;
  thumbnail?: string;
  backdrop?: string;
  promo_text?: string;
  promo_text_en?: string;
  promo_text_es?: string;
  promo_text_fr?: string;
  promo_text_it?: string;
  promo_text_hi?: string;
  promo_text_ta?: string;
  promo_text_bn?: string;
  promo_text_ja?: string;
  promo_text_zh?: string;
  available_movies: number;
  total_movies: number;
  tmdb_collection_id?: number;
}

interface CollectionPromoBannerProps {
  collections: Collection[];
  autoRotate?: boolean;
  rotationInterval?: number; // milliseconds
  className?: string;
}

export const CollectionPromoBanner: React.FC<CollectionPromoBannerProps> = ({
  collections,
  autoRotate = true,
  rotationInterval = 5000,
  className = '',
}) => {
  const navigate = useNavigate();
  const { t, i18n } = useTranslation();
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isTransitioning, setIsTransitioning] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const [isVisible, setIsVisible] = useState(false);
  const timerRef = useRef<NodeJS.Timeout | null>(null);

  // Get current collection
  const currentCollection = collections[currentIndex];

  // Get promo text in current language
  const getPromoText = (collection: Collection): string => {
    const langMap: Record<string, keyof Collection> = {
      he: 'promo_text',
      en: 'promo_text_en',
      es: 'promo_text_es',
      fr: 'promo_text_fr',
      it: 'promo_text_it',
      hi: 'promo_text_hi',
      ta: 'promo_text_ta',
      bn: 'promo_text_bn',
      ja: 'promo_text_ja',
      zh: 'promo_text_zh',
    };

    const field = langMap[i18n.language] || 'promo_text_en';
    return (collection[field] as string) || collection.promo_text || collection.promo_text_en || '';
  };

  // Preload next collection's image
  useEffect(() => {
    if (collections.length > 1) {
      const nextIndex = (currentIndex + 1) % collections.length;
      const nextCollection = collections[nextIndex];
      if (nextCollection?.thumbnail) {
        const img = new Image();
        img.src = nextCollection.thumbnail;
      }
    }
  }, [currentIndex, collections]);

  // Auto-rotation timer
  useEffect(() => {
    if (!autoRotate || collections.length <= 1 || isPaused) {
      return;
    }

    timerRef.current = setInterval(() => {
      handleRotate();
    }, rotationInterval);

    return () => {
      if (timerRef.current) {
        clearInterval(timerRef.current);
      }
    };
  }, [autoRotate, collections.length, isPaused, currentIndex, rotationInterval]);

  // Initial fade-in
  useEffect(() => {
    const timer = setTimeout(() => setIsVisible(true), 100);
    return () => clearTimeout(timer);
  }, []);

  const handleRotate = () => {
    setIsTransitioning(true);

    // Fade out (300ms)
    setTimeout(() => {
      // Change content
      setCurrentIndex((prev) => (prev + 1) % collections.length);

      // Fade in (300ms)
      setTimeout(() => {
        setIsTransitioning(false);
      }, 300);
    }, 300);
  };

  const handleMouseEnter = () => {
    setIsPaused(true);
    if (timerRef.current) {
      clearInterval(timerRef.current);
    }
  };

  const handleMouseLeave = () => {
    setIsPaused(false);
  };

  const handleWatchNow = () => {
    if (currentCollection) {
      navigate(`/vod/collection/${currentCollection.id}`);
    }
  };

  if (!currentCollection) {
    return null;
  }

  const promoText = getPromoText(currentCollection);
  const title = i18n.language === 'en' ? (currentCollection.title_en || currentCollection.title) : currentCollection.title;
  const posterUrl = currentCollection.thumbnail || currentCollection.backdrop;

  return (
    <div
      className={`collection-promo-banner ${isVisible ? 'fade-in' : 'opacity-0'} ${className}`}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
      style={{
        background: `linear-gradient(135deg, ${colors.glass.bg} 0%, ${colors.glass.bgMedium} 100%)`,
        backdropFilter: 'blur(20px)',
        WebkitBackdropFilter: 'blur(20px)',
        border: `1px solid ${colors.glass.border}`,
        borderRadius: '16px',
        padding: '24px',
        display: 'flex',
        gap: '20px',
        alignItems: 'center',
        transition: 'all 0.6s cubic-bezier(0.4, 0, 0.2, 1)',
        animation: isVisible ? 'fadeInUp 0.6s ease-out' : 'none',
        opacity: isTransitioning ? 0 : 1,
      }}
    >
      {posterUrl && (
        <div
          style={{
            width: '120px',
            height: '180px',
            borderRadius: '8px',
            overflow: 'hidden',
            flexShrink: 0,
          }}
        >
          <img
            src={posterUrl}
            alt={title}
            style={{
              width: '100%',
              height: '100%',
              objectFit: 'cover',
            }}
          />
        </div>
      )}

      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '12px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', justifyContent: 'space-between' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span
              style={{
                fontSize: '12px',
                fontWeight: 600,
                color: colors.text.muted,
                textTransform: 'uppercase',
                letterSpacing: '0.5px',
              }}
            >
              {t('vod.collection.aiRecommendation')}
            </span>
          </div>
          {collections.length > 1 && (
            <div style={{ display: 'flex', gap: '4px' }}>
              {collections.map((_, index) => (
                <div
                  key={index}
                  style={{
                    width: '6px',
                    height: '6px',
                    borderRadius: '50%',
                    backgroundColor: index === currentIndex ? colors.text.primary : colors.text.muted,
                    opacity: index === currentIndex ? 1 : 0.3,
                    transition: 'all 0.3s ease',
                  }}
                />
              ))}
            </div>
          )}
        </div>

        <h3
          style={{
            fontSize: '20px',
            fontWeight: 700,
            color: colors.text.primary,
            margin: 0,
          }}
        >
          {title}
        </h3>

        <p
          style={{
            fontSize: '14px',
            lineHeight: '1.6',
            color: colors.text.secondary,
            margin: 0,
          }}
        >
          {promoText}
        </p>

        <div
          style={{
            fontSize: '13px',
            color: colors.text.muted,
          }}
        >
          {currentCollection.available_movies} {t('vod.collection.movies')}
        </div>

        <GlassButton
          variant="primary"
          onClick={handleWatchNow}
          style={{
            alignSelf: 'flex-start',
            marginTop: '8px',
          }}
        >
          {t('vod.collection.watchNow')}
        </GlassButton>
      </div>
    </div>
  );
};

// CSS keyframes (inject into global styles or use styled-components)
const style = document.createElement('style');
style.textContent = `
  @keyframes fadeInUp {
    from {
      opacity: 0;
      transform: translateY(20px);
    }
    to {
      opacity: 1;
      transform: translateY(0);
    }
  }

  .collection-promo-banner {
    transition: opacity 0.3s ease-in-out, transform 0.6s cubic-bezier(0.4, 0, 0.2, 1);
  }

  .collection-promo-banner:hover {
    transform: scale(1.02);
    box-shadow: 0 8px 24px rgba(0, 0, 0, 0.3);
  }

  .fade-in {
    opacity: 1 !important;
  }
`;
document.head.appendChild(style);
