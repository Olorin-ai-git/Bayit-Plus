import React from 'react';
import { motion } from 'framer-motion';
import { useTranslation } from 'react-i18next';
import { Eye, Brain, Mic } from 'lucide-react';
import { TechSpecCard } from './TechSpecCard';

export const TechSpecsSection: React.FC = () => {
  const { t } = useTranslation();

  return (
    <section
      className="relative py-16 sm:py-20 px-4"
      aria-labelledby="specs-heading"
    >
      {/* Background watermark */}
      <div
        className="absolute inset-0 flex items-center justify-center opacity-5"
        aria-hidden="true"
      >
        <img
          src="/images/Omen.webp"
          alt=""
          className="w-full max-w-3xl lg:max-w-4xl"
        />
      </div>

      <div className="relative max-w-7xl mx-auto">
        {/* Section Heading */}
        <motion.h2
          id="specs-heading"
          className="text-4xl sm:text-5xl md:text-6xl lg:text-7xl font-black text-center mb-4 text-white"
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
        >
          {t('specs.title')}
        </motion.h2>

        <motion.p
          className="text-lg sm:text-xl text-center text-gray-400 mb-12 sm:mb-16"
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ delay: 0.2 }}
        >
          {t('specs.subtitle')}
        </motion.p>

        {/* Cards Grid */}
        <div className="grid gap-6 sm:gap-8 md:grid-cols-3">
          <TechSpecCard
            icon={Eye}
            titleKey="specs.display.title"
            descriptionKey="specs.display.description"
            delay={0}
          />

          <TechSpecCard
            icon={Brain}
            titleKey="specs.core.title"
            descriptionKey="specs.core.description"
            delay={0.1}
          />

          <TechSpecCard
            icon={Mic}
            titleKey="specs.array.title"
            descriptionKey="specs.array.description"
            delay={0.2}
          />
        </div>
      </div>
    </section>
  );
};
