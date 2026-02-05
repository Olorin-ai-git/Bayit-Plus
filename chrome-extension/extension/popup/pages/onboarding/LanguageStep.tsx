import { useTranslation } from 'react-i18next';
import { GlassCard, GlassButton, GlassSelect } from '@bayit/glass';
import { SUPPORTED_LANGUAGES } from '../../../config/constants';

interface LanguageStepProps {
  onNext: () => void;
  currentLanguage: string;
  onLanguageChange: (lang: string) => void;
}

export function LanguageStep({ onNext, currentLanguage, onLanguageChange }: LanguageStepProps) {
  const { t } = useTranslation();

  const languageOptions = SUPPORTED_LANGUAGES.map((lang) => ({
    value: lang.code,
    label: lang.name,
  }));

  return (
    <GlassCard className="p-8 max-w-md">
      <h2 className="text-2xl font-bold text-white mb-2 text-center">
        {t('onboarding.language.title', 'Choose Target Language')}
      </h2>
      <p className="text-white/70 text-sm text-center mb-6">
        {t(
          'onboarding.language.description',
          'Select the language you want Hebrew content dubbed into'
        )}
      </p>

      <div className="mb-8">
        <GlassSelect
          label={t('onboarding.language.targetLabel', 'Target Language')}
          options={languageOptions}
          value={currentLanguage}
          onChange={onLanguageChange}
          aria-label={t('onboarding.language.targetLabel', 'Target Language')}
        />
      </div>

      <GlassButton
        variant="primary"
        onPress={onNext}
        className="w-full"
        aria-label={t('common.continue', 'Continue')}
      >
        {t('common.continue', 'Continue')}
      </GlassButton>
    </GlassCard>
  );
}
