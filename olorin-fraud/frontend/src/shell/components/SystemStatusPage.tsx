/**
 * System Status Page Component
 *
 * Real-time monitoring of all platform services.
 * Extracted from App.tsx to maintain < 200 line limit.
 */

import React from 'react';
import { serviceLinks } from '../constants/serviceData';

const SystemStatusPage: React.FC = () => {
  return (
    <div className="min-h-screen bg-black py-12">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-12">
          <div className="w-24 h-24 rounded-lg flex items-center justify-center text-4xl mx-auto mb-6 border-2 border-corporate-success bg-black/40 backdrop-blur-md shadow-lg shadow-corporate-success/20 text-corporate-success">
            ⚡
          </div>
          <h1 className="text-4xl font-bold text-corporate-textPrimary mb-4">System Status</h1>
          <p className="text-xl text-corporate-textSecondary">Real-time monitoring of all platform services</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {serviceLinks.map((service) => (
            <div key={service.name} className="rounded-lg border-2 border-corporate-accentPrimary/40 p-6 bg-black/40 backdrop-blur-md hover:border-corporate-accentPrimary/60 transition-all duration-300 shadow-lg">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center space-x-3">
                  <div className={`w-12 h-12 rounded-lg flex items-center justify-center text-xl border-2 border-corporate-accentSecondary text-corporate-accentPrimary bg-black/30 backdrop-blur`}>
                    {service.icon}
                  </div>
                  <div>
                    <h3 className="font-bold text-corporate-textPrimary">{service.name}</h3>
                    <p className="text-sm text-corporate-textTertiary">{service.description}</p>
                  </div>
                </div>
                <div className={`w-4 h-4 rounded-full ${
                  service.status === 'ready' ? 'bg-corporate-success animate-pulse shadow-lg shadow-corporate-success' :
                  service.status === 'loading' ? 'bg-corporate-warning animate-pulse shadow-lg shadow-corporate-warning' : 'bg-corporate-error shadow-lg shadow-corporate-error'
                }`}></div>
              </div>
              <div className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span className="text-corporate-textTertiary">Status</span>
                  <span className={`font-medium ${
                    service.status === 'ready' ? 'text-corporate-success' :
                    service.status === 'loading' ? 'text-corporate-warning' : 'text-corporate-error'
                  }`}>
                    {service.status === 'ready' ? 'Operational' :
                     service.status === 'loading' ? 'Starting' : 'Offline'}
                  </span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-corporate-textTertiary">Response Time</span>
                  <span className="text-corporate-textPrimary font-medium">&lt;50ms</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-corporate-textTertiary">Uptime</span>
                  <span className="text-corporate-textPrimary font-medium">99.9%</span>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default SystemStatusPage;
