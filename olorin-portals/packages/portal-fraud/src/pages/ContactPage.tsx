import React from 'react';
import { useTranslation } from 'react-i18next';
import { ContactPageTemplate, ContactField, ContactInfoItem } from '@olorin/shared';
import emailjs from '@emailjs/browser';

const ContactPage: React.FC = () => {
  const { t } = useTranslation();

  const fields: ContactField[] = [
    { id: 'name', type: 'text', label: t('contactPage.form.name'), placeholder: 'John Doe', required: true },
    { id: 'email', type: 'email', label: t('contactPage.form.email'), placeholder: 'john@company.com', required: true },
    { id: 'company', type: 'text', label: t('contactPage.form.company'), placeholder: 'Your Company Inc.' },
    { id: 'phone', type: 'tel', label: t('contactPage.form.phone'), placeholder: '+1 (555) 000-0000' },
    {
      id: 'industry',
      type: 'select',
      label: t('contactPage.form.industry'),
      placeholder: t('contactPage.form.selectIndustry'),
      options: [
        { value: 'financial', label: t('useCases.financial.title') },
        { value: 'ecommerce', label: t('useCases.ecommerce.title') },
        { value: 'insurance', label: t('useCases.insurance.title') },
        { value: 'healthcare', label: t('useCases.healthcare.title') },
        { value: 'other', label: 'Other' },
      ],
    },
    {
      id: 'volume',
      type: 'select',
      label: t('contactPage.form.transactionVolume'),
      placeholder: t('contactPage.form.selectVolume'),
      options: [
        { value: 'under10k', label: 'Under 10,000/month' },
        { value: '10k-100k', label: '10,000 - 100,000/month' },
        { value: '100k-1m', label: '100,000 - 1M/month' },
        { value: 'over1m', label: 'Over 1M/month' },
      ],
    },
    { id: 'message', type: 'textarea', label: t('contactPage.form.message'), placeholder: t('contactPage.form.messagePlaceholder'), required: true },
  ];

  const contactInfo: ContactInfoItem[] = [
    { icon: 'email', label: 'Email', value: 'fraud@olorin.ai', href: 'mailto:fraud@olorin.ai' },
    { icon: 'phone', label: 'Phone', value: '+1 (201) 397-9142', href: 'tel:+12013979142' },
    { icon: 'address', label: 'Address', value: '185 Madison Ave\nCresskill, NJ 07626' },
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
      industry: data.industry,
      volume: data.volume,
      message: data.message,
      portal: 'Fraud Detection',
    }, publicKey);
  };

  return (
    <ContactPageTemplate
      title={t('contactPage.title')}
      subtitle={t('contactPage.subtitle')}
      formTitle={t('contactPage.formTitle')}
      infoTitle={t('contactPage.infoTitle')}
      fields={fields}
      contactInfo={contactInfo}
      submitText={t('contactPage.submit')}
      sendingText={t('contactPage.sending')}
      successMessage={t('contactPage.success')}
      errorMessage={t('contactPage.error')}
      scheduleTitle={t('contactPage.scheduleTitle')}
      scheduleSubtitle={t('contactPage.scheduleSubtitle')}
      scheduleCta={t('contactPage.scheduleCta')}
      accentColor="fraud"
      onSubmit={handleSubmit}
    />
  );
};

export default ContactPage;
