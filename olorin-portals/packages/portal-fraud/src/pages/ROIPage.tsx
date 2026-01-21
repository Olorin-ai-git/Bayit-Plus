import React, { useState, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';
import { HeroSection, GlassCard, GlowingIcon, GlassButton } from '@olorin/shared';
import { Calculator, DollarSign, TrendingDown, Clock, Shield, CheckCircle, ArrowRight } from 'lucide-react';

const ROIPage: React.FC = () => {
  const { t } = useTranslation();
  const navigate = useNavigate();

  const [transactions, setTransactions] = useState<number>(100000);
  const [fraudRate, setFraudRate] = useState<number>(1.5);
  const [avgTransactionValue, setAvgTransactionValue] = useState<number>(150);

  const calculations = useMemo(() => {
    const monthlyFraudLoss = transactions * (fraudRate / 100) * avgTransactionValue;
    const detectionImprovement = 0.80;
    const monthlySavings = monthlyFraudLoss * detectionImprovement;
    const annualSavings = monthlySavings * 12;
    const operationalSavings = transactions * 0.02;
    const totalAnnualSavings = annualSavings + operationalSavings * 12;
    const reviewTimeReduction = 0.60;
    const hoursPerMonth = (transactions * (fraudRate / 100) * 15) / 60;
    const hoursSaved = hoursPerMonth * reviewTimeReduction;

    return {
      monthlyFraudLoss,
      monthlySavings,
      annualSavings,
      totalAnnualSavings,
      hoursSaved,
      fraudsPrevented: Math.round(transactions * (fraudRate / 100) * detectionImprovement),
    };
  }, [transactions, fraudRate, avgTransactionValue]);

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }).format(value);
  };

  return (
    <div className="roi-page">
      <HeroSection
        title={t('roiPage.title')}
        titleHighlight={t('roiPage.titleHighlight')}
        subtitle={t('roiPage.subtitle')}
        icon={<Calculator className="w-24 h-24" />}
        backgroundPattern="gradient"
      />

      <section className="wizard-section bg-wizard-bg-primary">
        <div className="wizard-container">
          <div className="grid lg:grid-cols-2 gap-12">
            <GlassCard className="p-8">
              <h2 className="text-2xl font-bold wizard-text mb-8 flex items-center">
                <Calculator className="w-6 h-6 mr-3" />
                {t('roiPage.calculatorTitle')}
              </h2>

              <div className="space-y-8">
                <div>
                  <label className="block text-wizard-text-secondary mb-2 font-medium">
                    {t('roiPage.inputs.transactions')}
                  </label>
                  <input
                    type="range"
                    min="10000"
                    max="10000000"
                    step="10000"
                    value={transactions}
                    onChange={(e) => setTransactions(Number(e.target.value))}
                    className="w-full h-2 bg-wizard-bg-deep rounded-lg appearance-none cursor-pointer accent-wizard-accent-purple"
                  />
                  <div className="flex justify-between mt-2">
                    <span className="text-sm text-wizard-text-muted">10K</span>
                    <span className="text-lg font-bold wizard-text">{(transactions / 1000).toFixed(0)}K</span>
                    <span className="text-sm text-wizard-text-muted">10M</span>
                  </div>
                </div>

                <div>
                  <label className="block text-wizard-text-secondary mb-2 font-medium">
                    {t('roiPage.inputs.fraudRate')}
                  </label>
                  <input
                    type="range"
                    min="0.1"
                    max="5"
                    step="0.1"
                    value={fraudRate}
                    onChange={(e) => setFraudRate(Number(e.target.value))}
                    className="w-full h-2 bg-wizard-bg-deep rounded-lg appearance-none cursor-pointer accent-wizard-accent-purple"
                  />
                  <div className="flex justify-between mt-2">
                    <span className="text-sm text-wizard-text-muted">0.1%</span>
                    <span className="text-lg font-bold wizard-text">{fraudRate.toFixed(1)}%</span>
                    <span className="text-sm text-wizard-text-muted">5%</span>
                  </div>
                </div>

                <div>
                  <label className="block text-wizard-text-secondary mb-2 font-medium">
                    {t('roiPage.inputs.avgValue')}
                  </label>
                  <input
                    type="range"
                    min="10"
                    max="1000"
                    step="10"
                    value={avgTransactionValue}
                    onChange={(e) => setAvgTransactionValue(Number(e.target.value))}
                    className="w-full h-2 bg-wizard-bg-deep rounded-lg appearance-none cursor-pointer accent-wizard-accent-purple"
                  />
                  <div className="flex justify-between mt-2">
                    <span className="text-sm text-wizard-text-muted">$10</span>
                    <span className="text-lg font-bold wizard-text">${avgTransactionValue}</span>
                    <span className="text-sm text-wizard-text-muted">$1,000</span>
                  </div>
                </div>
              </div>
            </GlassCard>

            <div className="space-y-6">
              <GlassCard variant="hero" className="p-8">
                <h3 className="text-lg text-wizard-text-secondary mb-2">{t('roiPage.results.annualSavings')}</h3>
                <div className="text-4xl md:text-5xl font-bold wizard-text mb-2">
                  {formatCurrency(calculations.totalAnnualSavings)}
                </div>
                <p className="text-wizard-text-secondary text-sm">{t('roiPage.results.savingsNote')}</p>
              </GlassCard>

              <div className="grid grid-cols-2 gap-4">
                <GlassCard className="p-6 text-center">
                  <GlowingIcon icon={<DollarSign className="w-6 h-6" />} color="fraud" size="md" />
                  <div className="text-2xl font-bold wizard-text mt-3">{formatCurrency(calculations.monthlySavings)}</div>
                  <p className="text-wizard-text-secondary text-sm">{t('roiPage.results.monthlySavings')}</p>
                </GlassCard>

                <GlassCard className="p-6 text-center">
                  <GlowingIcon icon={<TrendingDown className="w-6 h-6" />} color="fraud" size="md" />
                  <div className="text-2xl font-bold wizard-text mt-3">{calculations.fraudsPrevented.toLocaleString()}</div>
                  <p className="text-wizard-text-secondary text-sm">{t('roiPage.results.fraudsPrevented')}</p>
                </GlassCard>

                <GlassCard className="p-6 text-center">
                  <GlowingIcon icon={<Clock className="w-6 h-6" />} color="fraud" size="md" />
                  <div className="text-2xl font-bold wizard-text mt-3">{Math.round(calculations.hoursSaved)}h</div>
                  <p className="text-wizard-text-secondary text-sm">{t('roiPage.results.hoursSaved')}</p>
                </GlassCard>

                <GlassCard className="p-6 text-center">
                  <GlowingIcon icon={<Shield className="w-6 h-6" />} color="fraud" size="md" />
                  <div className="text-2xl font-bold wizard-text mt-3">80%</div>
                  <p className="text-wizard-text-secondary text-sm">{t('roiPage.results.detectionRate')}</p>
                </GlassCard>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="wizard-section bg-wizard-bg-deep">
        <div className="wizard-container">
          <GlassCard className="p-8 md:p-12">
            <div className="grid md:grid-cols-2 gap-8 items-center">
              <div>
                <h2 className="text-3xl font-bold wizard-text mb-4">{t('roiPage.assumptions.title')}</h2>
                <ul className="space-y-3">
                  <li className="flex items-start space-x-3">
                    <CheckCircle className="w-5 h-5 text-green-400 mt-0.5 flex-shrink-0" />
                    <span className="text-wizard-text-secondary">{t('roiPage.assumptions.a1')}</span>
                  </li>
                  <li className="flex items-start space-x-3">
                    <CheckCircle className="w-5 h-5 text-green-400 mt-0.5 flex-shrink-0" />
                    <span className="text-wizard-text-secondary">{t('roiPage.assumptions.a2')}</span>
                  </li>
                  <li className="flex items-start space-x-3">
                    <CheckCircle className="w-5 h-5 text-green-400 mt-0.5 flex-shrink-0" />
                    <span className="text-wizard-text-secondary">{t('roiPage.assumptions.a3')}</span>
                  </li>
                  <li className="flex items-start space-x-3">
                    <CheckCircle className="w-5 h-5 text-green-400 mt-0.5 flex-shrink-0" />
                    <span className="text-wizard-text-secondary">{t('roiPage.assumptions.a4')}</span>
                  </li>
                </ul>
              </div>
              <div className="text-center">
                <p className="text-wizard-text-secondary mb-6">{t('roiPage.customAnalysis')}</p>
                <GlassButton variant="wizard" size="lg" onClick={() => navigate('/contact')}>
                  {t('roiPage.ctaButton')} <ArrowRight className="w-5 h-5 ml-2 inline" />
                </GlassButton>
              </div>
            </div>
          </GlassCard>
        </div>
      </section>
    </div>
  );
};

export default ROIPage;
