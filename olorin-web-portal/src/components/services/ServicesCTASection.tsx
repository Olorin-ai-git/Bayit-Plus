import React from 'react';
import { Link } from 'react-router-dom';
import { ArrowRight } from 'lucide-react';

const ServicesCTASection: React.FC = () => {
  return (
    <section className="py-20 bg-gradient-to-r from-corporate-accentPrimary/30 via-corporate-accentSecondary/30 to-corporate-accentPrimary/30">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
        <h2 className="text-3xl md:text-4xl font-bold text-corporate-textPrimary mb-6">
          Ready to Deploy Intelligent Fraud Investigation?
        </h2>
        <p className="text-xl text-corporate-textSecondary mb-8 max-w-2xl mx-auto">
          Transform your fraud detection capabilities with our comprehensive AI-powered platform.
          Get started with a personalized demo today.
        </p>
        <div className="flex flex-col sm:flex-row gap-4 justify-center">
          <Link
            to="/contact"
            className="inline-flex items-center justify-center px-8 py-4 bg-corporate-accentPrimary text-white rounded-lg text-lg font-semibold hover:brightness-110 transition-all duration-200 shadow-lg space-x-2"
          >
            <span>Schedule Demo</span>
            <ArrowRight className="h-5 w-5" />
          </Link>
          <Link
            to="/about"
            className="inline-flex items-center justify-center px-8 py-4 border-2 border-corporate-accentPrimary text-corporate-accentPrimary rounded-lg text-lg font-semibold hover:bg-corporate-accentPrimary/10 backdrop-blur-sm transition-all duration-200"
          >
            Learn More
          </Link>
        </div>
      </div>
    </section>
  );
};

export default ServicesCTASection;
