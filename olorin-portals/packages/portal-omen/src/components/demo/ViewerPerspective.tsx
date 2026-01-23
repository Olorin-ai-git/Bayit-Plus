import React from 'react';
import { motion } from 'framer-motion';
import { useTranslation } from 'react-i18next';
import { WizardState } from './useWizardStateMachine';

interface ViewerPerspectiveProps {
  state: WizardState;
  resultText: string;
}

export const ViewerPerspective: React.FC<ViewerPerspectiveProps> = ({
  state,
  resultText
}) => {
  const { t } = useTranslation();

  return (
    <div className="relative">
      <motion.div
        className="bg-black rounded-2xl sm:rounded-3xl p-6 sm:p-8 aspect-video flex items-center justify-center border-4 transition-colors"
        animate={{
          borderColor: state === 'result'
            ? 'rgba(176, 38, 255, 0.8)'
            : 'rgba(176, 38, 255, 0.3)'
        }}
      >
        {state === 'result' && resultText && (
          <motion.p
            className="text-3xl sm:text-4xl md:text-5xl lg:text-6xl font-black text-omen-neon-cyan text-center"
            initial={{ scale: 0, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ type: 'spring', duration: 0.6 }}
          >
            {resultText}
          </motion.p>
        )}

        {state !== 'result' && (
          <p className="text-lg sm:text-xl md:text-2xl text-gray-500">
            {t('demo.viewer')}
          </p>
        )}
      </motion.div>

      <p className="text-center text-gray-400 text-xs sm:text-sm mt-4 px-2">
        {t('demo.description')}
      </p>

      {/* Screen reader announcements */}
      <div className="sr-only" role="status" aria-live="polite">
        {state === 'result' && t('demo.srResult', { text: resultText })}
      </div>
    </div>
  );
};
