/**
 * ContactInfo Component
 * Displays contact information with icons
 */

import React from 'react';
import { Mail, Phone, MapPin, Clock } from 'lucide-react';
import { GlassCard, GlowingIcon } from '../components';
import { AccentColor } from '../types/branding.types';

export interface ContactInfoItem {
  icon: 'email' | 'phone' | 'address' | 'hours';
  label: string;
  value: string;
  href?: string;
}

export interface ContactInfoProps {
  title: string;
  items: ContactInfoItem[];
  accentColor: AccentColor;
}

const iconMap = {
  email: <Mail className="w-6 h-6" />,
  phone: <Phone className="w-6 h-6" />,
  address: <MapPin className="w-6 h-6" />,
  hours: <Clock className="w-6 h-6" />,
};

export const ContactInfo: React.FC<ContactInfoProps> = ({ title, items, accentColor }) => {
  return (
    <div className="space-y-6">
      <GlassCard className="p-8 lg:p-10">
        <h2 className="text-2xl lg:text-3xl font-bold wizard-text mb-8">{title}</h2>
        <div className="space-y-6">
          {items.map((item) => (
            <div key={item.label} className="flex items-start space-x-4">
              <GlowingIcon icon={iconMap[item.icon]} color={accentColor} size="md" />
              <div>
                <h3 className="font-semibold text-wizard-text-primary mb-1">{item.label}</h3>
                {item.href ? (
                  <a href={item.href} className="text-wizard-text-secondary hover:text-wizard-accent-purple transition-colors">
                    {item.value}
                  </a>
                ) : (
                  <p className="text-wizard-text-secondary whitespace-pre-line">{item.value}</p>
                )}
              </div>
            </div>
          ))}
        </div>
      </GlassCard>

      <GlassCard className="p-6">
        <div className="aspect-video bg-wizard-bg-deep rounded-lg flex items-center justify-center border-2 border-wizard-border-secondary">
          <div className="text-center">
            <MapPin className="w-12 h-12 text-wizard-accent-purple mx-auto mb-3 glow-icon" />
            <p className="text-wizard-text-secondary text-sm">Map Integration</p>
          </div>
        </div>
      </GlassCard>
    </div>
  );
};

export default ContactInfo;
