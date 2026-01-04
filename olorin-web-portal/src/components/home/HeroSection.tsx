import React from 'react';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { ArrowRight, Zap, Calculator, Bot, Shield, Clock } from 'lucide-react';

const HeroSection: React.FC = () => {
  const { t } = useTranslation();

  const stats = [
    { icon: Bot, value: '6', label: t('hero.stats.agents') },
    { icon: Shield, value: '180+', label: t('hero.stats.tools') },
    { icon: Clock, value: '<1s', label: t('hero.stats.decisions') },
  ];

  return (
    <section className="relative bg-gradient-to-br from-corporate-bgPrimary via-corporate-bgSecondary to-corporate-bgPrimary py-20 overflow-hidden">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center">
          <div className="flex flex-col sm:flex-row justify-center items-center space-y-4 sm:space-y-0 sm:space-x-6 mb-8 animate-fade-in-up">
            <img
              src={`${process.env.PUBLIC_URL}/assets/images/Olorin-Logo-Wizard-Only-transparent.png`}
              alt="Olorin.ai Wizard Logo"
              className="h-24 sm:h-32 w-auto brightness-110"
              onError={(e) => {
                const target = e.target as HTMLImageElement;
                target.src = `${process.env.PUBLIC_URL}/logo.png`;
              }}
            />
            <div className="text-4xl sm:text-6xl md:text-7xl font-bold text-corporate-textPrimary">
              Olorin<span className="text-corporate-accentPrimary">.ai</span>
            </div>
          </div>
          <h1 className="text-4xl md:text-6xl font-bold text-corporate-textPrimary mb-6 animate-fade-in-up animate-delay-100">
            {t('hero.title')}
            <span className="block text-corporate-accentPrimary">{t('hero.titleHighlight')}</span>
          </h1>
          <p className="text-xl text-corporate-textSecondary mb-8 max-w-3xl mx-auto animate-fade-in-up animate-delay-200">
            {t('hero.subtitle')}
          </p>

          {/* Stats Row */}
          <div className="flex flex-wrap justify-center gap-8 mb-10 animate-fade-in-up animate-delay-250">
            {stats.map((stat, idx) => (
              <div key={idx} className="flex items-center gap-3 glass-card px-5 py-3 rounded-lg">
                <stat.icon className="h-6 w-6 text-corporate-accentPrimary" />
                <div className="text-left">
                  <div className="text-2xl font-bold text-corporate-textPrimary">{stat.value}</div>
                  <div className="text-sm text-corporate-textMuted">{stat.label}</div>
                </div>
              </div>
            ))}
          </div>

          <div className="flex flex-col sm:flex-row gap-4 justify-center animate-fade-in-up animate-delay-300">
            <Link
              to="/demo/live"
              className="bg-gradient-to-r from-corporate-accentSecondary to-corporate-accentPrimary text-white px-8 py-4 rounded-lg text-lg font-semibold hover:brightness-110 hover-lift transition-all duration-200 flex items-center justify-center space-x-2 shadow-lg"
            >
              <span>{t('hero.ctaDemo')}</span>
              <Zap className="h-5 w-5" />
            </Link>
            <Link
              to="/roi"
              className="bg-corporate-accentPrimary text-white px-8 py-4 rounded-lg text-lg font-semibold hover:brightness-110 hover-lift transition-all duration-200 flex items-center justify-center space-x-2 shadow-lg"
            >
              <span>{t('hero.ctaROI')}</span>
              <Calculator className="h-5 w-5" />
            </Link>
            <Link
              to="/contact"
              className="border-2 border-corporate-accentPrimary text-corporate-accentPrimary px-8 py-4 rounded-lg text-lg font-semibold hover:bg-corporate-accentPrimary/10 backdrop-blur-sm transition-all duration-200 flex items-center justify-center space-x-2"
            >
              <span>{t('hero.ctaContact')}</span>
              <ArrowRight className="h-5 w-5" />
            </Link>
          </div>
        </div>
      </div>
    </section>
  );
};

export default HeroSection;
