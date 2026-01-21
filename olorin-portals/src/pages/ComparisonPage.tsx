/**
 * Comparison Page
 *
 * Feature comparison showing Olorin's advantages vs competitors.
 */

import React from 'react';
import { useTranslation } from 'react-i18next';
import { Link } from 'react-router-dom';
import { ComparisonTable } from '../components/comparison';

const ComparisonPage: React.FC = () => {
  const { t } = useTranslation();

  return (
    <div className="min-h-screen bg-corporate-bgPrimary">
      {/* Header spacing */}
      <div className="h-20" />

      <div className="max-w-6xl mx-auto px-4 py-12">
        {/* Hero Section */}
        <div className="text-center mb-12">
          <span className="inline-block px-4 py-1 mb-4 text-sm font-medium text-corporate-accentPrimary bg-corporate-accentPrimary/10 rounded-full border border-corporate-accentPrimary/20">
            Why Olorin
          </span>
          <h1 className="text-4xl md:text-5xl font-bold text-corporate-textPrimary mb-6">
            The Clear Choice for
            <span className="text-corporate-accentPrimary"> Modern Fraud Detection</span>
          </h1>
          <p className="text-xl text-corporate-textSecondary max-w-2xl mx-auto">
            See how Olorin&apos;s AI-powered platform compares to traditional approaches
            and competing solutions.
          </p>
        </div>

        {/* Comparison Table */}
        <div className="glass-card p-6 rounded-xl mb-12">
          <ComparisonTable />
        </div>

        {/* Key Differentiators */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-12">
          <div className="glass-card p-6 rounded-xl">
            <div className="w-12 h-12 rounded-xl bg-corporate-accentPrimary/20 flex items-center justify-center mb-4">
              <span className="text-2xl">🧠</span>
            </div>
            <h3 className="text-lg font-semibold text-corporate-textPrimary mb-2">Explainable AI</h3>
            <p className="text-corporate-textSecondary text-sm">
              Unlike black-box ML models, our agents explain every decision with full
              chain-of-thought reasoning. Know exactly why a transaction was flagged.
            </p>
          </div>

          <div className="glass-card p-6 rounded-xl">
            <div className="w-12 h-12 rounded-xl bg-corporate-accentPrimary/20 flex items-center justify-center mb-4">
              <span className="text-2xl">🔍</span>
            </div>
            <h3 className="text-lg font-semibold text-corporate-textPrimary mb-2">Blind Spot Analysis</h3>
            <p className="text-corporate-textSecondary text-sm">
              Our unique 2D heatmap analysis identifies gaps in your current detection—showing
              exactly where competitors miss fraud.
            </p>
          </div>

          <div className="glass-card p-6 rounded-xl">
            <div className="w-12 h-12 rounded-xl bg-corporate-accentPrimary/20 flex items-center justify-center mb-4">
              <span className="text-2xl">🤖</span>
            </div>
            <h3 className="text-lg font-semibold text-corporate-textPrimary mb-2">Autonomous Investigation</h3>
            <p className="text-corporate-textSecondary text-sm">
              Our AI agents don&apos;t just flag—they investigate. Get complete investigations
              with findings, evidence, and recommendations.
            </p>
          </div>
        </div>

        {/* Stats Section */}
        <div className="glass-card p-8 rounded-xl mb-12 bg-gradient-to-r from-corporate-accentPrimary/10 to-corporate-accentSecondary/10 border-corporate-accentPrimary/30">
          <h2 className="text-2xl font-bold text-corporate-textPrimary text-center mb-8">Proven Results</h2>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-6 text-center">
            <div>
              <span className="text-4xl font-bold text-corporate-accentPrimary">95%</span>
              <p className="text-corporate-textMuted text-sm mt-2">Fraud Detection Rate</p>
            </div>
            <div>
              <span className="text-4xl font-bold text-corporate-accentPrimary">80%</span>
              <p className="text-corporate-textMuted text-sm mt-2">False Positive Reduction</p>
            </div>
            <div>
              <span className="text-4xl font-bold text-corporate-accentPrimary">90%</span>
              <p className="text-corporate-textMuted text-sm mt-2">Time Savings</p>
            </div>
            <div>
              <span className="text-4xl font-bold text-corporate-accentPrimary">&lt;1s</span>
              <p className="text-corporate-textMuted text-sm mt-2">Response Time</p>
            </div>
          </div>
        </div>

        {/* CTA Section */}
        <div className="text-center">
          <h2 className="text-2xl font-bold text-corporate-textPrimary mb-4">Ready to See the Difference?</h2>
          <p className="text-corporate-textSecondary mb-6 max-w-xl mx-auto">
            Experience Olorin&apos;s capabilities firsthand with our interactive demo or
            schedule a personalized evaluation.
          </p>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
            <Link
              to="/demo/live"
              className="px-6 py-3 bg-corporate-accentPrimary hover:bg-corporate-accentSecondary text-white font-medium rounded-lg transition-colors"
            >
              Try Interactive Demo
            </Link>
            <Link
              to="/roi"
              className="px-6 py-3 border border-white/20 hover:bg-white/10 text-corporate-textPrimary font-medium rounded-lg transition-colors"
            >
              Calculate Your ROI
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ComparisonPage;
