import React from 'react';
import { Link } from 'react-router-dom';
import { Mail, Phone, MapPin, Linkedin, Twitter } from 'lucide-react';

const Footer: React.FC = () => {
  return (
    <footer className="glass-footer">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
          {/* Company Info */}
          <div className="col-span-1 md:col-span-2">
            <Link to="/" className="flex items-center space-x-3 mb-4">
              <img
                src={`${process.env.PUBLIC_URL}/assets/images/Olorin-Logo-Wizard-Only-transparent.png`}
                alt="Olorin.ai Wizard Logo"
                className="h-10 w-auto brightness-110"
                onError={(e) => {
                  const target = e.target as HTMLImageElement;
                  target.src = `${process.env.PUBLIC_URL}/logo.png`;
                }}
              />
              <span className="text-2xl font-bold text-corporate-textPrimary">
                Olorin<span className="text-corporate-accentPrimary">.ai</span>
              </span>
            </Link>
            <p className="text-corporate-textSecondary mb-6 max-w-md">
              Leading the future of enterprise security with Generative AI agentic solutions.
              Our structured AI agents revolutionize fraud prevention and investigation processes.
            </p>
            <div className="flex space-x-4">
              <a href="https://linkedin.com/company/olorin-ai" className="text-corporate-textSecondary hover:text-corporate-accentPrimary transition-colors" target="_blank" rel="noopener noreferrer">
                <Linkedin className="h-5 w-5" />
              </a>
              <a href="https://twitter.com/olorin_ai" className="text-corporate-textSecondary hover:text-corporate-accentPrimary transition-colors" target="_blank" rel="noopener noreferrer">
                <Twitter className="h-5 w-5" />
              </a>
            </div>
          </div>

          {/* Quick Links */}
          <div>
            <h3 className="text-lg font-semibold mb-4 text-corporate-textPrimary">Quick Links</h3>
            <ul className="space-y-2">
              <li>
                <Link to="/" className="text-corporate-textSecondary hover:text-corporate-accentPrimary transition-colors">
                  Home
                </Link>
              </li>
              <li>
                <Link to="/about" className="text-corporate-textSecondary hover:text-corporate-accentPrimary transition-colors">
                  About Us
                </Link>
              </li>
              <li>
                <Link to="/services" className="text-corporate-textSecondary hover:text-corporate-accentPrimary transition-colors">
                  Services
                </Link>
              </li>
              <li>
                <Link to="/contact" className="text-corporate-textSecondary hover:text-corporate-accentPrimary transition-colors">
                  Contact
                </Link>
              </li>
            </ul>
          </div>

          {/* Contact Info */}
          <div>
            <h3 className="text-lg font-semibold mb-4 text-corporate-textPrimary">Contact Info</h3>
            <ul className="space-y-3">
              <li className="flex items-center space-x-2">
                <Mail className="h-4 w-4 text-corporate-accentPrimary" />
                <span className="text-corporate-textSecondary">contact@olorin.ai</span>
              </li>
              <li className="flex items-center space-x-2">
                <Phone className="h-4 w-4 text-corporate-accentPrimary" />
                <span className="text-corporate-textSecondary">+1 (201) 397-9142</span>
              </li>
              <li className="flex items-start space-x-2">
                <MapPin className="h-4 w-4 text-corporate-accentPrimary mt-0.5" />
                <span className="text-corporate-textSecondary">
                  185 Madison Ave.<br />
                  Cresskill 07626 USA
                </span>
              </li>
            </ul>
          </div>
        </div>

        {/* Bottom Bar */}
        <div className="border-t border-corporate-borderPrimary/20 mt-8 pt-8 flex flex-col sm:flex-row justify-between items-center">
          <p className="text-corporate-textMuted text-sm">
            © 2026 Olorin.ai. All rights reserved.
          </p>
          <div className="flex space-x-4 mt-4 sm:mt-0">
            <Link to="/privacy" className="text-corporate-textMuted hover:text-corporate-accentPrimary text-sm transition-colors">
              Privacy Policy
            </Link>
            <Link to="/terms" className="text-corporate-textMuted hover:text-corporate-accentPrimary text-sm transition-colors">
              Terms of Service
            </Link>
          </div>
        </div>
      </div>
    </footer>
  );
};

export default Footer; 