import React from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';
import { HeroSection, GlassCard, GlowingIcon, GlassButton } from '@olorin/shared';
import { Check, X, Shield, Bot, Clock, Users, Zap, BarChart3, ArrowRight } from 'lucide-react';

const ComparePage: React.FC = () => {
  const { t } = useTranslation();
  const navigate = useNavigate();

  const comparisonData = [
    { feature: t('comparePage.features.detection'), traditional: false, olorin: true },
    { feature: t('comparePage.features.agents'), traditional: '1-2', olorin: '6 AI Agents' },
    { feature: t('comparePage.features.response'), traditional: 'Hours/Days', olorin: '< 1 second' },
    { feature: t('comparePage.features.learning'), traditional: 'Manual Rules', olorin: 'Self-Learning' },
    { feature: t('comparePage.features.accuracy'), traditional: '70-80%', olorin: '95%+' },
    { feature: t('comparePage.features.falsePositives'), traditional: 'High', olorin: 'Minimal' },
    { feature: t('comparePage.features.scalability'), traditional: 'Limited', olorin: 'Unlimited' },
    { feature: t('comparePage.features.monitoring'), traditional: 'Business Hours', olorin: '24/7/365' },
    { feature: t('comparePage.features.crossDomain'), traditional: false, olorin: true },
    { feature: t('comparePage.features.predictive'), traditional: false, olorin: true },
  ];

  const advantages = [
    { icon: <Bot className="w-8 h-8" />, title: t('comparePage.advantages.ai.title'), description: t('comparePage.advantages.ai.description') },
    { icon: <Clock className="w-8 h-8" />, title: t('comparePage.advantages.speed.title'), description: t('comparePage.advantages.speed.description') },
    { icon: <BarChart3 className="w-8 h-8" />, title: t('comparePage.advantages.accuracy.title'), description: t('comparePage.advantages.accuracy.description') },
    { icon: <Users className="w-8 h-8" />, title: t('comparePage.advantages.scale.title'), description: t('comparePage.advantages.scale.description') },
    { icon: <Zap className="w-8 h-8" />, title: t('comparePage.advantages.realtime.title'), description: t('comparePage.advantages.realtime.description') },
    { icon: <Shield className="w-8 h-8" />, title: t('comparePage.advantages.protection.title'), description: t('comparePage.advantages.protection.description') },
  ];

  const renderCellValue = (value: boolean | string) => {
    if (typeof value === 'boolean') {
      return value ? (
        <Check className="w-6 h-6 text-green-400 mx-auto" />
      ) : (
        <X className="w-6 h-6 text-red-400 mx-auto" />
      );
    }
    return <span className="text-wizard-text-primary">{value}</span>;
  };

  return (
    <div className="compare-page">
      <HeroSection
        title={t('comparePage.title')}
        titleHighlight={t('comparePage.titleHighlight')}
        subtitle={t('comparePage.subtitle')}
        icon={<Shield className="w-24 h-24" />}
        backgroundPattern="gradient"
      />

      <section className="wizard-section bg-wizard-bg-primary">
        <div className="wizard-container">
          <h2 className="text-3xl md:text-4xl font-bold text-center wizard-text mb-12">
            {t('comparePage.tableTitle')}
          </h2>

          <div className="overflow-x-auto">
            <table className="w-full min-w-[600px]">
              <thead>
                <tr className="border-b-2 border-wizard-border-primary">
                  <th className="text-left py-4 px-6 text-wizard-text-secondary font-medium w-1/3">
                    {t('comparePage.featureColumn')}
                  </th>
                  <th className="text-center py-4 px-6 text-wizard-text-secondary font-medium w-1/3">
                    {t('comparePage.traditionalColumn')}
                  </th>
                  <th className="text-center py-4 px-6 font-bold w-1/3">
                    <span className="wizard-text">{t('comparePage.olorinColumn')}</span>
                  </th>
                </tr>
              </thead>
              <tbody>
                {comparisonData.map((row, idx) => (
                  <tr
                    key={row.feature}
                    className={`border-b border-wizard-border-primary ${idx % 2 === 0 ? 'bg-wizard-bg-deep/30' : ''}`}
                  >
                    <td className="py-4 px-6 text-wizard-text-primary font-medium">{row.feature}</td>
                    <td className="py-4 px-6 text-center">{renderCellValue(row.traditional)}</td>
                    <td className="py-4 px-6 text-center bg-wizard-accent-purple/5">
                      {renderCellValue(row.olorin)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </section>

      <section className="wizard-section bg-wizard-bg-deep">
        <div className="wizard-container">
          <h2 className="text-3xl md:text-4xl font-bold text-center wizard-text mb-12">
            {t('comparePage.advantagesTitle')}
          </h2>

          <div className="wizard-grid-3">
            {advantages.map((adv, index) => (
              <GlassCard key={adv.title} variant="interactive" className={`p-6 animate-fade-in-up animate-delay-${(index % 3) + 1}00`}>
                <div className="mb-4">
                  <GlowingIcon icon={adv.icon} color="fraud" size="lg" />
                </div>
                <h3 className="text-xl font-bold text-wizard-text-primary mb-3">{adv.title}</h3>
                <p className="text-wizard-text-secondary">{adv.description}</p>
              </GlassCard>
            ))}
          </div>
        </div>
      </section>

      <section className="wizard-section bg-wizard-bg-primary">
        <div className="wizard-container">
          <GlassCard variant="hero" className="p-12">
            <div className="grid md:grid-cols-2 gap-8 items-center">
              <div>
                <h2 className="text-3xl md:text-4xl font-bold wizard-text mb-4">{t('comparePage.switchTitle')}</h2>
                <p className="text-wizard-text-secondary mb-6">{t('comparePage.switchDescription')}</p>
                <ul className="space-y-3 mb-8">
                  <li className="flex items-center space-x-3">
                    <Check className="w-5 h-5 text-green-400" />
                    <span className="text-wizard-text-primary">{t('comparePage.switchBenefit1')}</span>
                  </li>
                  <li className="flex items-center space-x-3">
                    <Check className="w-5 h-5 text-green-400" />
                    <span className="text-wizard-text-primary">{t('comparePage.switchBenefit2')}</span>
                  </li>
                  <li className="flex items-center space-x-3">
                    <Check className="w-5 h-5 text-green-400" />
                    <span className="text-wizard-text-primary">{t('comparePage.switchBenefit3')}</span>
                  </li>
                </ul>
                <GlassButton variant="wizard" size="lg" onClick={() => navigate('/contact')}>
                  {t('comparePage.switchCta')} <ArrowRight className="w-5 h-5 ml-2 inline" />
                </GlassButton>
              </div>
              <div className="text-center">
                <div className="text-6xl md:text-8xl font-bold wizard-text mb-4">80%</div>
                <p className="text-xl text-wizard-text-secondary">{t('comparePage.statLabel')}</p>
              </div>
            </div>
          </GlassCard>
        </div>
      </section>
    </div>
  );
};

export default ComparePage;
