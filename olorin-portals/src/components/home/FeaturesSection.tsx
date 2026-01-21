import React from 'react';
import { useTranslation } from 'react-i18next';
import { Brain, Search, AlertTriangle, Database } from 'lucide-react';

const FeaturesSection: React.FC = () => {
  const { t } = useTranslation();

  const features = [
    {
      icon: <Brain className="h-6 w-6" />,
      title: t('features.agent.title'),
      description: t('features.agent.description')
    },
    {
      icon: <Search className="h-6 w-6" />,
      title: t('features.realtime.title'),
      description: t('features.realtime.description')
    },
    {
      icon: <AlertTriangle className="h-6 w-6" />,
      title: t('features.proactive.title'),
      description: t('features.proactive.description')
    },
    {
      icon: <Database className="h-6 w-6" />,
      title: t('features.intelligence.title'),
      description: t('features.intelligence.description')
    }
  ];

  return (
    <section className="py-20 bg-corporate-bgPrimary">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-16">
          <h2 className="text-3xl md:text-4xl font-bold text-corporate-textPrimary mb-4">
            {t('features.title')}
          </h2>
          <p className="text-xl text-corporate-textSecondary max-w-3xl mx-auto">
            {t('features.subtitle')}
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          {features.map((feature, index) => (
            <div key={index} className="glass-card p-8 hover:border-corporate-accentPrimary/60 transition-all duration-200">
              <div className="flex items-start space-x-4">
                <div className="flex-shrink-0 bg-corporate-accentPrimary/20 backdrop-blur-sm p-3 rounded-lg border border-corporate-accentPrimary/30">
                  <div className="text-corporate-accentPrimary">
                    {feature.icon}
                  </div>
                </div>
                <div>
                  <h3 className="text-xl font-semibold text-corporate-textPrimary mb-2">
                    {feature.title}
                  </h3>
                  <p className="text-corporate-textSecondary">
                    {feature.description}
                  </p>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
};

export default FeaturesSection;
