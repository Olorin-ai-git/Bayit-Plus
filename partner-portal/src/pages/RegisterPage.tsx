/**
 * Register Page
 *
 * B2B Partner Portal registration page with multi-step form.
 */

import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';
import { useB2BAuthStore } from '../stores/authStore';
import { toast } from '../stores/uiStore';
import { AuthLayout } from '../components/layout/AuthLayout';

type Step = 1 | 2;

interface FormData {
  orgId: string;
  orgName: string;
  contactEmail: string;
  ownerName: string;
  ownerEmail: string;
  ownerPassword: string;
  confirmPassword: string;
  acceptTerms: boolean;
}

const initialFormData: FormData = {
  orgId: '',
  orgName: '',
  contactEmail: '',
  ownerName: '',
  ownerEmail: '',
  ownerPassword: '',
  confirmPassword: '',
  acceptTerms: false,
};

export const RegisterPage: React.FC = () => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { register, isLoading, error, clearError } = useB2BAuthStore();

  const [step, setStep] = useState<Step>(1);
  const [formData, setFormData] = useState<FormData>(initialFormData);
  const [showPassword, setShowPassword] = useState(false);

  const updateField = (field: keyof FormData, value: string | boolean) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  const validateStep1 = (): boolean => {
    return formData.orgId.length >= 3 &&
      formData.orgName.length >= 2 &&
      formData.contactEmail.includes('@');
  };

  const validateStep2 = (): boolean => {
    return formData.ownerName.length >= 2 &&
      formData.ownerEmail.includes('@') &&
      formData.ownerPassword.length >= 8 &&
      formData.ownerPassword === formData.confirmPassword &&
      formData.acceptTerms;
  };

  const handleNext = () => {
    if (validateStep1()) {
      setStep(2);
    }
  };

  const handleBack = () => {
    setStep(1);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    clearError();

    if (!validateStep2()) {
      return;
    }

    try {
      await register({
        organization: {
          orgId: formData.orgId,
          name: formData.orgName,
          contactEmail: formData.contactEmail,
        },
        owner: {
          name: formData.ownerName,
          email: formData.ownerEmail,
          password: formData.ownerPassword,
        },
      });
      toast.success(t('common.success'));
      navigate('/', { replace: true });
    } catch {
      toast.error(t('auth.registerError'));
    }
  };

  return (
    <AuthLayout>
      <div className="text-center mb-8">
        <h1 className="text-2xl font-bold text-white">{t('auth.createYourAccount')}</h1>
        <p className="mt-2 text-sm text-white/60">
          {step === 1 ? t('register.step1Title') : t('register.step2Title')}
        </p>

        {/* Step Indicator */}
        <div className="flex items-center justify-center gap-3 mt-6">
          <div
            className={`
              h-2 w-12 rounded-full transition-colors
              ${step >= 1 ? 'bg-partner-primary' : 'bg-white/20'}
            `}
          />
          <div
            className={`
              h-2 w-12 rounded-full transition-colors
              ${step >= 2 ? 'bg-partner-primary' : 'bg-white/20'}
            `}
          />
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        {step === 1 && (
          <>
            {/* Organization ID */}
            <div>
              <label htmlFor="orgId" className="block text-sm font-medium text-white/80 mb-2">
                {t('register.orgId')}
              </label>
              <input
                id="orgId"
                type="text"
                value={formData.orgId}
                onChange={(e) => updateField('orgId', e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, ''))}
                required
                minLength={3}
                maxLength={50}
                className="
                  w-full px-4 py-3 rounded-xl
                  bg-white/5 border border-white/10
                  text-white placeholder-white/40
                  focus:outline-none focus:border-partner-primary focus:ring-1 focus:ring-partner-primary
                  transition-all duration-200
                "
                placeholder="my-company"
              />
              <p className="mt-1.5 text-xs text-white/40">{t('register.orgIdHelp')}</p>
            </div>

            {/* Organization Name */}
            <div>
              <label htmlFor="orgName" className="block text-sm font-medium text-white/80 mb-2">
                {t('register.orgName')}
              </label>
              <input
                id="orgName"
                type="text"
                value={formData.orgName}
                onChange={(e) => updateField('orgName', e.target.value)}
                required
                minLength={2}
                className="
                  w-full px-4 py-3 rounded-xl
                  bg-white/5 border border-white/10
                  text-white placeholder-white/40
                  focus:outline-none focus:border-partner-primary focus:ring-1 focus:ring-partner-primary
                  transition-all duration-200
                "
                placeholder="My Company Inc."
              />
            </div>

            {/* Contact Email */}
            <div>
              <label htmlFor="contactEmail" className="block text-sm font-medium text-white/80 mb-2">
                {t('register.contactEmail')}
              </label>
              <input
                id="contactEmail"
                type="email"
                value={formData.contactEmail}
                onChange={(e) => updateField('contactEmail', e.target.value)}
                required
                className="
                  w-full px-4 py-3 rounded-xl
                  bg-white/5 border border-white/10
                  text-white placeholder-white/40
                  focus:outline-none focus:border-partner-primary focus:ring-1 focus:ring-partner-primary
                  transition-all duration-200
                "
                placeholder="contact@company.com"
              />
            </div>

            {/* Next Button */}
            <button
              type="button"
              onClick={handleNext}
              disabled={!validateStep1()}
              className="
                w-full py-3 rounded-xl
                bg-partner-primary text-white
                font-semibold text-sm
                hover:bg-partner-primary/90
                focus:outline-none focus:ring-2 focus:ring-partner-primary/50
                disabled:opacity-50 disabled:cursor-not-allowed
                transition-all duration-200
              "
            >
              {t('common.next')}
            </button>
          </>
        )}

        {step === 2 && (
          <>
            {/* Owner Name */}
            <div>
              <label htmlFor="ownerName" className="block text-sm font-medium text-white/80 mb-2">
                {t('register.ownerName')}
              </label>
              <input
                id="ownerName"
                type="text"
                value={formData.ownerName}
                onChange={(e) => updateField('ownerName', e.target.value)}
                required
                minLength={2}
                className="
                  w-full px-4 py-3 rounded-xl
                  bg-white/5 border border-white/10
                  text-white placeholder-white/40
                  focus:outline-none focus:border-partner-primary focus:ring-1 focus:ring-partner-primary
                  transition-all duration-200
                "
                placeholder="John Doe"
              />
            </div>

            {/* Owner Email */}
            <div>
              <label htmlFor="ownerEmail" className="block text-sm font-medium text-white/80 mb-2">
                {t('register.ownerEmail')}
              </label>
              <input
                id="ownerEmail"
                type="email"
                value={formData.ownerEmail}
                onChange={(e) => updateField('ownerEmail', e.target.value)}
                required
                autoComplete="email"
                className="
                  w-full px-4 py-3 rounded-xl
                  bg-white/5 border border-white/10
                  text-white placeholder-white/40
                  focus:outline-none focus:border-partner-primary focus:ring-1 focus:ring-partner-primary
                  transition-all duration-200
                "
                placeholder="you@company.com"
              />
            </div>

            {/* Password */}
            <div>
              <label htmlFor="ownerPassword" className="block text-sm font-medium text-white/80 mb-2">
                {t('register.ownerPassword')}
              </label>
              <div className="relative">
                <input
                  id="ownerPassword"
                  type={showPassword ? 'text' : 'password'}
                  value={formData.ownerPassword}
                  onChange={(e) => updateField('ownerPassword', e.target.value)}
                  required
                  minLength={8}
                  autoComplete="new-password"
                  className="
                    w-full px-4 py-3 rounded-xl
                    bg-white/5 border border-white/10
                    text-white placeholder-white/40
                    focus:outline-none focus:border-partner-primary focus:ring-1 focus:ring-partner-primary
                    transition-all duration-200
                  "
                  placeholder="••••••••"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-white/40 hover:text-white/60 transition-colors"
                >
                  {showPassword ? '👁️' : '👁️‍🗨️'}
                </button>
              </div>
            </div>

            {/* Confirm Password */}
            <div>
              <label htmlFor="confirmPassword" className="block text-sm font-medium text-white/80 mb-2">
                {t('auth.confirmPassword')}
              </label>
              <input
                id="confirmPassword"
                type="password"
                value={formData.confirmPassword}
                onChange={(e) => updateField('confirmPassword', e.target.value)}
                required
                minLength={8}
                autoComplete="new-password"
                className={`
                  w-full px-4 py-3 rounded-xl
                  bg-white/5 border
                  text-white placeholder-white/40
                  focus:outline-none focus:ring-1
                  transition-all duration-200
                  ${
                    formData.confirmPassword && formData.confirmPassword !== formData.ownerPassword
                      ? 'border-red-500/50 focus:border-red-500 focus:ring-red-500'
                      : 'border-white/10 focus:border-partner-primary focus:ring-partner-primary'
                  }
                `}
                placeholder="••••••••"
              />
            </div>

            {/* Terms Checkbox */}
            <label className="flex items-start gap-3 cursor-pointer">
              <input
                type="checkbox"
                checked={formData.acceptTerms}
                onChange={(e) => updateField('acceptTerms', e.target.checked)}
                className="mt-1 h-4 w-4 rounded border-white/30 bg-white/5 text-partner-primary focus:ring-partner-primary focus:ring-offset-0"
              />
              <span className="text-sm text-white/60">{t('auth.termsAgree')}</span>
            </label>

            {/* Error Message */}
            {error && (
              <div className="p-4 rounded-xl bg-red-500/10 border border-red-500/30 text-red-400 text-sm">
                {error}
              </div>
            )}

            {/* Buttons */}
            <div className="flex gap-3">
              <button
                type="button"
                onClick={handleBack}
                className="
                  flex-1 py-3 rounded-xl
                  bg-white/10 text-white
                  font-semibold text-sm
                  hover:bg-white/20
                  focus:outline-none focus:ring-2 focus:ring-white/20
                  transition-all duration-200
                "
              >
                {t('common.back')}
              </button>
              <button
                type="submit"
                disabled={isLoading || !validateStep2()}
                className="
                  flex-1 py-3 rounded-xl
                  bg-partner-primary text-white
                  font-semibold text-sm
                  hover:bg-partner-primary/90
                  focus:outline-none focus:ring-2 focus:ring-partner-primary/50
                  disabled:opacity-50 disabled:cursor-not-allowed
                  transition-all duration-200
                "
              >
                {isLoading ? (
                  <span className="flex items-center justify-center gap-2">
                    <span className="h-4 w-4 animate-spin rounded-full border-2 border-white/30 border-t-white" />
                    {t('common.loading')}
                  </span>
                ) : (
                  t('auth.register')
                )}
              </button>
            </div>
          </>
        )}
      </form>
    </AuthLayout>
  );
};

export default RegisterPage;
