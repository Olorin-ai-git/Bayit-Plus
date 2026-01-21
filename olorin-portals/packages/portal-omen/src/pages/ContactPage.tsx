import React from 'react';
import { useTranslation } from 'react-i18next';
import { ContactPageTemplate, ContactField, ContactInfo } from '@olorin/shared';
import emailjs from '@emailjs/browser';

const ContactPage: React.FC = () => {
  const { t } = useTranslation();

  const fields: ContactField[] = [
    { id: 'name', label: String(t('contactPage.form.name')), type: 'text', required: true },
    { id: 'email', label: String(t('contactPage.form.email')), type: 'email', required: true },
    { id: 'company', label: String(t('contactPage.form.company')), type: 'text' },
    { id: 'phone', label: String(t('contactPage.form.phone')), type: 'tel' },
    {
      id: 'useCase',
      label: String(t('contactPage.form.useCase')),
      type: 'select',
      required: true,
      placeholder: String(t('contactPage.form.selectUseCase')),
      options: [
        { value: 'travel', label: 'Travel & Tourism' },
        { value: 'business', label: 'Business Meetings' },
        { value: 'accessibility', label: 'Accessibility Needs' },
        { value: 'learning', label: 'Language Learning' },
        { value: 'events', label: 'Conferences & Events' },
        { value: 'other', label: 'Other' },
      ],
    },
    {
      id: 'interest',
      label: String(t('contactPage.form.interest')),
      type: 'select',
      required: true,
      placeholder: String(t('contactPage.form.selectInterest')),
      options: [
        { value: 'ios-app', label: 'iOS App' },
        { value: 'wearable', label: 'Wearable Display' },
        { value: 'enterprise', label: 'Enterprise Solution' },
        { value: 'partnership', label: 'Partnership' },
      ],
    },
    {
      id: 'message',
      label: String(t('contactPage.form.message')),
      type: 'textarea',
      required: true,
      placeholder: String(t('contactPage.form.messagePlaceholder')),
    },
  ];

  const contactInfo: ContactInfo[] = [
    { icon: 'email', label: 'Email', value: 'omen@olorin.ai', href: 'mailto:omen@olorin.ai' },
    { icon: 'phone', label: 'Phone', value: '+1 (201) 397-9142', href: 'tel:+12013979142' },
    { icon: 'address', label: 'Location', value: 'Teaneck, NJ, USA' },
    { icon: 'hours', label: 'Business Hours', value: 'Mon - Fri: 9AM - 6PM EST' },
  ];

  const handleSubmit = async (data: Record<string, string>) => {
    const serviceId = process.env.REACT_APP_EMAILJS_SERVICE_ID;
    const templateId = process.env.REACT_APP_EMAILJS_TEMPLATE_ID;
    const publicKey = process.env.REACT_APP_EMAILJS_PUBLIC_KEY;

    if (!serviceId || !templateId || !publicKey) {
      throw new Error('EmailJS configuration missing');
    }

    await emailjs.send(serviceId, templateId, {
      from_name: data.name,
      from_email: data.email,
      company: data.company,
      phone: data.phone,
      use_case: data.useCase,
      interest: data.interest,
      message: data.message,
      portal: 'Omen Speech Translation',
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
      scheduleTitle={String(t('contactPage.scheduleTitle'))}
      scheduleSubtitle={String(t('contactPage.scheduleSubtitle'))}
      scheduleCta={String(t('contactPage.scheduleCta'))}
      accentColor="omen"
      onSubmit={handleSubmit}
    />
  );
};

export default ContactPage;
