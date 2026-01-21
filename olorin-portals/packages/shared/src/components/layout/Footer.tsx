import React from 'react';
import { Link } from 'react-router-dom';
import { Mail, Phone, MapPin, Linkedin, Twitter } from 'lucide-react';
import { WizardLogo } from '../branding/WizardLogo';

export interface FooterLink {
  name: string;
  href: string;
}

export interface FooterProps {
  domain?: 'main' | 'fraud' | 'streaming' | 'radio' | 'omen';
  companyDescription?: string;
  quickLinks?: FooterLink[];
  email?: string;
  phone?: string;
  address?: string;
  linkedinUrl?: string;
  twitterUrl?: string;
}

/**
 * Footer Component
 *
 * Shared glassmorphic footer with wizard theme.
 * Supports domain-specific branding and customizable links.
 *
 * @example
 * <Footer
 *   domain="fraud"
 *   companyDescription="AI-powered fraud detection solutions"
 *   quickLinks={[
 *     { name: 'Home', href: '/' },
 *     { name: 'About', href: '/about' }
 *   ]}
 * />
 */
export const Footer: React.FC<FooterProps> = ({
  domain = 'main',
  companyDescription = 'Leading the future of enterprise AI with Generative AI agentic solutions across fraud detection, media streaming, and radio management.',
  quickLinks = [
    { name: 'Home', href: '/' },
    { name: 'About Us', href: '/about' },
    { name: 'Contact', href: '/contact' },
  ],
  email = 'contact@olorin.ai',
  phone = '+1 (201) 397-9142',
  address = '185 Madison Ave.\nCresskill 07626 USA',
  linkedinUrl = 'https://linkedin.com/company/olorin-ai',
  twitterUrl = 'https://twitter.com/olorin_ai',
}) => {
  const currentYear = new Date().getFullYear();

  return (
    <footer className="glass-footer-wizard">
      <div className="wizard-container py-12">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
          {/* Company Info */}
          <div className="col-span-1 md:col-span-2">
            <Link to="/" className="mb-4 inline-block hover-scale">
              <WizardLogo variant={domain} size="md" showText />
            </Link>
            <p className="text-wizard-text-secondary mb-6 max-w-md">
              {companyDescription}
            </p>
            <div className="flex space-x-4">
              <a
                href={linkedinUrl}
                className="text-wizard-text-secondary hover:text-wizard-accent-purple hover:glow-purple transition-all duration-300"
                target="_blank"
                rel="noopener noreferrer"
                aria-label="LinkedIn"
              >
                <Linkedin className="h-5 w-5" />
              </a>
              <a
                href={twitterUrl}
                className="text-wizard-text-secondary hover:text-wizard-accent-purple hover:glow-purple transition-all duration-300"
                target="_blank"
                rel="noopener noreferrer"
                aria-label="Twitter"
              >
                <Twitter className="h-5 w-5" />
              </a>
            </div>
          </div>

          {/* Quick Links */}
          <div>
            <h3 className="text-lg font-semibold mb-4 text-wizard-text-primary">
              Quick Links
            </h3>
            <ul className="space-y-2">
              {quickLinks.map((link) => (
                <li key={link.name}>
                  <Link
                    to={link.href}
                    className="text-wizard-text-secondary hover:text-wizard-accent-purple transition-colors"
                  >
                    {link.name}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* Contact Info */}
          <div>
            <h3 className="text-lg font-semibold mb-4 text-wizard-text-primary">
              Contact Info
            </h3>
            <ul className="space-y-3">
              <li className="flex items-center space-x-2">
                <Mail className="h-4 w-4 text-wizard-accent-purple glow-icon" />
                <a
                  href={`mailto:${email}`}
                  className="text-wizard-text-secondary hover:text-wizard-accent-purple transition-colors"
                >
                  {email}
                </a>
              </li>
              <li className="flex items-center space-x-2">
                <Phone className="h-4 w-4 text-wizard-accent-purple glow-icon" />
                <a
                  href={`tel:${phone.replace(/[^0-9+]/g, '')}`}
                  className="text-wizard-text-secondary hover:text-wizard-accent-purple transition-colors"
                >
                  {phone}
                </a>
              </li>
              <li className="flex items-start space-x-2">
                <MapPin className="h-4 w-4 text-wizard-accent-purple glow-icon mt-0.5" />
                <span className="text-wizard-text-secondary whitespace-pre-line">
                  {address}
                </span>
              </li>
            </ul>
          </div>
        </div>

        {/* Bottom Bar */}
        <div className="border-t border-wizard-border-secondary mt-8 pt-8 flex flex-col sm:flex-row justify-between items-center">
          <p className="text-wizard-text-muted text-sm">
            © {currentYear} Olorin.ai. All rights reserved.
          </p>
          <div className="flex space-x-4 mt-4 sm:mt-0">
            <Link
              to="/privacy"
              className="text-wizard-text-muted hover:text-wizard-accent-purple text-sm transition-colors"
            >
              Privacy Policy
            </Link>
            <Link
              to="/terms"
              className="text-wizard-text-muted hover:text-wizard-accent-purple text-sm transition-colors"
            >
              Terms of Service
            </Link>
          </div>
        </div>
      </div>
    </footer>
  );
};

export default Footer;
