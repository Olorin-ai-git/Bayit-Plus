import React from 'react';
import { GlassCard, GlowingIcon, GlassButton, HeroSection } from '../components';
import { ArrowRight, Monitor, Smartphone, Globe } from 'lucide-react';
import { AccentColor } from '../types/branding.types';
import { DemoSections, DemoSection } from './DemoSections';

export interface DemoStep {
  title: string;
  description: string;
  icon: React.ReactNode;
}

export interface DemoFeature {
  title: string;
  description: string;
  icon: React.ReactNode;
  badge?: string;
}

export type { DemoSection };

export interface DemoPageTemplateProps {
  title: string;
  titleHighlight?: string;
  subtitle: string;
  heroIcon?: React.ReactNode;
  liveDemoUrl?: string;
  liveDemoText?: string;
  scheduleDemoText?: string;
  onScheduleDemo?: () => void;
  steps?: DemoStep[];
  stepsTitle?: string;
  features?: DemoFeature[];
  featuresTitle?: string;
  sections?: DemoSection[];
  platforms?: ('web' | 'mobile' | 'desktop')[];
  platformsTitle?: string;
  ctaTitle?: string;
  ctaSubtitle?: string;
  ctaButton?: string;
  ctaAction?: () => void;
  accentColor?: AccentColor;
}

const platformIcons = {
  web: <Globe className="w-8 h-8" />,
  mobile: <Smartphone className="w-8 h-8" />,
  desktop: <Monitor className="w-8 h-8" />,
};

const platformLabels = {
  web: 'Web App',
  mobile: 'Mobile App',
  desktop: 'Desktop App',
};

export const DemoPageTemplate: React.FC<DemoPageTemplateProps> = ({
  title,
  titleHighlight,
  subtitle,
  heroIcon,
  liveDemoUrl,
  liveDemoText = 'Try Live Demo',
  scheduleDemoText = 'Schedule Demo',
  onScheduleDemo,
  steps,
  stepsTitle = 'How It Works',
  features,
  featuresTitle = 'Key Features',
  sections,
  platforms,
  platformsTitle = 'Available On',
  ctaTitle,
  ctaSubtitle,
  ctaButton,
  ctaAction,
  accentColor = 'purple',
}) => {
  return (
    <div className="demo-page">
      <HeroSection
        title={title}
        titleHighlight={titleHighlight}
        subtitle={subtitle}
        icon={heroIcon}
        backgroundPattern="circuit"
        primaryCTA={liveDemoUrl ? { text: liveDemoText, onClick: () => window.open(liveDemoUrl, '_blank') } : undefined}
        secondaryCTA={onScheduleDemo ? { text: scheduleDemoText, onClick: onScheduleDemo } : undefined}
      />

      {steps && steps.length > 0 && (
        <section className="wizard-section bg-wizard-bg-primary">
          <div className="wizard-container">
            <h2 className="text-3xl md:text-4xl font-bold text-center wizard-text mb-12">{stepsTitle}</h2>
            <div className="wizard-grid-4">
              {steps.map((step, index) => (
                <GlassCard key={step.title} className="p-6 text-center relative">
                  <div className="absolute -top-4 left-1/2 -translate-x-1/2 w-8 h-8 rounded-full bg-wizard-accent-purple flex items-center justify-center text-white font-bold text-sm">
                    {index + 1}
                  </div>
                  <div className="mb-4 mt-2 flex justify-center">
                    <GlowingIcon icon={step.icon} color={accentColor} size="lg" />
                  </div>
                  <h3 className="text-lg font-bold text-wizard-text-primary mb-2">{step.title}</h3>
                  <p className="text-wizard-text-secondary text-sm">{step.description}</p>
                  {index < steps.length - 1 && (
                    <ArrowRight className="hidden md:block absolute -right-4 top-1/2 -translate-y-1/2 w-8 h-8 text-wizard-accent-purple" />
                  )}
                </GlassCard>
              ))}
            </div>
          </div>
        </section>
      )}

      {features && features.length > 0 && (
        <section className="wizard-section bg-wizard-bg-deep">
          <div className="wizard-container">
            <h2 className="text-3xl md:text-4xl font-bold text-center wizard-text mb-12">{featuresTitle}</h2>
            <div className="wizard-grid-3">
              {features.map((feature) => (
                <GlassCard key={feature.title} variant="interactive" className="p-6">
                  <div className="flex items-start space-x-4">
                    <GlowingIcon icon={feature.icon} color={accentColor} size="md" />
                    <div className="flex-1">
                      <div className="flex items-center space-x-2 mb-2">
                        <h3 className="text-lg font-bold text-wizard-text-primary">{feature.title}</h3>
                        {feature.badge && (
                          <span className="px-2 py-0.5 rounded text-xs bg-wizard-accent-purple/20 text-wizard-accent-purple">{feature.badge}</span>
                        )}
                      </div>
                      <p className="text-wizard-text-secondary text-sm">{feature.description}</p>
                    </div>
                  </div>
                </GlassCard>
              ))}
            </div>
          </div>
        </section>
      )}

      {sections && sections.length > 0 && (
        <section className="wizard-section bg-wizard-bg-primary">
          <div className="wizard-container">
            <DemoSections sections={sections} />
          </div>
        </section>
      )}

      {platforms && platforms.length > 0 && (
        <section className="wizard-section bg-wizard-bg-deep">
          <div className="wizard-container">
            <h2 className="text-3xl md:text-4xl font-bold text-center wizard-text mb-12">{platformsTitle}</h2>
            <div className="flex justify-center gap-8">
              {platforms.map((platform) => (
                <GlassCard key={platform} className="p-6 text-center">
                  <GlowingIcon icon={platformIcons[platform]} color={accentColor} size="lg" />
                  <p className="mt-4 text-wizard-text-primary font-medium">{platformLabels[platform]}</p>
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

export default DemoPageTemplate;
