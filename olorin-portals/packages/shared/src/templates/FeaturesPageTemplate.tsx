import React from 'react';
import { GlassCard, GlowingIcon, GlassButton, HeroSection } from '../components';
import { CheckCircle, ArrowRight, Zap } from 'lucide-react';
import { AccentColor } from '../types/branding.types';

export interface Feature {
  title: string;
  description: string;
  icon: React.ReactNode;
  highlights?: string[];
  badge?: string;
}

export interface FeatureCategory {
  title: string;
  description?: string;
  features: Feature[];
}

export interface TechSpec {
  label: string;
  value: string;
}

export interface FeaturesPageTemplateProps {
  title: string;
  titleHighlight?: string;
  subtitle: string;
  heroIcon?: React.ReactNode;
  categories?: FeatureCategory[];
  features?: Feature[];
  techSpecs?: TechSpec[];
  techSpecsTitle?: string;
  workflowTitle?: string;
  workflowSteps?: { title: string; description: string; icon: React.ReactNode }[];
  ctaTitle?: string;
  ctaSubtitle?: string;
  ctaButton?: string;
  ctaAction?: () => void;
  accentColor?: AccentColor;
}

export const FeaturesPageTemplate: React.FC<FeaturesPageTemplateProps> = ({
  title,
  titleHighlight,
  subtitle,
  heroIcon,
  categories,
  features,
  techSpecs,
  techSpecsTitle = 'Technical Specifications',
  workflowTitle,
  workflowSteps,
  ctaTitle,
  ctaSubtitle,
  ctaButton,
  ctaAction,
  accentColor = 'purple',
}) => {
  const renderFeatureCard = (feature: Feature, index: number) => (
    <GlassCard key={feature.title} variant="interactive" className={`p-6 animate-fade-in-up animate-delay-${(index % 4) + 1}00`}>
      <div className="mb-4 flex items-center justify-between">
        <GlowingIcon icon={feature.icon} color={accentColor} size="lg" />
        {feature.badge && (
          <span className="px-3 py-1 rounded-full text-xs bg-wizard-accent-purple/20 text-wizard-accent-purple font-medium">
            {feature.badge}
          </span>
        )}
      </div>
      <h3 className="text-xl font-bold text-wizard-text-primary mb-3">{feature.title}</h3>
      <p className="text-wizard-text-secondary mb-4">{feature.description}</p>
      {feature.highlights && feature.highlights.length > 0 && (
        <ul className="space-y-2">
          {feature.highlights.map((highlight) => (
            <li key={highlight} className="flex items-center space-x-2 text-sm">
              <CheckCircle className="w-4 h-4 text-green-400 flex-shrink-0" />
              <span className="text-wizard-text-secondary">{highlight}</span>
            </li>
          ))}
        </ul>
      )}
    </GlassCard>
  );

  return (
    <div className="features-page">
      <HeroSection
        title={title}
        titleHighlight={titleHighlight}
        subtitle={subtitle}
        icon={heroIcon || <Zap className="w-24 h-24" />}
        backgroundPattern="gradient"
      />

      {categories && categories.length > 0 ? (
        categories.map((category, catIndex) => (
          <section
            key={category.title}
            className={`wizard-section ${catIndex % 2 === 0 ? 'bg-wizard-bg-primary' : 'bg-wizard-bg-deep'}`}
          >
            <div className="wizard-container">
              <div className="text-center mb-12">
                <h2 className="text-3xl md:text-4xl font-bold wizard-text mb-4">{category.title}</h2>
                {category.description && (
                  <p className="text-lg text-wizard-text-secondary max-w-2xl mx-auto">{category.description}</p>
                )}
              </div>
              <div className="wizard-grid-3">
                {category.features.map((feature, index) => renderFeatureCard(feature, index))}
              </div>
            </div>
          </section>
        ))
      ) : features && features.length > 0 ? (
        <section className="wizard-section bg-wizard-bg-primary">
          <div className="wizard-container">
            <div className="wizard-grid-3">
              {features.map((feature, index) => renderFeatureCard(feature, index))}
            </div>
          </div>
        </section>
      ) : null}

      {workflowTitle && workflowSteps && workflowSteps.length > 0 && (
        <section className="wizard-section bg-wizard-bg-deep">
          <div className="wizard-container">
            <h2 className="text-3xl md:text-4xl font-bold text-center wizard-text mb-12">{workflowTitle}</h2>
            <div className="wizard-grid-4">
              {workflowSteps.map((step, index) => (
                <GlassCard key={step.title} className="p-6 relative">
                  <div className="flex items-center space-x-4 mb-4">
                    <div className="w-10 h-10 rounded-full bg-wizard-accent-purple/20 border-2 border-wizard-accent-purple flex items-center justify-center font-bold text-wizard-accent-purple">
                      {index + 1}
                    </div>
                    <GlowingIcon icon={step.icon} color={accentColor} size="sm" />
                  </div>
                  <h3 className="text-lg font-bold text-wizard-text-primary mb-2">{step.title}</h3>
                  <p className="text-wizard-text-secondary text-sm">{step.description}</p>
                  {index < workflowSteps.length - 1 && (
                    <ArrowRight className="hidden md:block absolute -right-4 top-1/2 -translate-y-1/2 w-6 h-6 text-wizard-accent-purple" />
                  )}
                </GlassCard>
              ))}
            </div>
          </div>
        </section>
      )}

      {techSpecs && techSpecs.length > 0 && (
        <section className="wizard-section bg-wizard-bg-primary">
          <div className="wizard-container max-w-4xl">
            <h2 className="text-3xl md:text-4xl font-bold text-center wizard-text mb-12">{techSpecsTitle}</h2>
            <GlassCard className="p-8">
              <div className="grid md:grid-cols-2 gap-6">
                {techSpecs.map((spec) => (
                  <div key={spec.label} className="flex justify-between items-center py-3 border-b border-wizard-border-primary last:border-0">
                    <span className="text-wizard-text-secondary">{spec.label}</span>
                    <span className="text-wizard-text-primary font-semibold">{spec.value}</span>
                  </div>
                ))}
              </div>
            </GlassCard>
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

export default FeaturesPageTemplate;
