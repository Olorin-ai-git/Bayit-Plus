import React from 'react';
import { motion } from 'framer-motion';
import { useTranslation } from 'react-i18next';
import { WizardState } from './useWizardStateMachine';

interface UserPerspectiveProps {
  state: WizardState;
}

export const UserPerspective: React.FC<UserPerspectiveProps> = ({ state }) => {
  const { t } = useTranslation();

  return (
    <div className="relative">
      {/* Silhouette with device */}
      <motion.div
        className="w-48 h-48 sm:w-56 sm:h-56 md:w-64 md:h-64 mx-auto relative rounded-full bg-gradient-to-b from-white/10 to-white/5"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
      >
        {/* Device on forehead */}
        <motion.img
          src="/images/Omen.webp"
          alt=""
          className="absolute top-4 left-1/2 -translate-x-1/2 w-24 h-auto sm:w-32"
          animate={{
            scale: state === 'thinking' ? [1, 1.05, 1] : 1
          }}
          transition={{
            duration: 0.5,
            repeat: state === 'thinking' ? Infinity : 0
          }}
          aria-hidden="true"
        />
      </motion.div>

      {/* State indicator */}
      <motion.div
        className="mt-6 text-center"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: -20 }}
        key={state}
      >
        <img
          src="/images/Wizard.png"
          alt=""
          className={`w-16 h-16 sm:w-20 sm:h-20 mx-auto mb-2 ${
            state === 'thinking' ? 'animate-pulse-slow' : ''
          }`}
          aria-hidden="true"
        />
        <p className={`text-sm sm:text-base ${
          state === 'speaking' ? 'text-omen-neon-cyan' :
          state === 'thinking' ? 'text-omen-neon-purple' :
          'text-omen-gold'
        }`}>
          {t(`demo.${state}`)}
        </p>
      </motion.div>
    </div>
  );
};
