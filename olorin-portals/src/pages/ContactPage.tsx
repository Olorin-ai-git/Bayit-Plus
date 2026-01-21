import React, { useState, useEffect } from 'react';
import { Mail, Phone, MapPin, Clock, Send, CheckCircle, AlertCircle } from 'lucide-react';
import { initializeEmailService, sendContactFormEmail } from '../services/emailService';

const ContactPage: React.FC = () => {
  const [formData, setFormData] = useState({
    firstName: '',
    lastName: '',
    email: '',
    company: '',
    phone: '',
    subject: '',
    message: ''
  });
  const [isSubmitted, setIsSubmitted] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);

  // Initialize email service on component mount
  useEffect(() => {
    initializeEmailService();
  }, []);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setSubmitError(null);

    try {
      // Send email using the email service
      const result = await sendContactFormEmail(formData);

      if (result.success) {
        setIsSubmitted(true);
        
        // Reset form after successful submission
        setTimeout(() => {
          setIsSubmitted(false);
          setFormData({
            firstName: '',
            lastName: '',
            email: '',
            company: '',
            phone: '',
            subject: '',
            message: ''
          });
        }, 5000);
      } else {
        setSubmitError(result.error || 'Failed to send message. Please try again or contact us directly.');
      }

    } catch (error) {
      console.error('Contact Form Error:', error);
      setSubmitError('Failed to send message. Please try again or contact us directly.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const contactInfo = [
    {
      icon: <Mail className="h-5 w-5" />,
      title: "Email Us",
      details: "contact@olorin.ai",
      description: "Send us an email and we'll respond within 24 hours"
    },
    {
      icon: <Phone className="h-5 w-5" />,
      title: "Call Us",
      details: "+1 (201) 397-9142",
      description: "Speak with our fraud prevention experts"
    },
    {
      icon: <MapPin className="h-5 w-5" />,
      title: "Visit Us",
      details: "185 Madison Ave., Cresskill 07626 USA",
      description: "Schedule an in-person meeting at our headquarters"
    },
    {
      icon: <Clock className="h-5 w-5" />,
      title: "Business Hours",
      details: "Monday - Friday, 9:00 AM - 6:00 PM PST",
      description: "We're here to help during business hours"
    }
  ];

  const subjects = [
    "General Inquiry",
    "Product Demo",
    "Technical Support",
    "Partnership Opportunities",
    "Media & Press",
    "Other"
  ];

  return (
    <div className="min-h-screen">
      {/* Hero Section */}
      <section className="relative bg-gradient-to-br from-corporate-bgPrimary via-corporate-bgSecondary to-corporate-bgPrimary py-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center">
            <h1 className="text-4xl md:text-5xl font-bold text-corporate-textPrimary mb-6">
              Get in <span className="text-corporate-accentPrimary">Touch</span>
            </h1>
            <p className="text-xl text-corporate-textSecondary max-w-3xl mx-auto">
              Ready to transform your fraud prevention with AI? Contact our experts
              to schedule a demo and see how Olorin.ai can protect your business.
            </p>
          </div>
        </div>
      </section>

      {/* Contact Form & Info Section */}
      <section className="py-20 bg-corporate-bgSecondary/50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-12">
            {/* Contact Form */}
            <div>
              <h2 className="text-3xl font-bold text-corporate-textPrimary mb-6">
                Send Us a Message
              </h2>
              <p className="text-lg text-corporate-textSecondary mb-8">
                Fill out the form below and our team will get back to you within 24 hours.
              </p>
              
              {isSubmitted ? (
                <div className="glass-card bg-green-500/10 border-green-400/30 p-6 text-center">
                  <CheckCircle className="h-12 w-12 text-green-400 mx-auto mb-4" />
                  <h3 className="text-lg font-semibold text-green-300 mb-2">
                    Message Sent Successfully!
                  </h3>
                  <p className="text-green-400/80">
                    Thank you for contacting us. We'll respond within 24 hours.
                  </p>
                </div>
              ) : (
                <div>
                  {submitError && (
                    <div className="glass-card bg-red-500/10 border-red-400/30 p-4 mb-6 flex items-start space-x-3">
                      <AlertCircle className="h-5 w-5 text-red-400 flex-shrink-0 mt-0.5" />
                      <div>
                        <h4 className="text-red-300 font-medium">Error sending message</h4>
                        <p className="text-red-400/80 text-sm mt-1">{submitError}</p>
                      </div>
                    </div>
                  )}
                <form onSubmit={handleSubmit} className="space-y-6">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div>
                      <label htmlFor="firstName" className="block text-sm font-medium text-corporate-textPrimary mb-2">
                        First Name *
                      </label>
                      <input
                        type="text"
                        id="firstName"
                        name="firstName"
                        required
                        value={formData.firstName}
                        onChange={handleInputChange}
                        className="w-full px-4 py-3 bg-corporate-bgSecondary/50 backdrop-blur-sm border border-corporate-borderPrimary/40 rounded-lg text-corporate-textPrimary placeholder-corporate-textMuted focus:ring-2 focus:ring-corporate-accentPrimary focus:border-corporate-accentPrimary transition-all"
                        placeholder="Enter your first name"
                      />
                    </div>
                    <div>
                      <label htmlFor="lastName" className="block text-sm font-medium text-corporate-textPrimary mb-2">
                        Last Name *
                      </label>
                      <input
                        type="text"
                        id="lastName"
                        name="lastName"
                        required
                        value={formData.lastName}
                        onChange={handleInputChange}
                        className="w-full px-4 py-3 bg-corporate-bgSecondary/50 backdrop-blur-sm border border-corporate-borderPrimary/40 rounded-lg text-corporate-textPrimary placeholder-corporate-textMuted focus:ring-2 focus:ring-corporate-accentPrimary focus:border-corporate-accentPrimary transition-all"
                        placeholder="Enter your last name"
                      />
                    </div>
                  </div>

                  <div>
                    <label htmlFor="email" className="block text-sm font-medium text-corporate-textPrimary mb-2">
                      Email Address *
                    </label>
                    <input
                      type="email"
                      id="email"
                      name="email"
                      required
                      value={formData.email}
                      onChange={handleInputChange}
                      className="w-full px-4 py-3 bg-corporate-bgSecondary/50 backdrop-blur-sm border border-corporate-borderPrimary/40 rounded-lg text-corporate-textPrimary placeholder-corporate-textMuted focus:ring-2 focus:ring-corporate-accentPrimary focus:border-corporate-accentPrimary transition-all"
                      placeholder="Enter your email address"
                    />
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div>
                      <label htmlFor="company" className="block text-sm font-medium text-corporate-textPrimary mb-2">
                        Company
                      </label>
                      <input
                        type="text"
                        id="company"
                        name="company"
                        value={formData.company}
                        onChange={handleInputChange}
                        className="w-full px-4 py-3 bg-corporate-bgSecondary/50 backdrop-blur-sm border border-corporate-borderPrimary/40 rounded-lg text-corporate-textPrimary placeholder-corporate-textMuted focus:ring-2 focus:ring-corporate-accentPrimary focus:border-corporate-accentPrimary transition-all"
                        placeholder="Enter your company name"
                      />
                    </div>
                    <div>
                      <label htmlFor="phone" className="block text-sm font-medium text-corporate-textPrimary mb-2">
                        Phone Number
                      </label>
                      <input
                        type="tel"
                        id="phone"
                        name="phone"
                        value={formData.phone}
                        onChange={handleInputChange}
                        className="w-full px-4 py-3 bg-corporate-bgSecondary/50 backdrop-blur-sm border border-corporate-borderPrimary/40 rounded-lg text-corporate-textPrimary placeholder-corporate-textMuted focus:ring-2 focus:ring-corporate-accentPrimary focus:border-corporate-accentPrimary transition-all"
                        placeholder="Enter your phone number"
                      />
                    </div>
                  </div>

                  <div>
                    <label htmlFor="subject" className="block text-sm font-medium text-corporate-textPrimary mb-2">
                      Subject *
                    </label>
                    <select
                      id="subject"
                      name="subject"
                      required
                      value={formData.subject}
                      onChange={handleInputChange}
                      className="w-full px-4 py-3 bg-corporate-bgSecondary/50 backdrop-blur-sm border border-corporate-borderPrimary/40 rounded-lg text-corporate-textPrimary focus:ring-2 focus:ring-corporate-accentPrimary focus:border-corporate-accentPrimary transition-all"
                    >
                      <option value="">Select a subject</option>
                      {subjects.map((subject, index) => (
                        <option key={index} value={subject}>{subject}</option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label htmlFor="message" className="block text-sm font-medium text-corporate-textPrimary mb-2">
                      Message *
                    </label>
                    <textarea
                      id="message"
                      name="message"
                      required
                      rows={6}
                      value={formData.message}
                      onChange={handleInputChange}
                      className="w-full px-4 py-3 bg-corporate-bgSecondary/50 backdrop-blur-sm border border-corporate-borderPrimary/40 rounded-lg text-corporate-textPrimary placeholder-corporate-textMuted focus:ring-2 focus:ring-corporate-accentPrimary focus:border-corporate-accentPrimary transition-all resize-none"
                      placeholder="Tell us about your fraud prevention needs..."
                    />
                  </div>

                  <button
                    type="submit"
                    disabled={isSubmitting}
                    className={`w-full px-6 py-4 rounded-lg font-semibold transition-all duration-200 flex items-center justify-center space-x-2 ${
                      isSubmitting
                        ? 'bg-corporate-bgSecondary/50 cursor-not-allowed border border-corporate-borderPrimary/40'
                        : 'bg-corporate-accentPrimary hover:brightness-110 shadow-lg'
                    } text-white`}
                  >
                    {isSubmitting ? (
                      <>
                        <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
                        <span>Sending...</span>
                      </>
                    ) : (
                      <>
                        <Send className="h-5 w-5" />
                        <span>Send Message</span>
                      </>
                    )}
                  </button>
                </form>
                </div>
              )}
            </div>

            {/* Contact Information */}
            <div>
              <h2 className="text-3xl font-bold text-corporate-textPrimary mb-6">
                Contact Information
              </h2>
              <p className="text-lg text-corporate-textSecondary mb-8">
                Get in touch with our team of fraud prevention experts. We're here to help
                you secure your business with cutting-edge AI technology.
              </p>

              <div className="space-y-6">
                {contactInfo.map((info, index) => (
                  <div key={index} className="glass-card flex items-start space-x-4 p-6 hover:border-corporate-accentPrimary/60 transition-all duration-200">
                    <div className="flex-shrink-0 bg-corporate-accentPrimary/20 backdrop-blur-sm p-3 rounded-lg border border-corporate-accentPrimary/30">
                      <div className="text-corporate-accentPrimary">
                        {info.icon}
                      </div>
                    </div>
                    <div>
                      <h3 className="text-lg font-semibold text-corporate-textPrimary mb-1">
                        {info.title}
                      </h3>
                      <p className="text-corporate-accentPrimary font-medium mb-1">
                        {info.details}
                      </p>
                      <p className="text-sm text-corporate-textSecondary">
                        {info.description}
                      </p>
                    </div>
                  </div>
                ))}
              </div>

              {/* Additional Info */}
              <div className="mt-8 glass-card bg-corporate-accentPrimary/10 border-corporate-accentPrimary/30 p-6">
                <h3 className="text-lg font-semibold text-corporate-textPrimary mb-3">
                  Quick Response Guarantee
                </h3>
                <p className="text-corporate-textSecondary">
                  We understand that fraud prevention is time-sensitive. Our team commits
                  to responding to all inquiries within 24 hours, with urgent security
                  matters addressed within 4 hours.
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Map or Additional CTA Section */}
      <section className="py-20 bg-gradient-to-r from-corporate-accentPrimary/30 via-corporate-accentSecondary/30 to-corporate-accentPrimary/30">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h2 className="text-3xl md:text-4xl font-bold text-corporate-textPrimary mb-6">
            Prefer to Schedule a Call?
          </h2>
          <p className="text-xl text-corporate-textSecondary mb-8 max-w-2xl mx-auto">
            Book a personalized demo with our fraud prevention experts to see
            how Olorin.ai can protect your specific business needs.
          </p>
          <a
            href="tel:+12013979142"
            className="inline-flex items-center space-x-2 bg-corporate-accentPrimary text-white px-8 py-4 rounded-lg text-lg font-semibold hover:brightness-110 transition-all duration-200 shadow-lg"
          >
            <Phone className="h-5 w-5" />
            <span>Call Now: +1 (201) 397-9142</span>
          </a>
        </div>
      </section>
    </div>
  );
};

export default ContactPage; 