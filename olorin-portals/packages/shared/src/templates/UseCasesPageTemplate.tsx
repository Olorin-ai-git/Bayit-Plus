import React, { useState } from 'react';
import { GlassCard, GlowingIcon, GlassButton, HeroSection } from '../components';
import { ArrowRight, TrendingUp, Briefcase } from 'lucide-react';
import { AccentColor } from '../types/branding.types';
import { UseCaseDetail, UseCase } from './UseCaseDetail';

export type { UseCase };

export interface IndustryStat {
  value: string;
  label: string;
}

export interface UseCasesPageTemplateProps {
  title: string;
  titleHighlight?: string;
  subtitle: string;
  heroIcon?: React.ReactNode;
  useCases: UseCase[];
  industryStats?: IndustryStat[];
  statsTitle?: string;
  ctaTitle?: string;
  ctaSubtitle?: string;
  ctaButton?: string;
  ctaAction?: () => void;
  accentColor?: AccentColor;
}

export const UseCasesPageTemplate: React.FC<UseCasesPageTemplateProps> = ({
  title,
  titleHighlight,
  subtitle,
  heroIcon,
  useCases,
  industryStats,
  statsTitle = 'Impact Across Industries',
  ctaTitle,
  ctaSubtitle,
  ctaButton,
  ctaAction,
  accentColor = 'purple',
}) => {
  const [activeCase, setActiveCase] = useState(useCases[0]?.id || '');
  const selectedCase = useCases.find((uc) => uc.id === activeCase) || useCases[0];

  return (
    <div className="use-cases-page">
      <HeroSection
        title={title}
        titleHighlight={titleHighlight}
        subtitle={subtitle}
        icon={heroIcon || <Briefcase className="w-24 h-24" />}
        backgroundPattern="gradient"
      />

      <section className="wizard-section bg-wizard-bg-primary">
        <div className="wizard-container">
          <div className="flex flex-wrap justify-center gap-4 mb-12">
            {useCases.map((uc) => (
              <button
                key={uc.id}
                onClick={() => setActiveCase(uc.id)}
                className={`px-6 py-3 rounded-lg font-medium transition-all flex items-center space-x-2 ${
                  activeCase === uc.id
                    ? 'bg-wizard-accent-purple text-white'
                    : 'bg-wizard-bg-deep text-wizard-text-secondary hover:text-wizard-text-primary'
                }`}
              >
                <span className="w-5 h-5">{uc.icon}</span>
                <span>{uc.industry}</span>
              </button>
            ))}
          </div>

          {selectedCase && <UseCaseDetail useCase={selectedCase} accentColor={accentColor} />}
        </div>
      </section>

      <section className="wizard-section bg-wizard-bg-deep">
        <div className="wizard-container">
          <h2 className="text-3xl md:text-4xl font-bold text-center wizard-text mb-12">All Industries</h2>
          <div className="wizard-grid-4">
            {useCases.map((uc, index) => (
              <GlassCard
                key={uc.id}
                variant="interactive"
                className={`p-6 cursor-pointer ${activeCase === uc.id ? 'ring-2 ring-wizard-accent-purple' : ''}`}
                onClick={() => {
                  setActiveCase(uc.id);
                  window.scrollTo({ top: 400, behavior: 'smooth' });
                }}
              >
                <div className="mb-4 flex justify-center">
                  <GlowingIcon icon={uc.icon} color={accentColor} size="lg" />
                </div>
                <h3 className="text-lg font-bold text-wizard-text-primary text-center mb-2">{uc.industry}</h3>
                <p className="text-wizard-text-secondary text-sm text-center line-clamp-2">{uc.challenge}</p>
                <div className="mt-4 flex justify-center">
                  <span className="text-wizard-accent-purple text-sm flex items-center">
                    View Details <ArrowRight className="w-4 h-4 ml-1" />
                  </span>
                </div>
              </GlassCard>
            ))}
          </div>
        </div>
      </section>

      {industryStats && industryStats.length > 0 && (
        <section className="wizard-section bg-wizard-bg-primary">
          <div className="wizard-container">
            <h2 className="text-3xl md:text-4xl font-bold text-center wizard-text mb-12">{statsTitle}</h2>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
              {industryStats.map((stat) => (
                <GlassCard key={stat.label} className="p-6 text-center">
                  <TrendingUp className="w-8 h-8 text-wizard-accent-purple mx-auto mb-3" />
                  <div className="text-3xl md:text-4xl font-bold wizard-text mb-2">{stat.value}</div>
                  <div className="text-wizard-text-secondary text-sm">{stat.label}</div>
                </GlassCard>
              ))}
            </div>
          </div>
        </section>
      )}

      {ctaTitle && (
        <section className="wizard-section wizard-gradient-bg wizard-particles">
          <div className="wizard-container">
            <div className="max-w-3xl mx-auto text-center">
              <h2 className="text-3xl md:text-4xl font-bold text-wizard-text-primary mb-6">{ctaTitle}</h2>
              {ctaSubtitle && <p className="text-lg text-wizard-text-secondary mb-8">{ctaSubtitle}</p>}
              {ctaButton && ctaAction && <GlassButton variant="wizard" size="lg" onClick={ctaAction}>{ctaButton}</GlassButton>}
            </div>
          </div>
        </section>
      )}
    </div>
  );
};

export default UseCasesPageTemplate;
