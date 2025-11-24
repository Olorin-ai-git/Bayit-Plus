import React from 'react';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { CheckCircle, Zap, ArrowRight } from 'lucide-react';

const BenefitsSection: React.FC = () => {
  const { t } = useTranslation();
  const benefits = t('benefits.items', { returnObjects: true }) as string[];

  return (
    <section className="py-20 bg-corporate-bgSecondary/50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
          <div>
            <h2 className="text-3xl md:text-4xl font-bold text-corporate-textPrimary mb-6">
              {t('benefits.title')}
            </h2>
            <p className="text-lg text-corporate-textSecondary mb-8">
              {t('benefits.subtitle')}
            </p>
            <div className="space-y-4">
              {benefits.map((benefit, index) => (
                <div key={index} className="flex items-center space-x-3">
                  <CheckCircle className="h-5 w-5 text-green-400 flex-shrink-0" />
                  <span className="text-corporate-textSecondary">{benefit}</span>
                </div>
              ))}
            </div>
          </div>
          <div className="relative">
            <div className="glass-card bg-gradient-to-br from-corporate-accentPrimary/30 to-corporate-accentSecondary/30 p-8">
              <div className="flex items-center space-x-3 mb-6">
                <Zap className="h-8 w-8 text-corporate-accentPrimary" />
                <h3 className="text-2xl font-bold text-corporate-textPrimary">{t('benefits.cta.title')}</h3>
              </div>
              <p className="text-corporate-textSecondary mb-6">
                {t('benefits.cta.description')}
              </p>
              <Link
                to="/contact"
                className="bg-corporate-accentPrimary text-white px-6 py-3 rounded-lg font-semibold hover:brightness-110 transition-all duration-200 inline-flex items-center space-x-2 shadow-lg"
              >
                <span>{t('benefits.cta.button')}</span>
                <ArrowRight className="h-4 w-4" />
              </Link>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};

export default BenefitsSection;
