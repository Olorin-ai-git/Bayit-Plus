/**
 * Use Cases Page
 *
 * Industry-specific fraud scenarios and solutions.
 */

import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Link } from 'react-router-dom';
import { TrustIndicators } from '../components/trust';
import { USE_CASES, UseCaseCard } from '../components/usecases';

const INDUSTRIES = ['All', 'Financial Services', 'E-Commerce', 'Insurance', 'Healthcare'];

const UseCasesPage: React.FC = () => {
  const { t } = useTranslation();
  const [selectedIndustry, setSelectedIndustry] = useState('All');

  const filteredUseCases =
    selectedIndustry === 'All'
      ? USE_CASES
      : USE_CASES.filter((uc) => uc.industry === selectedIndustry);

  return (
    <div className="min-h-screen bg-corporate-bgPrimary">
      {/* Header spacing */}
      <div className="h-20" />

      <div className="max-w-6xl mx-auto px-4 py-12">
        {/* Hero Section */}
        <div className="text-center mb-12">
          <span className="inline-block px-4 py-1 mb-4 text-sm font-medium text-corporate-accentPrimary bg-corporate-accentPrimary/10 rounded-full border border-corporate-accentPrimary/20">
            Industry Solutions
          </span>
          <h1 className="text-4xl md:text-5xl font-bold text-corporate-textPrimary mb-6">
            Fraud Protection for
            <span className="text-corporate-accentPrimary"> Every Industry</span>
          </h1>
          <p className="text-xl text-corporate-textSecondary max-w-2xl mx-auto">
            See how Olorin addresses industry-specific fraud challenges with AI-powered
            detection and investigation.
          </p>
        </div>

        {/* Industry Filter */}
        <div className="flex flex-wrap justify-center gap-2 mb-12">
          {INDUSTRIES.map((industry) => (
            <button
              key={industry}
              onClick={() => setSelectedIndustry(industry)}
              className={`px-4 py-2 rounded-full text-sm font-medium transition-colors ${
                selectedIndustry === industry
                  ? 'bg-corporate-accentPrimary text-white'
                  : 'bg-white/5 text-corporate-textSecondary hover:bg-white/10'
              }`}
            >
              {industry}
            </button>
          ))}
        </div>

        {/* Use Case Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-12">
          {filteredUseCases.map((useCase) => (
            <UseCaseCard key={useCase.id} useCase={useCase} />
          ))}
        </div>

        {/* Trust Indicators */}
        <TrustIndicators />

        {/* CTA Section */}
        <div className="mt-12 glass-card p-8 rounded-xl bg-gradient-to-r from-corporate-accentPrimary/10 to-corporate-accentSecondary/10 border-corporate-accentPrimary/30 text-center">
          <h2 className="text-2xl font-bold text-corporate-textPrimary mb-4">
            Ready to Protect Your Business?
          </h2>
          <p className="text-corporate-textSecondary mb-6 max-w-xl mx-auto">
            Let us show you how Olorin can address your specific fraud challenges with a
            personalized demo.
          </p>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
            <Link
              to="/demo/live"
              className="px-6 py-3 bg-corporate-accentPrimary hover:bg-corporate-accentSecondary text-white font-medium rounded-lg transition-colors"
            >
              Try Interactive Demo
            </Link>
            <Link
              to="/contact"
              className="px-6 py-3 border border-white/20 hover:bg-white/10 text-corporate-textPrimary font-medium rounded-lg transition-colors"
            >
              Contact Sales
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
};

export default UseCasesPage;
