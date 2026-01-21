/**
 * ROI Calculator Page
 *
 * Interactive page for enterprise decision-makers to calculate
 * potential ROI from implementing Olorin.
 */

import React from 'react';
import { useTranslation } from 'react-i18next';
import { Link } from 'react-router-dom';
import { ROICalculator } from '../components/comparison';

const ROICalculatorPage: React.FC = () => {
  const { t } = useTranslation();

  return (
    <div className="min-h-screen bg-corporate-bgPrimary">
      {/* Header spacing */}
      <div className="h-20" />

      <div className="max-w-4xl mx-auto px-4 py-12">
        {/* Hero Section */}
        <div className="text-center mb-12">
          <span className="inline-block px-4 py-1 mb-4 text-sm font-medium text-corporate-accentPrimary bg-corporate-accentPrimary/10 rounded-full border border-corporate-accentPrimary/20">
            ROI Calculator
          </span>
          <h1 className="text-4xl md:text-5xl font-bold text-corporate-textPrimary mb-6">
            Calculate Your
            <span className="text-corporate-accentPrimary"> Potential Savings</span>
          </h1>
          <p className="text-xl text-corporate-textSecondary max-w-2xl mx-auto">
            See how Olorin can reduce fraud losses, operational costs, and false positives
            for your organization.
          </p>
        </div>

        {/* Calculator */}
        <ROICalculator />

        {/* How We Calculate */}
        <div className="mt-12 glass-card p-6 rounded-xl">
          <h3 className="text-lg font-semibold text-corporate-textPrimary mb-4">How We Calculate</h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 text-sm">
            <div>
              <h4 className="text-corporate-accentPrimary font-medium mb-2">Fraud Prevention</h4>
              <p className="text-corporate-textSecondary">
                Based on 95% fraud detection rate, we calculate prevented fraud losses from your
                current fraud rate and transaction value.
              </p>
            </div>
            <div>
              <h4 className="text-corporate-accentPrimary font-medium mb-2">Operational Savings</h4>
              <p className="text-corporate-textSecondary">
                90% reduction in manual review time for your team, calculated from team size and
                average investigation costs.
              </p>
            </div>
            <div>
              <h4 className="text-corporate-accentPrimary font-medium mb-2">False Positive Reduction</h4>
              <p className="text-corporate-textSecondary">
                80% reduction in false positives means fewer legitimate transactions blocked and
                happier customers.
              </p>
            </div>
          </div>
        </div>

        {/* CTA Section */}
        <div className="mt-12 text-center">
          <p className="text-corporate-textSecondary mb-6">
            Want a more detailed analysis tailored to your specific needs?
          </p>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
            <Link
              to="/contact"
              className="px-6 py-3 bg-corporate-accentPrimary hover:bg-corporate-accentSecondary text-white font-medium rounded-lg transition-colors"
            >
              Schedule Consultation
            </Link>
            <Link
              to="/compare"
              className="px-6 py-3 border border-white/20 hover:bg-white/10 text-corporate-textPrimary font-medium rounded-lg transition-colors"
            >
              Compare Solutions
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ROICalculatorPage;
