import React from 'react';
import { useTranslation } from 'react-i18next';
import { ContactPageTemplate, ContactField, ContactInfoItem } from '@olorin/shared';
import emailjs from '@emailjs/browser';

const ContactPage: React.FC = () => {
  const { t } = useTranslation();

  const fields: ContactField[] = [
    { id: 'name', type: 'text', label: String(t('contactPage.form.name')), placeholder: 'John Doe', required: true },
    { id: 'email', type: 'email', label: String(t('contactPage.form.email')), placeholder: 'john@company.com', required: true },
    { id: 'company', type: 'text', label: String(t('contactPage.form.company')), placeholder: 'Your Streaming Platform' },
    { id: 'phone', type: 'tel', label: String(t('contactPage.form.phone')), placeholder: '+1 (555) 000-0000' },
    {
      id: 'platform',
      type: 'select',
      label: String(t('contactPage.form.platform')),
      placeholder: String(t('contactPage.form.selectPlatform')),
      options: [
        { value: 'ott', label: 'OTT / Streaming Service' },
        { value: 'broadcast', label: 'Broadcast / TV' },
        { value: 'education', label: 'Educational Platform' },
        { value: 'enterprise', label: 'Enterprise Video' },
        { value: 'other', label: 'Other' },
      ],
    },
    {
      id: 'viewers',
      type: 'select',
      label: String(t('contactPage.form.viewers')),
      placeholder: String(t('contactPage.form.selectViewers')),
      options: [
        { value: 'under10k', label: 'Under 10,000/month' },
        { value: '10k-100k', label: '10,000 - 100,000/month' },
        { value: '100k-1m', label: '100,000 - 1M/month' },
        { value: 'over1m', label: 'Over 1M/month' },
      ],
    },
    { id: 'message', type: 'textarea', label: String(t('contactPage.form.message')), placeholder: String(t('contactPage.form.messagePlaceholder')), required: true },
  ];

  const contactInfo: ContactInfoItem[] = [
    { icon: 'email', label: 'Email', value: 'streaming@olorin.ai', href: 'mailto:streaming@olorin.ai' },
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
      platform: data.platform,
      viewers: data.viewers,
      message: data.message,
      portal: 'Streaming Platform',
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
      accentColor="streaming"
      onSubmit={handleSubmit}
    />
  );
};

export default ContactPage;
