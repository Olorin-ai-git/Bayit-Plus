/**
 * Service Placeholder Component
 *
 * Placeholder page for services under development.
 * Extracted from App.tsx to maintain < 200 line limit.
 */

import React from 'react';

interface ServicePlaceholderProps {
  title: string;
  description: string;
  icon: string;
}

const ServicePlaceholder: React.FC<ServicePlaceholderProps> = ({ title, description, icon }) => {
  return (
    <div className="min-h-screen bg-black">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
        <div className="text-center mb-12">
          <div className={`w-24 h-24 rounded-lg flex items-center justify-center text-4xl mx-auto mb-6 border-2 border-corporate-accentSecondary text-corporate-accentPrimary bg-black/40 backdrop-blur-md shadow-lg shadow-corporate-accentSecondary/20`}>
            {icon}
          </div>
          <h1 className="text-4xl font-bold text-corporate-textPrimary mb-4">{title}</h1>
          <p className="text-xl text-corporate-textSecondary mb-8">{description}</p>
        </div>

        <div className="rounded-lg border-2 border-corporate-accentPrimary/40 p-8 bg-black/40 backdrop-blur-md shadow-lg hover:border-corporate-accentPrimary/60 transition-all">
          <div className="text-center">
            <div className="w-16 h-16 rounded-lg flex items-center justify-center mx-auto mb-4 border-2 border-corporate-accentSecondary bg-black/40 backdrop-blur shadow-lg shadow-corporate-accentSecondary/10">
              <svg className="w-8 h-8 text-corporate-accentPrimary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19.428 15.428a2 2 0 00-1.022-.547l-2.387-.477a6 6 0 00-3.86.517l-.318.158a6 6 0 01-3.86.517L6.05 15.21a2 2 0 00-1.806.547M8 4h8l-1 1v5.172a2 2 0 00.586 1.414l5 5c1.26 1.26.367 3.414-1.415 3.414H4.828c-1.782 0-2.674-2.154-1.414-3.414l5-5A2 2 0 009 8.172V5L8 4z" />
              </svg>
            </div>
            <h3 className="text-lg font-semibold text-corporate-textPrimary mb-2">Service Under Development</h3>
            <p className="text-corporate-textTertiary mb-6">This microservice is being built with the latest fraud detection technologies.</p>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-left">
              <div className="p-4 bg-black/30 backdrop-blur-md rounded-lg border-2 border-corporate-borderPrimary/40 hover:border-corporate-accentPrimary/40 transition-all">
                <div className="font-medium text-corporate-textPrimary mb-1">AI Integration</div>
                <div className="text-sm text-corporate-textTertiary">Advanced machine learning models</div>
              </div>
              <div className="p-4 bg-black/30 backdrop-blur-md rounded-lg border-2 border-corporate-borderPrimary/40 hover:border-corporate-accentPrimary/40 transition-all">
                <div className="font-medium text-corporate-textPrimary mb-1">Real-time Processing</div>
                <div className="text-sm text-corporate-textTertiary">Live data analysis & alerts</div>
              </div>
              <div className="p-4 bg-black/30 backdrop-blur-md rounded-lg border-2 border-corporate-borderPrimary/40 hover:border-corporate-accentPrimary/40 transition-all">
                <div className="font-medium text-corporate-textPrimary mb-1">Secure Architecture</div>
                <div className="text-sm text-corporate-textTertiary">Enterprise-grade security</div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ServicePlaceholder;
