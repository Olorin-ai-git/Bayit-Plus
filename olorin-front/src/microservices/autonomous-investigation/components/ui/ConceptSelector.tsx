import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Zap, Command, Route, Network } from 'lucide-react';

interface ConceptOption {
  id: string;
  title: string;
  description: string;
  icon: React.ComponentType<{ className?: string }>;
  path: string;
  color: string;
  features: string[];
}

const concepts: ConceptOption[] = [
  {
    id: 'power-grid',
    title: 'Power Grid',
    description: 'Energy-based investigation visualization with dynamic node relationships',
    icon: Zap,
    path: '/power-grid',
    color: 'bg-blue-500',
    features: [
      'Energy flow visualization',
      'Dynamic node sizing',
      'Real-time power metrics',
      'Grid topology analysis'
    ]
  },
  {
    id: 'command-center',
    title: 'Command Center',
    description: 'Mission control interface for investigation management and monitoring',
    icon: Command,
    path: '/command-center',
    color: 'bg-purple-500',
    features: [
      'Real-time monitoring',
      'Investigation control',
      'Resource management',
      'Alert system'
    ]
  },
  {
    id: 'evidence-trail',
    title: 'Evidence Trail',
    description: 'Temporal evidence tracking with chronological visualization',
    icon: Route,
    path: '/evidence-trail',
    color: 'bg-green-500',
    features: [
      'Timeline visualization',
      'Evidence correlation',
      'Temporal analysis',
      'Chain of custody'
    ]
  },
  {
    id: 'network-explorer',
    title: 'Network Explorer',
    description: 'Interactive graph navigation with advanced exploration tools',
    icon: Network,
    path: '/network-explorer',
    color: 'bg-orange-500',
    features: [
      'Interactive navigation',
      'Graph exploration',
      'Node clustering',
      'Path analysis'
    ]
  }
];

export const ConceptSelector: React.FC = () => {
  const navigate = useNavigate();

  const handleConceptSelect = (path: string) => {
    navigate(path);
  };

  return (
    <div className="max-w-6xl mx-auto">
      {/* Header */}
      <div className="text-center mb-12">
        <h1 className="text-3xl font-bold text-secondary-900 mb-4">
          Hybrid Graph Investigation Interface
        </h1>
        <p className="text-lg text-secondary-600 max-w-3xl mx-auto">
          Choose your investigation visualization concept. Each interface provides
          unique perspectives on the same underlying data through specialized interaction paradigms.
        </p>
      </div>

      {/* Concept Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        {concepts.map((concept) => {
          const Icon = concept.icon;
          
          return (
            <div
              key={concept.id}
              className="card hover:shadow-elevated transition-all duration-300 cursor-pointer group"
              onClick={() => handleConceptSelect(concept.path)}
            >
              {/* Header */}
              <div className="flex items-center space-x-4 mb-4">
                <div className={`${concept.color} p-3 rounded-lg text-white group-hover:scale-110 transition-transform`}>
                  <Icon className="h-6 w-6" />
                </div>
                <div>
                  <h3 className="text-xl font-semibold text-secondary-900 group-hover:text-primary-600 transition-colors">
                    {concept.title}
                  </h3>
                  <p className="text-sm text-secondary-500">
                    Investigation Interface
                  </p>
                </div>
              </div>

              {/* Description */}
              <p className="text-secondary-600 mb-6">
                {concept.description}
              </p>

              {/* Features */}
              <div className="space-y-2">
                <h4 className="text-sm font-medium text-secondary-700 mb-3">
                  Key Features:
                </h4>
                <div className="grid grid-cols-2 gap-2">
                  {concept.features.map((feature, index) => (
                    <div key={index} className="flex items-center text-sm text-secondary-600">
                      <div className="w-1.5 h-1.5 bg-primary-500 rounded-full mr-2" />
                      {feature}
                    </div>
                  ))}
                </div>
              </div>

              {/* Action */}
              <div className="mt-6 pt-4 border-t border-secondary-100">
                <button className="w-full btn btn-primary group-hover:bg-primary-700 transition-colors">
                  Launch {concept.title}
                </button>
              </div>
            </div>
          );
        })}
      </div>

      {/* Footer */}
      <div className="mt-16 text-center">
        <div className="inline-flex items-center space-x-2 text-sm text-secondary-500">
          <div className="w-2 h-2 bg-autonomous-500 rounded-full animate-pulse" />
          <span>All interfaces share real-time investigation data</span>
        </div>
      </div>
    </div>
  );
};
