import React, { useState } from 'react';
import { GlassCard, GlowingIcon, GlassButton } from '../components';
import { Building2 } from 'lucide-react';
import { AccentColor } from '../types/branding.types';
import { contactFormSchema, validateForm } from '../utils/validation';
import { useRateLimit } from '../hooks/useRateLimit';
import { ContactForm, ContactField } from './ContactForm';
import { ContactInfo, ContactInfoItem } from './ContactInfo';

export type { ContactField, ContactInfoItem };

export interface ContactPageTemplateProps {
  title: string;
  subtitle: string;
  formTitle: string;
  infoTitle: string;
  fields: ContactField[];
  contactInfo: ContactInfoItem[];
  submitText: string;
  sendingText: string;
  successMessage: string;
  errorMessage: string;
  warningMessage?: string;
  scheduleTitle?: string;
  scheduleSubtitle?: string;
  scheduleCta?: string;
  accentColor?: AccentColor;
  onSubmit: (data: Record<string, string>) => Promise<void>;
}

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
  warningMessage,
  scheduleTitle,
  scheduleSubtitle,
  scheduleCta,
  accentColor = 'purple',
  onSubmit,
}) => {
  const [formData, setFormData] = useState<Record<string, string>>({});
  const [status, setStatus] = useState<'idle' | 'sending' | 'success' | 'error'>('idle');
  const [validationErrors, setValidationErrors] = useState<Record<string, string>>({});
  const [rateLimitMessage, setRateLimitMessage] = useState<string>('');

  // Rate limiting: 5 attempts per 15 minutes
  const { state: rateLimitState, checkLimit, recordAttempt, reset: resetRateLimit } = useRateLimit({
    maxAttempts: 5,
    windowMs: 15 * 60 * 1000,
    storageKey: 'contact-form-rate-limit',
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setValidationErrors({});
    setRateLimitMessage('');

    // Check rate limit
    if (!checkLimit()) {
      const minutesRemaining = Math.ceil(rateLimitState.timeUntilReset / 60000);
      setRateLimitMessage(`Too many attempts. Please try again in ${minutesRemaining} minute${minutesRemaining !== 1 ? 's' : ''}.`);
      setStatus('error');
      return;
    }

    // Validate and sanitize form data
    const validation = validateForm(contactFormSchema, formData);
    if (!validation.success) {
      setValidationErrors(validation.errors);
      setStatus('error');
      return;
    }

    recordAttempt();
    setStatus('sending');
    try {
      await onSubmit(validation.data);
      setStatus('success');
      setFormData({});
      resetRateLimit();
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
          {warningMessage && (
            <div className="mb-8 p-4 bg-yellow-500/10 border border-yellow-500/30 rounded-lg">
              <p className="text-yellow-200 text-center">{warningMessage}</p>
            </div>
          )}
          <div className="wizard-grid-2 gap-12">
            <GlassCard className="p-8 lg:p-10">
              <h2 className="text-2xl lg:text-3xl font-bold wizard-text mb-8">{formTitle}</h2>
              <ContactForm
                fields={fields}
                formData={formData}
                status={status}
                validationErrors={validationErrors}
                rateLimitMessage={rateLimitMessage}
                successMessage={successMessage}
                errorMessage={errorMessage}
                submitText={submitText}
                sendingText={sendingText}
                onSubmit={handleSubmit}
                onChange={handleChange}
              />
            </GlassCard>

            <ContactInfo title={infoTitle} items={contactInfo} accentColor={accentColor} />
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
