import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { useTranslation } from 'react-i18next';
import { useReducedMotion } from '../../hooks/useReducedMotion';

interface DeviceImageProps {
  imageSrc: string;
}

export const DeviceImage: React.FC<DeviceImageProps> = ({ imageSrc }) => {
  const { t } = useTranslation();
  const prefersReducedMotion = useReducedMotion();
  const [imageError, setImageError] = useState(false);
  const [imageLoaded, setImageLoaded] = useState(false);

  const breatheAnimation = prefersReducedMotion ? {} : {
    y: [-10, 10, -10],
  };

  const breatheTransition = prefersReducedMotion ? {} : {
    duration: 4,
    repeat: Infinity,
    ease: 'easeInOut',
  };

  if (imageError) {
    return (
      <div className="text-center text-gray-400">
        <p>{t('hero.imageError', 'Failed to load device image')}</p>
      </div>
    );
  }

  return (
    <motion.div
      className="relative z-10 transform-gpu"
      animate={breatheAnimation}
      transition={breatheTransition}
    >
      {!imageLoaded && (
        <div className="w-64 sm:w-80 md:w-96 h-64 sm:h-80 md:h-96 bg-omen-card animate-pulse rounded-lg" />
      )}

      <motion.img
        src={imageSrc}
        alt={t('hero.altDevice')}
        className={`w-64 sm:w-80 md:w-96 h-auto drop-shadow-2xl ${!imageLoaded ? 'hidden' : ''}`}
        initial={{ scale: 0, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ duration: 0.8, delay: 0.3 }}
        onLoad={() => setImageLoaded(true)}
        onError={() => setImageError(true)}
        loading="eager"
      />

      {/* Glow effect */}
      <motion.div
        className="absolute inset-0 rounded-full blur-3xl bg-omen-neon-purple opacity-30"
        animate={prefersReducedMotion ? {} : {
          scale: [1, 1.2, 1],
          opacity: [0.3, 0.5, 0.3],
        }}
        transition={{ duration: 2, repeat: Infinity }}
        aria-hidden="true"
      />
    </motion.div>
  );
};
