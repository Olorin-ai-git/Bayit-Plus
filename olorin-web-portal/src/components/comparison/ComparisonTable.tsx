/**
 * Comparison Table Component
 *
 * Feature comparison matrix showing Olorin vs competitors.
 */

import React from 'react';

interface ComparisonFeature {
  name: string;
  olorin: 'full' | 'partial' | 'none';
  legacyRules: 'full' | 'partial' | 'none';
  basicML: 'full' | 'partial' | 'none';
  competitors: 'full' | 'partial' | 'none';
}

const COMPARISON_FEATURES: ComparisonFeature[] = [
  {
    name: 'Multi-Agent Architecture',
    olorin: 'full',
    legacyRules: 'none',
    basicML: 'partial',
    competitors: 'partial',
  },
  {
    name: 'Explainable AI (Chain-of-Thought)',
    olorin: 'full',
    legacyRules: 'none',
    basicML: 'none',
    competitors: 'partial',
  },
  {
    name: 'Real-Time Detection',
    olorin: 'full',
    legacyRules: 'full',
    basicML: 'partial',
    competitors: 'full',
  },
  {
    name: 'LLM-Powered Analysis',
    olorin: 'full',
    legacyRules: 'none',
    basicML: 'none',
    competitors: 'partial',
  },
  {
    name: 'Blind Spot Analysis',
    olorin: 'full',
    legacyRules: 'none',
    basicML: 'none',
    competitors: 'none',
  },
  {
    name: 'Cross-Entity Investigation',
    olorin: 'full',
    legacyRules: 'partial',
    basicML: 'partial',
    competitors: 'partial',
  },
  {
    name: 'Autonomous Investigation',
    olorin: 'full',
    legacyRules: 'none',
    basicML: 'none',
    competitors: 'partial',
  },
  {
    name: 'Custom Tool Integration',
    olorin: 'full',
    legacyRules: 'partial',
    basicML: 'partial',
    competitors: 'partial',
  },
  {
    name: 'Enterprise Scalability',
    olorin: 'full',
    legacyRules: 'partial',
    basicML: 'full',
    competitors: 'full',
  },
  {
    name: 'Adaptive Learning',
    olorin: 'full',
    legacyRules: 'none',
    basicML: 'partial',
    competitors: 'partial',
  },
];

const getStatusIcon = (status: 'full' | 'partial' | 'none'): React.ReactNode => {
  switch (status) {
    case 'full':
      return (
        <div className="w-6 h-6 rounded-full bg-green-500/20 flex items-center justify-center">
          <svg className="w-4 h-4 text-green-400" fill="currentColor" viewBox="0 0 20 20">
            <path
              fillRule="evenodd"
              d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
              clipRule="evenodd"
            />
          </svg>
        </div>
      );
    case 'partial':
      return (
        <div className="w-6 h-6 rounded-full bg-amber-500/20 flex items-center justify-center">
          <div className="w-2 h-2 rounded-full bg-amber-400" />
        </div>
      );
    case 'none':
      return (
        <div className="w-6 h-6 rounded-full bg-red-500/20 flex items-center justify-center">
          <svg className="w-4 h-4 text-red-400" fill="currentColor" viewBox="0 0 20 20">
            <path
              fillRule="evenodd"
              d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z"
              clipRule="evenodd"
            />
          </svg>
        </div>
      );
  }
};

export const ComparisonTable: React.FC = () => {
  return (
    <div className="overflow-x-auto">
      <table className="w-full">
        <thead>
          <tr className="border-b border-white/10">
            <th className="text-left py-4 px-4 text-corporate-textMuted font-medium">Feature</th>
            <th className="text-center py-4 px-4">
              <span className="text-corporate-accentPrimary font-semibold">Olorin</span>
            </th>
            <th className="text-center py-4 px-4">
              <span className="text-corporate-textMuted font-medium">Legacy Rules</span>
            </th>
            <th className="text-center py-4 px-4">
              <span className="text-corporate-textMuted font-medium">Basic ML</span>
            </th>
            <th className="text-center py-4 px-4">
              <span className="text-corporate-textMuted font-medium">Competitors</span>
            </th>
          </tr>
        </thead>
        <tbody>
          {COMPARISON_FEATURES.map((feature, index) => (
            <tr
              key={feature.name}
              className={`border-b border-white/5 ${index % 2 === 0 ? 'bg-white/[0.02]' : ''}`}
            >
              <td className="py-4 px-4 text-corporate-textPrimary">{feature.name}</td>
              <td className="py-4 px-4">
                <div className="flex justify-center">{getStatusIcon(feature.olorin)}</div>
              </td>
              <td className="py-4 px-4">
                <div className="flex justify-center">{getStatusIcon(feature.legacyRules)}</div>
              </td>
              <td className="py-4 px-4">
                <div className="flex justify-center">{getStatusIcon(feature.basicML)}</div>
              </td>
              <td className="py-4 px-4">
                <div className="flex justify-center">{getStatusIcon(feature.competitors)}</div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>

      {/* Legend */}
      <div className="flex items-center justify-center gap-6 mt-6 text-sm text-corporate-textMuted">
        <div className="flex items-center gap-2">
          {getStatusIcon('full')}
          <span>Full Support</span>
        </div>
        <div className="flex items-center gap-2">
          {getStatusIcon('partial')}
          <span>Partial Support</span>
        </div>
        <div className="flex items-center gap-2">
          {getStatusIcon('none')}
          <span>Not Available</span>
        </div>
      </div>
    </div>
  );
};

export default ComparisonTable;
