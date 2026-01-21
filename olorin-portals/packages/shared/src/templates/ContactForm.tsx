/**
 * ContactForm Component
 * Contact form with validation, rate limiting, and error handling
 */

import React from 'react';
import { Send } from 'lucide-react';
import { GlassButton } from '../components';

export interface ContactField {
  id: string;
  type: 'text' | 'email' | 'tel' | 'textarea' | 'select';
  label: string;
  placeholder?: string;
  required?: boolean;
  options?: { value: string; label: string }[];
}

export interface ContactFormProps {
  fields: ContactField[];
  formData: Record<string, string>;
  status: 'idle' | 'sending' | 'success' | 'error';
  validationErrors: Record<string, string>;
  rateLimitMessage: string;
  successMessage: string;
  errorMessage: string;
  submitText: string;
  sendingText: string;
  onSubmit: (e: React.FormEvent) => void;
  onChange: (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => void;
}

export const ContactForm: React.FC<ContactFormProps> = ({
  fields,
  formData,
  status,
  validationErrors,
  rateLimitMessage,
  successMessage,
  errorMessage,
  submitText,
  sendingText,
  onSubmit,
  onChange,
}) => {
  const renderField = (field: ContactField) => {
    const commonProps = {
      id: field.id,
      name: field.id,
      value: formData[field.id] || '',
      onChange,
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
    <form onSubmit={onSubmit} className="space-y-5">
      {fields.map((field) => (
        <div key={field.id}>
          <label htmlFor={field.id} className="block text-wizard-text-secondary mb-2 font-medium">
            {field.label} {field.required && <span className="text-red-400">*</span>}
          </label>
          {renderField(field)}
          {validationErrors[field.id] && (
            <p className="text-red-400 text-sm mt-1">{validationErrors[field.id]}</p>
          )}
        </div>
      ))}

      {status === 'success' && (
        <div className="p-4 rounded-lg bg-green-500/20 border border-green-500 text-green-400">
          <p className="font-medium">{successMessage}</p>
        </div>
      )}

      {status === 'error' && (
        <div className="p-4 rounded-lg bg-red-500/20 border border-red-500 text-red-400">
          <p className="font-medium">{rateLimitMessage || errorMessage}</p>
          {Object.keys(validationErrors).length > 0 && !rateLimitMessage && (
            <ul className="mt-2 text-sm list-disc list-inside">
              {Object.entries(validationErrors).map(([field, error]) => (
                <li key={field}>{error}</li>
              ))}
            </ul>
          )}
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
  );
};

export default ContactForm;
