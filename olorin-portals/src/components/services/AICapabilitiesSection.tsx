import React from 'react';
import { Brain, Target, FileText, TrendingUp } from 'lucide-react';

const AICapabilitiesSection: React.FC = () => {
  const aiCapabilities = [
    {
      icon: <Brain className="h-6 w-6" />,
      title: "Pattern Recognition",
      description: "Identify subtle fraud indicators across complex data sets"
    },
    {
      icon: <Target className="h-6 w-6" />,
      title: "Contextual Analysis",
      description: "Understand relationships between different risk factors"
    },
    {
      icon: <FileText className="h-6 w-6" />,
      title: "Natural Language Insights",
      description: "Generate human-readable explanations for risk decisions"
    },
    {
      icon: <TrendingUp className="h-6 w-6" />,
      title: "Adaptive Learning",
      description: "Improve detection accuracy based on new fraud patterns"
    }
  ];

  return (
    <section className="py-16 bg-corporate-bgSecondary/50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-12">
          <h2 className="text-3xl md:text-4xl font-bold text-corporate-textPrimary mb-4">
            AI Integration Strategy
          </h2>
          <p className="text-xl text-corporate-textSecondary max-w-3xl mx-auto">
            Our LLM Risk Assessment Layer leverages Large Language Models to provide intelligent fraud detection
          </p>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
          {aiCapabilities.map((capability, index) => (
            <div key={index} className="text-center glass-card p-6 hover:border-corporate-accentPrimary/60 transition-all duration-200">
              <div className="flex justify-center mb-4">
                <div className="bg-corporate-accentPrimary/20 backdrop-blur-sm p-3 rounded-lg border border-corporate-accentPrimary/30">
                  <div className="text-corporate-accentPrimary">
                    {capability.icon}
                  </div>
                </div>
              </div>
              <h3 className="text-lg font-semibold text-corporate-textPrimary mb-2">
                {capability.title}
              </h3>
              <p className="text-corporate-textSecondary">
                {capability.description}
              </p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
};

export default AICapabilitiesSection;
