import React from 'react';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { ArrowRight, Zap } from 'lucide-react';

const HeroSection: React.FC = () => {
  const { t } = useTranslation();

  return (
    <section className="relative bg-gradient-to-br from-corporate-bgPrimary via-corporate-bgSecondary to-corporate-bgPrimary py-20 overflow-hidden">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center">
          <div className="flex flex-col sm:flex-row justify-center items-center space-y-4 sm:space-y-0 sm:space-x-6 mb-8 animate-fade-in-up">
            <img
              src={`${process.env.PUBLIC_URL}/assets/images/Olorin-Logo-Wizard-Only-transparent.png`}
              alt="Olorin.ai Wizard Logo"
              className="h-24 sm:h-32 w-auto brightness-110 animate-float"
              onError={(e) => {
                const target = e.target as HTMLImageElement;
                target.src = `${process.env.PUBLIC_URL}/logo.png`;
              }}
            />
            <div className="text-4xl sm:text-6xl md:text-7xl font-bold text-corporate-textPrimary">
              Olorin<span className="text-corporate-accentPrimary text-gradient-animate">.ai</span>
            </div>
          </div>
          <h1 className="text-4xl md:text-6xl font-bold text-corporate-textPrimary mb-6 animate-fade-in-up animate-delay-100">
            {t('hero.title')}
            <span className="block text-corporate-accentPrimary">{t('hero.titleHighlight')}</span>
          </h1>
          <p className="text-xl text-corporate-textSecondary mb-8 max-w-3xl mx-auto animate-fade-in-up animate-delay-200">
            {t('hero.subtitle')}
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center animate-fade-in-up animate-delay-300">
            <Link
              to="/contact"
              className="bg-corporate-accentPrimary text-white px-8 py-4 rounded-lg text-lg font-semibold hover:brightness-110 hover-lift button-press ripple transition-all duration-200 flex items-center justify-center space-x-2 shadow-lg"
            >
              <span>{t('hero.ctaStart')}</span>
              <ArrowRight className="h-5 w-5 icon-bounce" />
            </Link>
            <a
              href="https://olorin-ai.web.app/investigation?demo=true"
              target="_blank"
              rel="noopener noreferrer"
              className="bg-gradient-to-r from-corporate-accentSecondary to-corporate-accentPrimary text-white px-8 py-4 rounded-lg text-lg font-semibold hover:brightness-110 hover-lift button-press loading-pulse transition-all duration-200 flex items-center justify-center space-x-2 shadow-lg"
            >
              <span>{t('hero.ctaDemo')}</span>
              <Zap className="h-5 w-5 icon-bounce" />
            </a>
            <Link
              to="/services"
              className="border-2 border-corporate-accentPrimary text-corporate-accentPrimary px-8 py-4 rounded-lg text-lg font-semibold hover:bg-corporate-accentPrimary/10 hover-border-glow backdrop-blur-sm transition-all duration-200"
            >
              {t('hero.ctaLearn')}
            </Link>
          </div>
        </div>
      </div>
    </section>
  );
};

export default HeroSection;
