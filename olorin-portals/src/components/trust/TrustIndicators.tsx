/**
 * Trust Indicators Component
 *
 * Displays certifications, compliance badges, and trust signals.
 */

import React from 'react';

interface TrustBadge {
  id: string;
  name: string;
  icon: string;
  description: string;
}

const TRUST_BADGES: TrustBadge[] = [
  {
    id: 'soc2',
    name: 'SOC 2 Type II',
    icon: '🔐',
    description: 'Security & Privacy Certified',
  },
  {
    id: 'gdpr',
    name: 'GDPR Compliant',
    icon: '🇪🇺',
    description: 'EU Data Protection',
  },
  {
    id: 'ccpa',
    name: 'CCPA Compliant',
    icon: '🇺🇸',
    description: 'California Privacy Rights',
  },
  {
    id: 'iso27001',
    name: 'ISO 27001',
    icon: '✅',
    description: 'Information Security',
  },
];

export const TrustIndicators: React.FC = () => {
  return (
    <div className="py-8">
      <p className="text-center text-corporate-textMuted text-sm mb-6">
        Enterprise-grade security and compliance
      </p>
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {TRUST_BADGES.map((badge) => (
          <div
            key={badge.id}
            className="glass-card p-4 rounded-lg text-center hover:border-corporate-accentPrimary/30 transition-colors"
          >
            <span className="text-2xl">{badge.icon}</span>
            <p className="text-corporate-textPrimary font-medium text-sm mt-2">{badge.name}</p>
            <p className="text-corporate-textMuted text-xs mt-1">{badge.description}</p>
          </div>
        ))}
      </div>
    </div>
  );
};

export default TrustIndicators;
