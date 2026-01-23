import React from 'react';
import { motion } from 'framer-motion';
import { useTranslation } from 'react-i18next';

interface WizardSpriteProps {
  imageSrc: string;
  visible: boolean;
}

export const WizardSprite: React.FC<WizardSpriteProps> = ({
  imageSrc,
  visible
}) => {
  const { t } = useTranslation();

  if (!visible) {
    return null;
  }

  return (
    <>
      {/* Wizard sprite */}
      <motion.img
        src={imageSrc}
        alt={t('hero.altWizard')}
        className="absolute -top-16 left-1/2 -translate-x-1/2 w-24 h-24 sm:w-32 sm:h-32"
        initial={{ y: -100, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ duration: 1, type: 'spring' }}
      />

      {/* Purple energy line */}
      <motion.div
        className="absolute top-8 sm:top-16 left-1/2 -translate-x-1/2 w-0.5 h-16 sm:h-24 bg-gradient-to-b from-omen-neon-purple to-transparent"
        initial={{ scaleY: 0, opacity: 0 }}
        animate={{ scaleY: 1, opacity: 0.6 }}
        transition={{ duration: 0.8, delay: 0.5 }}
        aria-hidden="true"
      />
    </>
  );
};
