import React from 'react';
import { motion } from 'framer-motion';
import { useTranslation } from 'react-i18next';
import { LucideIcon } from 'lucide-react';
import { GlassCard } from '@olorin/shared';

interface TechSpecCardProps {
  icon: LucideIcon;
  titleKey: string;
  descriptionKey: string;
  delay?: number;
}

export const TechSpecCard: React.FC<TechSpecCardProps> = ({
  icon: Icon,
  titleKey,
  descriptionKey,
  delay = 0
}) => {
  const { t } = useTranslation();

  return (
    <motion.article
      className="relative"
      initial={{ opacity: 0, y: 50 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true }}
      transition={{ duration: 0.6, delay }}
      role="article"
      aria-labelledby={`spec-${titleKey}`}
    >
      <GlassCard
        variant="interactive"
        className="p-6 sm:p-8 min-h-[240px] glow-omen"
      >
        {/* Icon */}
        <div className="relative mb-6">
          <div className="w-14 h-14 sm:w-16 sm:h-16 rounded-full bg-gradient-to-br from-omen-neon-purple to-omen-neon-cyan flex items-center justify-center">
            <Icon className="w-7 h-7 sm:w-8 sm:h-8 text-white" aria-hidden="true" />
          </div>
        </div>

        {/* Title */}
        <h3
          id={`spec-${titleKey}`}
          className="text-xl sm:text-2xl font-bold mb-4 text-white transition-colors"
        >
          {t(titleKey)}
        </h3>

        {/* Description */}
        <p className="text-sm sm:text-base text-gray-400 leading-relaxed">
          {t(descriptionKey)}
        </p>
      </GlassCard>
    </motion.article>
  );
};
