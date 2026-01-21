import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { GlassCard, GlowingIcon } from '@olorin/shared';
import { Mail, Phone, MapPin, Clock, Send } from 'lucide-react';
import emailjs from '@emailjs/browser';

const ContactPage: React.FC = () => {
  const { t } = useTranslation();
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    company: '',
    message: '',
  });
  const [status, setStatus] = useState<'idle' | 'sending' | 'success' | 'error'>('idle');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setStatus('sending');

    try {
      // EmailJS configuration - use environment variables
      const serviceId = process.env.REACT_APP_EMAILJS_SERVICE_ID || 'service_default';
      const templateId = process.env.REACT_APP_EMAILJS_TEMPLATE_ID || 'template_default';
      const publicKey = process.env.REACT_APP_EMAILJS_PUBLIC_KEY || 'public_key_default';

      await emailjs.send(
        serviceId,
        templateId,
        {
          from_name: formData.name,
          from_email: formData.email,
          company: formData.company,
          message: formData.message,
          to_email: 'contact@olorin.ai',
        },
        publicKey
      );

      setStatus('success');
      setFormData({ name: '', email: '', company: '', message: '' });

      // Reset success message after 5 seconds
      setTimeout(() => setStatus('idle'), 5000);
    } catch (error) {
      console.error('Email send error:', error);
      setStatus('error');

      // Reset error message after 5 seconds
      setTimeout(() => setStatus('idle'), 5000);
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value,
    });
  };

  const contactInfo = [
    {
      icon: <Mail className="w-6 h-6" />,
      label: 'Email',
      value: t('contact.info.email'),
      href: `mailto:${t('contact.info.email')}`,
    },
    {
      icon: <Phone className="w-6 h-6" />,
      label: 'Phone',
      value: t('contact.info.phone'),
      href: `tel:${t('contact.info.phone').replace(/[^0-9+]/g, '')}`,
    },
    {
      icon: <MapPin className="w-6 h-6" />,
      label: 'Address',
      value: t('contact.info.address'),
      href: null,
    },
    {
      icon: <Clock className="w-6 h-6" />,
      label: 'Hours',
      value: t('contact.info.hours'),
      href: null,
    },
  ];

  return (
    <div className="contact-page">
      {/* Hero Section */}
      <section className="wizard-gradient-bg wizard-particles py-20 md:py-32">
        <div className="wizard-container">
          <div className="text-center max-w-4xl mx-auto">
            <h1 className="text-4xl sm:text-5xl md:text-7xl font-bold text-wizard-text-primary mb-6 animate-fade-in-up">
              {t('contact.title')}
            </h1>
            <p className="text-lg sm:text-xl md:text-2xl text-wizard-text-secondary animate-fade-in-up animate-delay-100">
              {t('contact.subtitle')}
            </p>
          </div>
        </div>
      </section>

      {/* Contact Form & Info */}
      <section className="wizard-section bg-wizard-bg-primary">
        <div className="wizard-container">
          <div className="wizard-grid-2 gap-12">
            {/* Contact Form */}
            <GlassCard className="p-10">
              <h2 className="text-3xl font-bold wizard-text mb-8">
                Send Us a Message
              </h2>

              <form onSubmit={handleSubmit} className="space-y-6">
                <div>
                  <label htmlFor="name" className="block text-wizard-text-secondary mb-2 font-medium">
                    {t('contact.form.name')}
                  </label>
                  <input
                    type="text"
                    id="name"
                    name="name"
                    value={formData.name}
                    onChange={handleChange}
                    required
                    className="wizard-input w-full"
                    placeholder="John Doe"
                  />
                </div>

                <div>
                  <label htmlFor="email" className="block text-wizard-text-secondary mb-2 font-medium">
                    {t('contact.form.email')}
                  </label>
                  <input
                    type="email"
                    id="email"
                    name="email"
                    value={formData.email}
                    onChange={handleChange}
                    required
                    className="wizard-input w-full"
                    placeholder="john@company.com"
                  />
                </div>

                <div>
                  <label htmlFor="company" className="block text-wizard-text-secondary mb-2 font-medium">
                    {t('contact.form.company')}
                  </label>
                  <input
                    type="text"
                    id="company"
                    name="company"
                    value={formData.company}
                    onChange={handleChange}
                    className="wizard-input w-full"
                    placeholder="Your Company Inc."
                  />
                </div>

                <div>
                  <label htmlFor="message" className="block text-wizard-text-secondary mb-2 font-medium">
                    {t('contact.form.message')}
                  </label>
                  <textarea
                    id="message"
                    name="message"
                    value={formData.message}
                    onChange={handleChange}
                    required
                    rows={6}
                    className="wizard-textarea w-full"
                    placeholder="Tell us about your needs..."
                  />
                </div>

                {/* Status Messages */}
                {status === 'success' && (
                  <div className="p-4 rounded-lg bg-wizard-accent-purple/20 border border-wizard-accent-purple text-wizard-accent-purple">
                    <p className="font-medium">{t('contact.form.success')}</p>
                  </div>
                )}

                {status === 'error' && (
                  <div className="p-4 rounded-lg bg-red-500/20 border border-red-500 text-red-400">
                    <p className="font-medium">{t('contact.form.error')}</p>
                  </div>
                )}

                <button
                  type="submit"
                  disabled={status === 'sending'}
                  className="wizard-button w-full flex items-center justify-center space-x-2"
                >
                  <Send className="w-5 h-5" />
                  <span>
                    {status === 'sending' ? t('contact.form.sending') : t('contact.form.submit')}
                  </span>
                </button>
              </form>
            </GlassCard>

            {/* Contact Information */}
            <div className="space-y-6">
              <GlassCard className="p-10">
                <h2 className="text-3xl font-bold wizard-text mb-8">
                  {t('contact.info.title')}
                </h2>

                <div className="space-y-6">
                  {contactInfo.map((item) => (
                    <div key={item.label} className="flex items-start space-x-4">
                      <div className="flex-shrink-0">
                        <GlowingIcon
                          icon={item.icon}
                          color="purple"
                          size="md"
                        />
                      </div>
                      <div className="flex-1">
                        <h3 className="font-semibold text-wizard-text-primary mb-1">
                          {item.label}
                        </h3>
                        {item.href ? (
                          <a
                            href={item.href}
                            className="text-wizard-text-secondary hover:text-wizard-accent-purple transition-colors whitespace-pre-line"
                          >
                            {item.value}
                          </a>
                        ) : (
                          <p className="text-wizard-text-secondary whitespace-pre-line">
                            {item.value}
                          </p>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </GlassCard>

              {/* Map Placeholder */}
              <GlassCard className="p-6">
                <div className="aspect-video bg-wizard-bg-deep rounded-lg flex items-center justify-center border-2 border-wizard-border-secondary">
                  <div className="text-center">
                    <MapPin className="w-16 h-16 text-wizard-accent-purple mx-auto mb-4 glow-icon" />
                    <p className="text-wizard-text-secondary">
                      Map Integration
                    </p>
                    <p className="text-sm text-wizard-text-muted mt-2">
                      185 Madison Ave, Cresskill, NJ 07626
                    </p>
                  </div>
                </div>
              </GlassCard>
            </div>
          </div>
        </div>
      </section>

      {/* FAQ or Additional Info Section (Optional) */}
      <section className="wizard-section bg-wizard-bg-deep">
        <div className="wizard-container">
          <div className="max-w-3xl mx-auto text-center">
            <h2 className="text-3xl md:text-4xl font-bold text-wizard-text-primary mb-6">
              Prefer to Schedule a Call?
            </h2>
            <p className="text-lg text-wizard-text-secondary mb-8">
              Book a personalized demo with our team to see Olorin.AI in action
            </p>
            <button className="wizard-button text-lg px-10 py-4">
              Schedule a Demo
            </button>
          </div>
        </div>
      </section>
    </div>
  );
};

export default ContactPage;
