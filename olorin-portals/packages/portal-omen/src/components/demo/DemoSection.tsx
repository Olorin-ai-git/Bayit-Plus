import React from 'react';
import { motion } from 'framer-motion';
import { useTranslation } from 'react-i18next';
import { useWizardStateMachine } from './useWizardStateMachine';
import { useTypewriter } from './useTypewriter';
import { UserPerspective } from './UserPerspective';
import { ViewerPerspective } from './ViewerPerspective';

export const DemoSection: React.FC = () => {
  const { t } = useTranslation();
  const { state } = useWizardStateMachine({ autoPlay: true });
  const resultText = useTypewriter(
    t('demo.resultText'),
    state === 'result'
  );

  return (
    <section
      className="relative py-16 sm:py-20 px-4"
      aria-labelledby="demo-heading"
    >
      <div className="max-w-7xl mx-auto">
        {/* Section Heading */}
        <motion.h2
          id="demo-heading"
          className="text-4xl sm:text-5xl md:text-6xl lg:text-7xl font-black text-center mb-4 text-white"
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
        >
          {t('demo.title')}
        </motion.h2>

        <motion.p
          className="text-lg sm:text-xl text-center text-gray-400 mb-12 sm:mb-16"
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ delay: 0.2 }}
        >
          {t('demo.subtitle')}
        </motion.p>

        {/* Demo Grid */}
        <div className="grid gap-8 md:gap-12 md:grid-cols-2 items-center">
          {/* Left: User with device */}
          <UserPerspective state={state} />

          {/* Right: Viewer perspective */}
          <ViewerPerspective state={state} resultText={resultText} />
        </div>
      </div>
    </section>
  );
};
