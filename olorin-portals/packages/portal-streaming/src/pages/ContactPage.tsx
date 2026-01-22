import React from 'react';
import { useTranslation } from 'react-i18next';
import { ContactPageTemplate, ContactField, ContactInfoItem } from '@olorin/shared';
import emailjs from '@emailjs/browser';

// Check if EmailJS credentials are configured (not placeholders)
const isEmailJSConfigured = () => {
  const serviceId = process.env.REACT_APP_EMAILJS_SERVICE_ID;
  const templateId = process.env.REACT_APP_EMAILJS_TEMPLATE_ID;
  const publicKey = process.env.REACT_APP_EMAILJS_PUBLIC_KEY;

  return serviceId && templateId && publicKey &&
    !serviceId.includes('YOUR_') &&
    !templateId.includes('YOUR_') &&
    !publicKey.includes('YOUR_');
};

const ContactPage: React.FC = () => {
  const { t } = useTranslation();
  const emailConfigured = isEmailJSConfigured();

  const fields: ContactField[] = [
    { id: 'name', type: 'text', label: String(t('contactPage.form.name')), placeholder: String(t('contactPage.form.name')), required: true },
    { id: 'email', type: 'email', label: String(t('contactPage.form.email')), placeholder: String(t('contactPage.form.email')), required: true },
    {
      id: 'helpType',
      type: 'select',
      label: String(t('contactPage.form.helpType')),
      placeholder: String(t('contactPage.form.selectHelpType')),
      required: true,
      options: [
        { value: 'subscribe', label: String(t('contactPage.form.subscribe')) },
        { value: 'trial', label: String(t('contactPage.form.trial')) },
        { value: 'support', label: String(t('contactPage.form.support')) },
        { value: 'billing', label: String(t('contactPage.form.billing')) },
        { value: 'feedback', label: String(t('contactPage.form.feedback')) },
      ],
    },
    { id: 'message', type: 'textarea', label: String(t('contactPage.form.message')), placeholder: String(t('contactPage.form.messagePlaceholder')), required: true },
  ];

  const contactInfo: ContactInfoItem[] = [
    {
      icon: 'email',
      label: String(t('contactPage.contactInfo.email')),
      value: process.env.REACT_APP_CONTACT_EMAIL || '',
      href: `mailto:${process.env.REACT_APP_CONTACT_EMAIL || ''}`
    },
    {
      icon: 'phone',
      label: String(t('contactPage.contactInfo.phone')),
      value: process.env.REACT_APP_CONTACT_PHONE || '',
      href: process.env.REACT_APP_CONTACT_PHONE_HREF || ''
    },
    {
      icon: 'address',
      label: String(t('contactPage.contactInfo.address')),
      value: process.env.REACT_APP_CONTACT_ADDRESS || ''
    },
    {
      icon: 'hours',
      label: String(t('contactPage.contactInfo.hours')),
      value: process.env.REACT_APP_CONTACT_HOURS || ''
    },
  ];

  const handleSubmit = async (data: Record<string, string>) => {
    if (!emailConfigured) {
      throw new Error(
        'Contact form is not configured. Please use the email address below to contact us directly.'
      );
    }

    const serviceId = process.env.REACT_APP_EMAILJS_SERVICE_ID;
    const templateId = process.env.REACT_APP_EMAILJS_TEMPLATE_ID;
    const publicKey = process.env.REACT_APP_EMAILJS_PUBLIC_KEY;

    if (!serviceId || !templateId || !publicKey) {
      throw new Error('EmailJS configuration missing');
    }

    await emailjs.send(serviceId, templateId, {
      from_name: data.name,
      from_email: data.email,
      help_type: data.helpType,
      message: data.message,
      portal: 'Bayit Plus Streaming',
    }, publicKey);
  };

  return (
    <ContactPageTemplate
      title={String(t('contactPage.title'))}
      subtitle={String(t('contactPage.subtitle'))}
      formTitle={String(t('contactPage.formTitle'))}
      infoTitle={String(t('contactPage.infoTitle'))}
      fields={fields}
      contactInfo={contactInfo}
      submitText={String(t('contactPage.submit'))}
      sendingText={String(t('contactPage.sending'))}
      successMessage={String(t('contactPage.success'))}
      errorMessage={String(t('contactPage.error'))}
      warningMessage={
        !emailConfigured
          ? 'Contact form is currently unavailable. Please use the email address below to reach us directly.'
          : undefined
      }
      scheduleTitle={String(t('contactPage.scheduleTitle'))}
      scheduleSubtitle={String(t('contactPage.scheduleSubtitle'))}
      scheduleCta={String(t('contactPage.scheduleCta'))}
      accentColor="streaming"
      onSubmit={handleSubmit}
    />
  );
};

export default ContactPage;
