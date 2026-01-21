import React from 'react';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { ArrowRight } from 'lucide-react';

const CTASection: React.FC = () => {
  const { t } = useTranslation();

  return (
    <section className="py-20 bg-gradient-to-r from-corporate-accentPrimary/20 via-corporate-accentSecondary/20 to-corporate-accentPrimary/20">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
        <h2 className="text-3xl md:text-4xl font-bold mb-6 text-corporate-textPrimary">
          {t('cta.title')}
        </h2>
        <p className="text-xl text-corporate-textSecondary mb-8 max-w-2xl mx-auto">
          {t('cta.subtitle')}
        </p>
        <div className="flex flex-col sm:flex-row gap-4 justify-center">
          <Link
            to="/contact"
            className="bg-corporate-accentPrimary text-white px-8 py-4 rounded-lg text-lg font-semibold hover:brightness-110 transition-all duration-200 flex items-center justify-center space-x-2 shadow-lg"
          >
            <span>{t('cta.startJourney')}</span>
            <ArrowRight className="h-5 w-5" />
          </Link>
          <Link
            to="/about"
            className="border-2 border-corporate-accentPrimary text-corporate-accentPrimary px-8 py-4 rounded-lg text-lg font-semibold hover:bg-corporate-accentPrimary/10 backdrop-blur-sm transition-all duration-200"
          >
            {t('cta.learnAbout')}
          </Link>
        </div>
      </div>
    </section>
  );
};

export default CTASection;
