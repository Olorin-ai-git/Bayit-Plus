import React from 'react';
import { useTranslation } from 'react-i18next';

const StatsSection: React.FC = () => {
  const { t } = useTranslation();

  const stats = [
    { number: t('stats.accuracy'), label: t('stats.accuracyLabel') },
    { number: t('stats.reduction'), label: t('stats.reductionLabel') },
    { number: t('stats.monitoring'), label: t('stats.monitoringLabel') },
    { number: t('stats.response'), label: t('stats.responseLabel') }
  ];

  return (
    <section className="py-16 bg-corporate-bgSecondary/50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-8">
          {stats.map((stat, index) => (
            <div
              key={index}
              className={`text-center glass-card p-6 hover:border-corporate-accentPrimary/60 hover-lift hover-glow transition-all duration-200 animate-scale-in animate-delay-${(index + 1) * 100}`}
            >
              <div className="text-3xl md:text-4xl font-bold text-corporate-accentPrimary mb-2 loading-pulse">
                {stat.number}
              </div>
              <div className="text-corporate-textSecondary">{stat.label}</div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
};

export default StatsSection;
