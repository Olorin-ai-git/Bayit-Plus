import React from 'react';
import { useTranslation } from 'react-i18next';
import { ContactPageTemplate, ContactField, ContactInfoItem } from '@olorin/shared';
import emailjs from '@emailjs/browser';

const ContactPage: React.FC = () => {
  const { t } = useTranslation();

  const fields: ContactField[] = [
    { id: 'name', label: String(t('contactPage.form.name')), type: 'text', required: true },
    { id: 'email', label: String(t('contactPage.form.email')), type: 'email', required: true },
    { id: 'company', label: String(t('contactPage.form.company')), type: 'text', required: true },
    { id: 'phone', label: String(t('contactPage.form.phone')), type: 'tel' },
    {
      id: 'stationType',
      label: String(t('contactPage.form.stationType')),
      type: 'select',
      required: true,
      placeholder: String(t('contactPage.form.selectStationType')),
      options: [
        { value: 'commercial', label: 'Commercial Radio' },
        { value: 'music', label: 'Music Station' },
        { value: 'talk', label: 'Talk Radio' },
        { value: 'community', label: 'Community Station' },
        { value: 'internet', label: 'Internet Radio' },
        { value: 'podcast', label: 'Podcast Network' },
      ],
    },
    {
      id: 'listeners',
      label: String(t('contactPage.form.listeners')),
      type: 'select',
      required: true,
      placeholder: String(t('contactPage.form.selectListeners')),
      options: [
        { value: 'under-10k', label: 'Under 10,000' },
        { value: '10k-50k', label: '10,000 - 50,000' },
        { value: '50k-100k', label: '50,000 - 100,000' },
        { value: '100k-500k', label: '100,000 - 500,000' },
        { value: 'over-500k', label: 'Over 500,000' },
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

  const contactInfo: ContactInfoItem[] = [
    { icon: 'email', label: 'Email', value: 'radio@olorin.ai', href: 'mailto:radio@olorin.ai' },
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
      station_type: data.stationType,
      listeners: data.listeners,
      message: data.message,
      portal: 'Radio Manager',
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
      accentColor="radio"
      onSubmit={handleSubmit}
    />
  );
};

export default ContactPage;
