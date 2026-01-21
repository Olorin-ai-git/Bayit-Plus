import React, { useState } from 'react';
import { GlassCard, GlowingIcon, GlassButton } from '../components';
import { Mail, Phone, MapPin, Clock, Send, Building2 } from 'lucide-react';
import { AccentColor } from '../types/branding.types';

export interface ContactField {
  id: string;
  type: 'text' | 'email' | 'tel' | 'textarea' | 'select';
  label: string;
  placeholder?: string;
  required?: boolean;
  options?: { value: string; label: string }[];
}

export interface ContactInfo {
  icon: 'email' | 'phone' | 'address' | 'hours';
  label: string;
  value: string;
  href?: string;
}

export interface ContactPageTemplateProps {
  title: string;
  subtitle: string;
  formTitle: string;
  infoTitle: string;
  fields: ContactField[];
  contactInfo: ContactInfo[];
  submitText: string;
  sendingText: string;
  successMessage: string;
  errorMessage: string;
  scheduleTitle?: string;
  scheduleSubtitle?: string;
  scheduleCta?: string;
  accentColor?: AccentColor;
  onSubmit: (data: Record<string, string>) => Promise<void>;
}

const iconMap = {
  email: <Mail className="w-6 h-6" />,
  phone: <Phone className="w-6 h-6" />,
  address: <MapPin className="w-6 h-6" />,
  hours: <Clock className="w-6 h-6" />,
};

export const ContactPageTemplate: React.FC<ContactPageTemplateProps> = ({
  title,
  subtitle,
  formTitle,
  infoTitle,
  fields,
  contactInfo,
  submitText,
  sendingText,
  successMessage,
  errorMessage,
  scheduleTitle,
  scheduleSubtitle,
  scheduleCta,
  accentColor = 'purple',
  onSubmit,
}) => {
  const [formData, setFormData] = useState<Record<string, string>>({});
  const [status, setStatus] = useState<'idle' | 'sending' | 'success' | 'error'>('idle');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setStatus('sending');
    try {
      await onSubmit(formData);
      setStatus('success');
      setFormData({});
      setTimeout(() => setStatus('idle'), 5000);
    } catch {
      setStatus('error');
      setTimeout(() => setStatus('idle'), 5000);
    }
  };

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>
  ) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const renderField = (field: ContactField) => {
    const commonProps = {
      id: field.id,
      name: field.id,
      value: formData[field.id] || '',
      onChange: handleChange,
      required: field.required,
      placeholder: field.placeholder,
      className: 'wizard-input w-full',
    };

    if (field.type === 'textarea') {
      return <textarea {...commonProps} rows={5} className="wizard-textarea w-full" />;
    }

    if (field.type === 'select' && field.options) {
      return (
        <select {...commonProps} className="wizard-select w-full">
          <option value="">{field.placeholder}</option>
          {field.options.map((opt) => (
            <option key={opt.value} value={opt.value}>{opt.label}</option>
          ))}
        </select>
      );
    }

    return <input {...commonProps} type={field.type} />;
  };

  return (
    <div className="contact-page">
      <section className="wizard-gradient-bg wizard-particles py-20 md:py-32">
        <div className="wizard-container">
          <div className="text-center max-w-4xl mx-auto">
            <div className="mb-8 flex justify-center">
              <GlowingIcon icon={<Building2 className="w-16 h-16" />} color={accentColor} size="xl" animate />
            </div>
            <h1 className="text-4xl sm:text-5xl md:text-6xl font-bold text-wizard-text-primary mb-6 animate-fade-in-up">
              {title}
            </h1>
            <p className="text-lg sm:text-xl text-wizard-text-secondary animate-fade-in-up animate-delay-100">
              {subtitle}
            </p>
          </div>
        </div>
      </section>

      <section className="wizard-section bg-wizard-bg-primary">
        <div className="wizard-container">
          <div className="wizard-grid-2 gap-12">
            <GlassCard className="p-8 lg:p-10">
              <h2 className="text-2xl lg:text-3xl font-bold wizard-text mb-8">{formTitle}</h2>
              <form onSubmit={handleSubmit} className="space-y-5">
                {fields.map((field) => (
                  <div key={field.id}>
                    <label htmlFor={field.id} className="block text-wizard-text-secondary mb-2 font-medium">
                      {field.label} {field.required && <span className="text-red-400">*</span>}
                    </label>
                    {renderField(field)}
                  </div>
                ))}

                {status === 'success' && (
                  <div className="p-4 rounded-lg bg-green-500/20 border border-green-500 text-green-400">
                    <p className="font-medium">{successMessage}</p>
                  </div>
                )}

                {status === 'error' && (
                  <div className="p-4 rounded-lg bg-red-500/20 border border-red-500 text-red-400">
                    <p className="font-medium">{errorMessage}</p>
                  </div>
                )}

                <GlassButton
                  type="submit"
                  variant="wizard"
                  disabled={status === 'sending'}
                  className="w-full flex items-center justify-center space-x-2"
                >
                  <Send className="w-5 h-5" />
                  <span>{status === 'sending' ? sendingText : submitText}</span>
                </GlassButton>
              </form>
            </GlassCard>

            <div className="space-y-6">
              <GlassCard className="p-8 lg:p-10">
                <h2 className="text-2xl lg:text-3xl font-bold wizard-text mb-8">{infoTitle}</h2>
                <div className="space-y-6">
                  {contactInfo.map((item) => (
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
          </div>
        </div>
      </section>

      {scheduleTitle && (
        <section className="wizard-section bg-wizard-bg-deep">
          <div className="wizard-container">
            <div className="max-w-3xl mx-auto text-center">
              <h2 className="text-3xl md:text-4xl font-bold text-wizard-text-primary mb-6">{scheduleTitle}</h2>
              {scheduleSubtitle && <p className="text-lg text-wizard-text-secondary mb-8">{scheduleSubtitle}</p>}
              {scheduleCta && <GlassButton variant="wizard" size="lg">{scheduleCta}</GlassButton>}
            </div>
          </div>
        </section>
      )}
    </div>
  );
};

export default ContactPageTemplate;
