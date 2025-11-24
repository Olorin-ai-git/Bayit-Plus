import React from 'react';
import { Link } from 'react-router-dom';
import { ArrowRight } from 'lucide-react';

const ServicesHeroSection: React.FC = () => {
  return (
    <section className="relative bg-gradient-to-br from-corporate-bgPrimary via-corporate-bgSecondary to-corporate-bgPrimary py-20">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center">
          <h1 className="text-4xl md:text-5xl font-bold text-corporate-textPrimary mb-6">
            Intelligent <span className="text-corporate-accentPrimary">Fraud Investigation</span> Platform
          </h1>
          <p className="text-xl text-corporate-textSecondary max-w-4xl mx-auto mb-8">
            An intelligent fraud investigation platform that automates risk assessment across multiple data domains.
            Combines specialized domain agents with AI-powered analysis to provide comprehensive security insights
            for user accounts and devices.
          </p>
          <Link
            to="/contact"
            className="inline-flex items-center space-x-2 bg-corporate-accentPrimary text-white px-8 py-4 rounded-lg text-lg font-semibold hover:brightness-110 transition-all duration-200 shadow-lg"
          >
            <span>Get Started Today</span>
            <ArrowRight className="h-5 w-5" />
          </Link>
        </div>
      </div>
    </section>
  );
};

export default ServicesHeroSection;
