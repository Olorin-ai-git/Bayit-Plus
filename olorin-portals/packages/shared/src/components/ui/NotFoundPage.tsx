import React from 'react';
import { useNavigate } from 'react-router-dom';
import { GlowingIcon } from '../branding/GlowingIcon';
import { AlertCircle, Home, ArrowLeft } from 'lucide-react';

export interface NotFoundPageLink {
  label: string;
  path: string;
}

export interface NotFoundPageProps {
  /**
   * Accent color for the icon and buttons
   * @default 'main'
   */
  accentColor?: 'main' | 'fraud' | 'streaming' | 'radio' | 'omen';

  /**
   * Popular page links to display
   */
  popularLinks?: NotFoundPageLink[];
}

/**
 * NotFoundPage Component
 * 404 error page with configurable accent color and popular links
 * Used across all Olorin portals
 */
export const NotFoundPage: React.FC<NotFoundPageProps> = ({
  accentColor = 'main',
  popularLinks = [
    { label: 'Home', path: '/' },
    { label: 'Features', path: '/features' },
    { label: 'Contact', path: '/contact' },
  ]
}) => {
  const navigate = useNavigate();

  // Map accent colors to Tailwind classes
  const colorClasses = {
    main: {
      text: 'text-wizard-accent-main',
      border: 'border-wizard-accent-main',
      hover: 'hover:bg-wizard-accent-main/20 hover:shadow-glow-main',
    },
    fraud: {
      text: 'text-wizard-accent-fraud',
      border: 'border-wizard-accent-fraud',
      hover: 'hover:bg-wizard-accent-fraud/20 hover:shadow-glow-fraud',
    },
    streaming: {
      text: 'text-wizard-accent-streaming',
      border: 'border-wizard-accent-streaming',
      hover: 'hover:bg-wizard-accent-streaming/20 hover:shadow-glow-streaming',
    },
    radio: {
      text: 'text-wizard-accent-radio',
      border: 'border-wizard-accent-radio',
      hover: 'hover:bg-wizard-accent-radio/20 hover:shadow-glow-radio',
    },
    omen: {
      text: 'text-wizard-accent-omen',
      border: 'border-wizard-accent-omen',
      hover: 'hover:bg-wizard-accent-omen/20 hover:shadow-glow-omen',
    },
  };

  const colors = colorClasses[accentColor];

  return (
    <div className="not-found-page min-h-screen flex items-center justify-center wizard-gradient-bg wizard-particles">
      <div className="wizard-container">
        <div className="max-w-2xl mx-auto text-center">
          <div className="mb-8 flex justify-center">
            <GlowingIcon
              icon={<AlertCircle className="w-32 h-32" />}
              color={accentColor}
              size="xl"
              animate
            />
          </div>

          <h1 className="text-8xl md:text-9xl font-bold wizard-text mb-6">
            404
          </h1>

          <h2 className="text-3xl md:text-4xl font-bold text-wizard-text-primary mb-4">
            Page Not Found
          </h2>

          <p className="text-lg text-wizard-text-secondary mb-10 max-w-md mx-auto">
            The page you're looking for doesn't exist or has been moved to another location.
          </p>

          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <button
              onClick={() => navigate(-1)}
              className="wizard-button flex items-center justify-center space-x-2"
            >
              <ArrowLeft className="w-5 h-5" />
              <span>Go Back</span>
            </button>

            <button
              onClick={() => navigate('/')}
              className={`bg-transparent border-2 ${colors.border} ${colors.text} ${colors.hover} transition-all duration-300 rounded-lg font-semibold px-6 py-3 flex items-center justify-center space-x-2`}
            >
              <Home className="w-5 h-5" />
              <span>Go Home</span>
            </button>
          </div>

          {popularLinks && popularLinks.length > 0 && (
            <div className="mt-16 pt-8 border-t border-wizard-border-secondary">
              <p className="text-wizard-text-muted mb-4">
                Popular Pages:
              </p>
              <div className="flex flex-wrap justify-center gap-4">
                {popularLinks.map((link, index) => (
                  <React.Fragment key={link.path}>
                    {index > 0 && <span className="text-wizard-text-muted">•</span>}
                    <button
                      onClick={() => navigate(link.path)}
                      className={`${colors.text} hover:underline`}
                    >
                      {link.label}
                    </button>
                  </React.Fragment>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
