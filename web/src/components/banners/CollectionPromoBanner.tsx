/**
 * CollectionPromoBanner
 *
 * Promotional banner for movie collections with AI-generated text
 * Features:
 * - Glass design with poster thumbnail
 * - Fade-in CSS animation
 * - Call-to-action button
 * - Responsive layout
 */

import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { GlassButton } from '@bayit/shared';
import { colors } from '@olorin/design-tokens';
import logger from '@/utils/logger';

const moduleLogger = logger.scope('CollectionPromoBanner');

interface CollectionPromoBannerProps {
  collectionId: string;
  title: string;
  posterUrl?: string;
  promoText: string;
  movieCount: number;
  className?: string;
}

export const CollectionPromoBanner: React.FC<CollectionPromoBannerProps> = ({
  collectionId,
  title,
  posterUrl,
  promoText,
  movieCount,
  className = '',
}) => {
  const navigate = useNavigate();
  const { t } = useTranslation();
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    const timer = setTimeout(() => setIsVisible(true), 100);
    return () => clearTimeout(timer);
  }, []);

  const handleWatchNow = () => {
    navigate(`/vod/collection/${collectionId}`);
  };

  return (
    <div
      className={`collection-promo-banner ${isVisible ? 'fade-in' : 'opacity-0'} ${className}`}
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
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <span style={{ fontSize: '24px' }}>✨</span>
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
          {movieCount} {t('vod.collection.movies')}
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

  .collection-promo-banner:hover {
    transform: scale(1.02);
    box-shadow: 0 8px 24px rgba(0, 0, 0, 0.3);
  }

  .fade-in {
    opacity: 1 !important;
  }
`;
document.head.appendChild(style);
