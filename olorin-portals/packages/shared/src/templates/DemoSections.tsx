/**
 * DemoSections Component
 * Interactive tabbed demo sections with feature lists
 */

import React, { useState } from 'react';
import { GlassCard, GlassButton } from '../components';
import { CheckCircle, Play, Monitor } from 'lucide-react';

export interface DemoSection {
  title: string;
  description: string;
  image?: string;
  videoUrl?: string;
  features?: string[];
  reversed?: boolean;
}

export interface DemoSectionsProps {
  sections: DemoSection[];
}

export const DemoSections: React.FC<DemoSectionsProps> = ({ sections }) => {
  const [activeSection, setActiveSection] = useState(0);

  return (
    <>
      <div className="flex flex-wrap justify-center gap-4 mb-12">
        {sections.map((section, index) => (
          <GlassButton
            key={section.title}
            onClick={() => setActiveSection(index)}
            variant={activeSection === index ? 'wizard' : 'ghost'}
            size="md"
          >
            {section.title}
          </GlassButton>
        ))}
      </div>

      <GlassCard variant="hero" className="p-8 md:p-12">
        <div className={`grid md:grid-cols-2 gap-8 items-center ${sections[activeSection].reversed ? 'md:flex-row-reverse' : ''}`}>
          <div>
            <h3 className="text-2xl md:text-3xl font-bold wizard-text mb-4">{sections[activeSection].title}</h3>
            <p className="text-wizard-text-secondary mb-6">{sections[activeSection].description}</p>
            {(sections[activeSection]?.features?.length ?? 0) > 0 && (
              <ul className="space-y-3">
                {sections[activeSection].features?.map((feature) => (
                  <li key={feature} className="flex items-center space-x-3">
                    <CheckCircle className="w-5 h-5 text-green-400 flex-shrink-0" />
                    <span className="text-wizard-text-primary">{feature}</span>
                  </li>
                ))}
              </ul>
            )}
          </div>
          <div className="aspect-video bg-wizard-bg-deep rounded-xl flex items-center justify-center border border-wizard-border-primary">
            {sections[activeSection].videoUrl ? (
              <div className="relative w-full h-full flex items-center justify-center cursor-pointer group">
                <Play className="w-16 h-16 text-wizard-accent-purple group-hover:scale-110 transition-transform" />
                <span className="absolute bottom-4 text-wizard-text-secondary text-sm">Click to play demo</span>
              </div>
            ) : (
              <div className="text-center">
                <Monitor className="w-16 h-16 text-wizard-accent-purple mx-auto mb-3" />
                <p className="text-wizard-text-secondary">Interactive Demo</p>
              </div>
            )}
          </div>
        </div>
      </GlassCard>
    </>
  );
};

export default DemoSections;
