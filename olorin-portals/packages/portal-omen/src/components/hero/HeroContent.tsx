import React from 'react';
import { motion } from 'framer-motion';
import { useTranslation } from 'react-i18next';
import { GlassButton, useRTL } from '@olorin/shared';

interface HeroContentProps {
  onCtaClick: () => void;
}

export const HeroContent: React.FC<HeroContentProps> = ({ onCtaClick }) => {
  const { t } = useTranslation();
  const { isRTL } = useRTL();

  return (
    <div className="text-center space-y-6 sm:space-y-8 md:space-y-12 px-4">
      {/* Headline */}
      <motion.h1
        id="main-headline"
        className={`
          text-4xl sm:text-5xl md:text-7xl lg:text-9xl
          font-black
          leading-tight
          bg-gradient-to-${isRTL ? 'l' : 'r'}
          from-omen-neon-purple
          via-omen-neon-cyan
          to-omen-neon-purple
          bg-clip-text
          text-transparent
          [-webkit-background-clip:text]
          [-webkit-text-fill-color:transparent]
        `}
        initial={{ opacity: 0, y: 50 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.8, delay: 0.5 }}
      >
        {t('hero.headline')}
      </motion.h1>

      {/* Sub-headline */}
      <motion.div
        className="space-y-2 max-w-3xl mx-auto"
        initial={{ opacity: 0, y: 30 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.8, delay: 0.7 }}
      >
        <p className="text-lg sm:text-xl md:text-2xl lg:text-3xl text-gray-300">
          {t('hero.subheadline')}
        </p>
        <p className="text-lg sm:text-xl md:text-2xl lg:text-3xl text-omen-neon-cyan">
          {t('hero.subheadline2')}
        </p>
      </motion.div>

      {/* CTA Button */}
      <motion.div
        initial={{ opacity: 0, scale: 0.8 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.6, delay: 0.9 }}
      >
        <GlassButton
          onClick={onCtaClick}
          variant="outline"
          size="lg"
          className="
            min-w-[200px]
            sm:px-12 sm:py-6
            text-base sm:text-lg md:text-xl
            font-orbitron
            border-omen-neon-purple
            text-white
            hover:bg-omen-neon-purple/20
            active:scale-95
            shadow-lg shadow-omen-neon-purple/50
          "
          aria-label={String(t('hero.cta'))}
        >
          {t('hero.cta')}
        </GlassButton>
      </motion.div>
    </div>
  );
};
