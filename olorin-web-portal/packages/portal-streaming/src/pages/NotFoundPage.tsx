import React from 'react';
import { useNavigate } from 'react-router-dom';
import { GlowingIcon } from '@olorin/shared';
import { AlertCircle, Home, ArrowLeft } from 'lucide-react';

const NotFoundPage: React.FC = () => {
  const navigate = useNavigate();

  return (
    <div className="not-found-page min-h-screen flex items-center justify-center wizard-gradient-bg wizard-particles">
      <div className="wizard-container">
        <div className="max-w-2xl mx-auto text-center">
          <div className="mb-8 flex justify-center">
            <GlowingIcon
              icon={<AlertCircle className="w-32 h-32" />}
              color="cyan"
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
              className="bg-transparent border-2 border-wizard-accent-cyan text-wizard-accent-cyan hover:bg-wizard-accent-cyan/20 hover:shadow-glow-cyan transition-all duration-300 rounded-lg font-semibold px-6 py-3 flex items-center justify-center space-x-2"
            >
              <Home className="w-5 h-5" />
              <span>Go Home</span>
            </button>
          </div>

          <div className="mt-16 pt-8 border-t border-wizard-border-secondary">
            <p className="text-wizard-text-muted mb-4">
              Popular Pages:
            </p>
            <div className="flex flex-wrap justify-center gap-4">
              <button
                onClick={() => navigate('/')}
                className="text-wizard-accent-cyan hover:underline"
              >
                Home
              </button>
              <span className="text-wizard-text-muted">•</span>
              <button
                onClick={() => navigate('/features')}
                className="text-wizard-accent-cyan hover:underline"
              >
                Features
              </button>
              <span className="text-wizard-text-muted">•</span>
              <button
                onClick={() => navigate('/use-cases')}
                className="text-wizard-accent-cyan hover:underline"
              >
                Use Cases
              </button>
              <span className="text-wizard-text-muted">•</span>
              <button
                onClick={() => navigate('/contact')}
                className="text-wizard-accent-cyan hover:underline"
              >
                Contact
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default NotFoundPage;
