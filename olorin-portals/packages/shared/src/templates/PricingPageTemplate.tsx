import React from 'react';
import { GlassCard, GlowingIcon, GlassButton, HeroSection } from '../components';
import { Check, X, Zap, Building2, Crown } from 'lucide-react';
import { AccentColor } from '../types/branding.types';

export interface PricingFeature {
  name: string;
  included: boolean;
  highlight?: boolean;
}

export interface PricingTier {
  name: string;
  badge?: string;
  price: string;
  priceNote?: string;
  description: string;
  features: PricingFeature[];
  ctaText: string;
  ctaAction: () => void;
  highlighted?: boolean;
  icon?: 'starter' | 'professional' | 'enterprise';
}

export interface PricingPageTemplateProps {
  title: string;
  titleHighlight?: string;
  subtitle: string;
  tiers: PricingTier[];
  comparisonTitle?: string;
  comparisonFeatures?: { name: string; tiers: (boolean | string)[] }[];
  faqTitle?: string;
  faqs?: { question: string; answer: string }[];
  ctaTitle?: string;
  ctaSubtitle?: string;
  ctaButton?: string;
  ctaAction?: () => void;
  accentColor?: AccentColor;
}

const tierIcons = {
  starter: <Zap className="w-10 h-10" />,
  professional: <Building2 className="w-10 h-10" />,
  enterprise: <Crown className="w-10 h-10" />,
};

export const PricingPageTemplate: React.FC<PricingPageTemplateProps> = ({
  title,
  titleHighlight,
  subtitle,
  tiers,
  comparisonTitle,
  comparisonFeatures,
  faqTitle,
  faqs,
  ctaTitle,
  ctaSubtitle,
  ctaButton,
  ctaAction,
  accentColor = 'purple',
}) => {
  return (
    <div className="pricing-page">
      <HeroSection
        title={title}
        titleHighlight={titleHighlight}
        subtitle={subtitle}
        backgroundPattern="gradient"
      />

      <section className="wizard-section bg-wizard-bg-primary">
        <div className="wizard-container">
          <div className={`grid gap-8 ${tiers.length === 3 ? 'md:grid-cols-3' : 'md:grid-cols-2 max-w-4xl mx-auto'}`}>
            {tiers.map((tier, index) => (
              <GlassCard
                key={tier.name}
                variant={tier.highlighted ? 'hero' : 'interactive'}
                className={`p-8 relative ${tier.highlighted ? 'ring-2 ring-wizard-accent-purple scale-105' : ''}`}
              >
                {tier.badge && (
                  <div className="absolute -top-3 left-1/2 -translate-x-1/2">
                    <span className="px-4 py-1 rounded-full bg-wizard-accent-purple text-white text-sm font-semibold">
                      {tier.badge}
                    </span>
                  </div>
                )}

                <div className="text-center mb-6">
                  {tier.icon && (
                    <div className="mb-4 flex justify-center">
                      <GlowingIcon icon={tierIcons[tier.icon]} color={accentColor} size="lg" animate={tier.highlighted} />
                    </div>
                  )}
                  <h3 className="text-2xl font-bold text-wizard-text-primary mb-2">{tier.name}</h3>
                  <div className="mb-2">
                    <span className="text-4xl font-bold wizard-text">{tier.price}</span>
                    {tier.priceNote && <span className="text-wizard-text-secondary text-sm ml-2">{tier.priceNote}</span>}
                  </div>
                  <p className="text-wizard-text-secondary text-sm">{tier.description}</p>
                </div>

                <ul className="space-y-3 mb-8">
                  {tier.features.map((feature) => (
                    <li key={feature.name} className={`flex items-center space-x-3 ${feature.highlight ? 'text-wizard-accent-purple' : ''}`}>
                      {feature.included ? (
                        <Check className="w-5 h-5 text-green-400 flex-shrink-0" />
                      ) : (
                        <X className="w-5 h-5 text-wizard-text-muted flex-shrink-0" />
                      )}
                      <span className={feature.included ? 'text-wizard-text-primary' : 'text-wizard-text-muted'}>{feature.name}</span>
                    </li>
                  ))}
                </ul>

                <GlassButton
                  variant={tier.highlighted ? 'wizard' : 'outline'}
                  onClick={tier.ctaAction}
                  className="w-full"
                >
                  {tier.ctaText}
                </GlassButton>
              </GlassCard>
            ))}
          </div>
        </div>
      </section>

      {comparisonTitle && comparisonFeatures && (
        <section className="wizard-section bg-wizard-bg-deep">
          <div className="wizard-container">
            <h2 className="text-3xl md:text-4xl font-bold text-center wizard-text mb-12">{comparisonTitle}</h2>
            <div className="overflow-x-auto">
              <table className="w-full min-w-[600px]">
                <thead>
                  <tr className="border-b border-wizard-border-primary">
                    <th className="text-left py-4 px-4 text-wizard-text-secondary font-medium">Feature</th>
                    {tiers.map((tier) => (
                      <th key={tier.name} className="text-center py-4 px-4 text-wizard-text-primary font-bold">{tier.name}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {comparisonFeatures.map((feature, idx) => (
                    <tr key={feature.name} className={idx % 2 === 0 ? 'bg-wizard-bg-primary/30' : ''}>
                      <td className="py-4 px-4 text-wizard-text-primary">{feature.name}</td>
                      {feature.tiers.map((value, tierIdx) => (
                        <td key={tierIdx} className="text-center py-4 px-4">
                          {typeof value === 'boolean' ? (
                            value ? <Check className="w-5 h-5 text-green-400 mx-auto" /> : <X className="w-5 h-5 text-wizard-text-muted mx-auto" />
                          ) : (
                            <span className="text-wizard-text-primary">{value}</span>
                          )}
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </section>
      )}

      {faqTitle && faqs && faqs.length > 0 && (
        <section className="wizard-section bg-wizard-bg-primary">
          <div className="wizard-container max-w-3xl">
            <h2 className="text-3xl md:text-4xl font-bold text-center wizard-text mb-12">{faqTitle}</h2>
            <div className="space-y-4">
              {faqs.map((faq) => (
                <GlassCard key={faq.question} className="p-6">
                  <h3 className="text-lg font-semibold text-wizard-text-primary mb-2">{faq.question}</h3>
                  <p className="text-wizard-text-secondary">{faq.answer}</p>
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

export default PricingPageTemplate;
