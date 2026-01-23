import React from 'react';
import { motion } from 'framer-motion';
import { useTranslation } from 'react-i18next';
import { GlassButton } from '@olorin/shared';

interface FooterCTAProps {
  onCtaClick: () => void;
}

export const FooterCTA: React.FC<FooterCTAProps> = ({ onCtaClick }) => {
  const { t } = useTranslation();

  return (
    <section
      className="relative py-24 sm:py-32 px-4 bg-gradient-to-b from-omen-void to-black safe-bottom"
      aria-labelledby="footer-cta-heading"
    >
      <div className="max-w-7xl mx-auto text-center">
        {/* Device on pedestal */}
        <motion.div
          className="mb-12"
          initial={{ opacity: 0, scale: 0.8 }}
          whileInView={{ opacity: 1, scale: 1 }}
          viewport={{ once: true }}
          transition={{ duration: 0.8 }}
        >
          <div className="relative inline-block">
            <img
              src="/images/Omen.webp"
              alt={t('hero.altDevice')}
              className="w-48 h-auto sm:w-56 md:w-64 mx-auto opacity-80"
              loading="lazy"
            />
            {/* Pedestal effect */}
            <div
              className="absolute -bottom-8 left-1/2 -translate-x-1/2 w-36 sm:w-44 md:w-48 h-4 bg-gradient-to-r from-transparent via-omen-neon-purple/30 to-transparent"
              aria-hidden="true"
            />
          </div>
        </motion.div>

        {/* Final Call */}
        <motion.h2
          id="footer-cta-heading"
          className="text-3xl sm:text-4xl md:text-5xl lg:text-6xl font-black mb-6 text-white"
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ delay: 0.2 }}
        >
          {t('footer.title')}
        </motion.h2>

        <motion.p
          className="text-lg sm:text-xl text-gray-400 mb-12"
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ delay: 0.3 }}
        >
          {t('footer.subtitle')}
        </motion.p>

        {/* CTA Button */}
        <motion.div
          initial={{ opacity: 0, scale: 0.8 }}
          whileInView={{ opacity: 1, scale: 1 }}
          viewport={{ once: true }}
          transition={{ delay: 0.4 }}
        >
          <GlassButton
            onClick={onCtaClick}
            variant="outline"
            size="lg"
            className="
              min-w-[220px]
              sm:px-12 sm:py-6
              text-lg sm:text-xl
              font-orbitron
              border-omen-neon-purple
              text-white
              hover:bg-omen-neon-purple/20
              active:scale-95
              shadow-lg shadow-omen-neon-purple/50
            "
            aria-label={t('footer.cta')}
          >
            {t('footer.cta')}
          </GlassButton>
        </motion.div>
      </div>
    </section>
  );
};
