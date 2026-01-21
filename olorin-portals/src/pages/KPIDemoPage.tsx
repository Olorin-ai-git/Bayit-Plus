/**
 * KPI Demo Page
 * Feature: KPI Dashboard Microservice - Marketing Demo
 * 
 * Synthetic demo version for marketing portal (www.olorin.ai)
 * Uses canned JSON data, no backend calls
 */

import React from 'react';

// Synthetic demo data
const DEMO_KPI_DATA = {
  recall: 0.87,
  fpr: 0.12,
  precision: 0.92,
  net_savings: 1250000,
  latency_p95: 45.2,
  error_rate: 0.003,
  daily_metrics: [
    { date: '2025-01-01', recall: 0.85, fpr: 0.15, precision: 0.90 },
    { date: '2025-01-02', recall: 0.86, fpr: 0.14, precision: 0.91 },
    { date: '2025-01-03', recall: 0.87, fpr: 0.13, precision: 0.92 },
    { date: '2025-01-04', recall: 0.88, fpr: 0.12, precision: 0.93 },
    { date: '2025-01-05', recall: 0.87, fpr: 0.12, precision: 0.92 },
  ],
  threshold_sweep: [
    { threshold: 0.3, profit: 50000 },
    { threshold: 0.4, profit: 75000 },
    { threshold: 0.5, profit: 100000 },
    { threshold: 0.6, profit: 120000 },
    { threshold: 0.7, profit: 110000 },
  ]
};

const KPIDemoPage: React.FC = () => {
  return (
    <div className="min-h-screen bg-gradient-to-br from-corporate-bgPrimary via-corporate-bgSecondary to-corporate-bgPrimary py-12">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="mb-8 text-center">
          <div className="inline-flex items-center px-4 py-2 bg-corporate-accentPrimary/20 backdrop-blur-sm border border-corporate-accentPrimary/30 text-corporate-accentPrimary rounded-lg text-sm font-medium mb-4">
            <span className="w-2 h-2 bg-corporate-accentPrimary rounded-full mr-2"></span>
            Interactive Demo
          </div>
          <h1 className="text-4xl font-bold text-corporate-textPrimary mb-4">
            Fraud Detection KPI Dashboard
          </h1>
          <p className="text-xl text-corporate-textSecondary max-w-3xl mx-auto">
            Explore key performance indicators for fraud detection systems.
            This is a synthetic demo with sample data.
          </p>
        </div>
        
        {/* Top Tiles */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-8">
          <div className="glass-card p-6 border-l-4 border-green-400 hover:border-green-400/80 transition-all duration-200">
            <h3 className="text-sm font-medium text-corporate-textSecondary mb-2">Recall</h3>
            <div className="text-3xl font-bold text-green-400">
              {(DEMO_KPI_DATA.recall * 100).toFixed(1)}%
            </div>
            <p className="text-xs text-corporate-textMuted mt-2">Fraud cases detected</p>
          </div>

          <div className="glass-card p-6 border-l-4 border-yellow-400 hover:border-yellow-400/80 transition-all duration-200">
            <h3 className="text-sm font-medium text-corporate-textSecondary mb-2">False Positive Rate</h3>
            <div className="text-3xl font-bold text-yellow-400">
              {(DEMO_KPI_DATA.fpr * 100).toFixed(1)}%
            </div>
            <p className="text-xs text-corporate-textMuted mt-2">Incorrect fraud flags</p>
          </div>

          <div className="glass-card p-6 border-l-4 border-blue-400 hover:border-blue-400/80 transition-all duration-200">
            <h3 className="text-sm font-medium text-corporate-textSecondary mb-2">Precision</h3>
            <div className="text-3xl font-bold text-blue-400">
              {(DEMO_KPI_DATA.precision * 100).toFixed(1)}%
            </div>
            <p className="text-xs text-corporate-textMuted mt-2">Accuracy of fraud flags</p>
          </div>

          <div className="glass-card p-6 border-l-4 border-corporate-accentPrimary hover:border-corporate-accentPrimary/80 transition-all duration-200">
            <h3 className="text-sm font-medium text-corporate-textSecondary mb-2">Net Savings</h3>
            <div className="text-3xl font-bold text-corporate-accentPrimary">
              ${(DEMO_KPI_DATA.net_savings / 1000000).toFixed(2)}M
            </div>
            <p className="text-xs text-corporate-textMuted mt-2">Total fraud prevented</p>
          </div>

          <div className="glass-card p-6 border-l-4 border-corporate-accentSecondary hover:border-corporate-accentSecondary/80 transition-all duration-200">
            <h3 className="text-sm font-medium text-corporate-textSecondary mb-2">Latency P95</h3>
            <div className="text-3xl font-bold text-corporate-accentSecondary">
              {DEMO_KPI_DATA.latency_p95.toFixed(1)}ms
            </div>
            <p className="text-xs text-corporate-textMuted mt-2">95th percentile response time</p>
          </div>

          <div className="glass-card p-6 border-l-4 border-red-400 hover:border-red-400/80 transition-all duration-200">
            <h3 className="text-sm font-medium text-corporate-textSecondary mb-2">Error Rate</h3>
            <div className="text-3xl font-bold text-red-400">
              {(DEMO_KPI_DATA.error_rate * 100).toFixed(3)}%
            </div>
            <p className="text-xs text-corporate-textMuted mt-2">System error frequency</p>
          </div>
        </div>
        
        {/* Charts Section */}
        <div className="glass-card p-6 mb-8">
          <h2 className="text-2xl font-bold text-corporate-textPrimary mb-6">Performance Trends</h2>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div>
              <h3 className="text-lg font-semibold text-corporate-textSecondary mb-4">Recall Over Time</h3>
              <div className="h-64 flex items-center justify-center bg-corporate-bgSecondary/30 backdrop-blur-sm rounded border-2 border-dashed border-corporate-borderPrimary/40">
                <p className="text-corporate-textMuted">Chart visualization would appear here</p>
              </div>
            </div>
            <div>
              <h3 className="text-lg font-semibold text-corporate-textSecondary mb-4">False Positive Rate Over Time</h3>
              <div className="h-64 flex items-center justify-center bg-corporate-bgSecondary/30 backdrop-blur-sm rounded border-2 border-dashed border-corporate-borderPrimary/40">
                <p className="text-corporate-textMuted">Chart visualization would appear here</p>
              </div>
            </div>
          </div>
        </div>

        {/* CTA Section */}
        <div className="glass-card bg-gradient-to-r from-corporate-accentPrimary/30 via-corporate-accentSecondary/30 to-corporate-accentPrimary/30 p-8 text-center shadow-lg">
          <h2 className="text-2xl font-bold text-corporate-textPrimary mb-4">Ready to See Real KPIs?</h2>
          <p className="text-corporate-textSecondary mb-6 max-w-2xl mx-auto">
            Get access to the full KPI dashboard with real-time metrics,
            tenant-scoped data, and advanced analytics.
          </p>
          <a
            href="/contact"
            className="inline-block px-8 py-3 bg-corporate-accentPrimary text-white rounded-lg font-semibold hover:brightness-110 transition-all duration-200 shadow-lg"
          >
            Request Demo
          </a>
        </div>

        {/* Disclaimer */}
        <div className="mt-8 text-center">
          <p className="text-sm text-corporate-textMuted">
            <strong className="text-corporate-textSecondary">Note:</strong> This is a synthetic demo with sample data.
            Real KPI dashboards are available in the investigation portal with proper authentication.
          </p>
        </div>
      </div>
    </div>
  );
};

export default KPIDemoPage;





