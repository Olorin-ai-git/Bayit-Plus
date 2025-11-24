/**
 * Shell Home Page Component
 *
 * Landing page with hero section, services grid, and system metrics.
 * Extracted from App.tsx to maintain < 200 line limit.
 */

import React from 'react';
import { Link } from 'react-router-dom';
import { serviceLinks, systemMetrics } from '../constants/serviceData';

const ShellHomePage: React.FC = () => {
  return (
    <div className="min-h-screen bg-black">
      {/* Hero Section */}
      <div className="relative overflow-hidden border-b-2 border-corporate-borderPrimary/30">
        <div className="absolute inset-0 bg-gradient-to-br from-corporate-accentPrimary/5 via-black to-corporate-accentSecondary/5"></div>
        <div className="relative max-w-7xl mx-auto pt-16 pb-12 px-4 sm:px-6 lg:px-8">
          <div className="text-center">
            <div className="inline-flex items-center px-4 py-2 bg-black/40 backdrop-blur-md text-corporate-accentSecondary rounded-lg text-sm font-medium mb-6 border-2 border-corporate-accentSecondary/40">
              <div className="w-2 h-2 bg-corporate-success rounded-full mr-2 animate-pulse"></div>
              All Systems Operational
            </div>

            <h1 className="text-5xl md:text-6xl font-bold text-corporate-accentPrimary mb-6">
              Olorin Platform
            </h1>

            <p className="text-xl md:text-2xl text-corporate-textSecondary mb-8 max-w-3xl mx-auto">
              Enterprise AI-Powered Investigation & Analytics Platform
            </p>

            <p className="text-base md:text-lg text-corporate-textTertiary max-w-2xl mx-auto">
              Harness the power of artificial intelligence to detect fraud, analyze risks,
              and gain actionable insights in real-time.
            </p>

            <div className="mt-8 flex gap-4 justify-center">
              <Link
                to="/investigation/settings"
                className="px-8 py-3 bg-gradient-to-r from-corporate-accentPrimary to-corporate-accentSecondary text-white rounded-lg font-semibold hover:shadow-lg hover:shadow-corporate-accentPrimary/50 transition-all duration-200"
              >
                Start Investigation
              </Link>
              <Link
                to="/investigations/poc/default/overview"
                className="px-8 py-3 bg-gradient-to-r from-corporate-accentSecondary to-corporate-info text-white rounded-lg font-semibold hover:shadow-lg hover:shadow-corporate-accentSecondary/50 transition-all duration-200"
              >
                KPI Dashboard
              </Link>
              <a
                href="/docs"
                className="px-8 py-3 border-2 border-corporate-borderPrimary/40 text-corporate-textSecondary rounded-lg font-semibold hover:border-corporate-accentSecondary hover:text-corporate-accentSecondary transition-all duration-200 bg-black/20 backdrop-blur"
              >
                Documentation
              </a>
            </div>
          </div>
        </div>
      </div>

      {/* Services Grid */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
        <div className="text-center mb-12">
          <h2 className="text-3xl font-bold text-corporate-accentPrimary mb-4">
            Platform Services
          </h2>
          <p className="text-corporate-textSecondary">
            Comprehensive suite of AI-powered tools for enterprise investigation and analytics
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {serviceLinks.map((service, index) => (
            <Link
              key={service.name}
              to={service.path}
              className={`group relative bg-black/40 backdrop-blur-md rounded-lg p-6 border-2 border-corporate-accentPrimary/40 hover:border-corporate-accentPrimary/60 transition-all duration-300 hover:shadow-lg hover:shadow-corporate-accentPrimary/30`}
              style={{ animationDelay: `${index * 100}ms` }}
            >
              <div className="flex items-start justify-between mb-4">
                <span className="text-4xl">{service.icon}</span>
                <span className={`px-3 py-1 rounded-full text-xs font-semibold ${
                  service.status === 'ready'
                    ? 'bg-corporate-success/20 text-corporate-success border-2 border-corporate-success/50'
                    : 'bg-corporate-warning/20 text-corporate-warning border-2 border-corporate-warning/50'
                }`}>
                  {service.status}
                </span>
              </div>

              <h3 className="text-xl font-bold text-corporate-accentPrimary mb-2 group-hover:text-corporate-accentSecondary transition-colors">
                {service.name}
              </h3>

              <p className="text-sm text-corporate-textSecondary mb-4">
                {service.description}
              </p>

              <div className="flex items-center text-corporate-accentSecondary text-sm font-medium group-hover:gap-2 transition-all">
                <span>Launch Service</span>
                <svg className="w-4 h-4 ml-1 group-hover:translate-x-1 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                </svg>
              </div>
            </Link>
          ))}
        </div>

        {/* System Metrics */}
        <div className="mt-16 rounded-lg border-2 border-corporate-accentPrimary/40 p-8 bg-black/40 backdrop-blur-md shadow-lg hover:border-corporate-accentPrimary/60 transition-all">
          <h3 className="text-2xl font-bold text-corporate-accentPrimary mb-6 text-center">
            System Health Metrics
          </h3>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {systemMetrics.map((metric) => (
              <div
                key={metric.label}
                className={`p-6 rounded-lg border-2 ${metric.borderColor}/50 bg-black/30 backdrop-blur-md hover:border-opacity-100 transition-all duration-200 shadow-lg`}
              >
                <div className="flex items-center justify-between mb-3">
                  <span className="text-2xl">{metric.icon}</span>
                  <span className={`text-3xl font-bold ${metric.color}`}>
                    {metric.value}
                  </span>
                </div>
                <div className="text-sm font-medium text-corporate-textSecondary mb-1">
                  {metric.label}
                </div>
                <div className="text-xs text-corporate-textTertiary">
                  {metric.description}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

export default ShellHomePage;
