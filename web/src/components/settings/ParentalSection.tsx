/**
 * ParentalSection
 * Parental controls: PIN, content rating, block explicit, restrict AI/purchases, time limits.
 */

import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { useDirection } from '@/hooks/useDirection';
import { useNavigate } from 'react-router-dom';
import {
  ShieldAlert, Lock, Film, ShoppingCart, Brain, Clock, ChevronRight,
} from 'lucide-react';
import { SettingSection } from './shared/SettingSection';
import { SettingRow } from './shared/SettingRow';
import { SettingSelect } from './shared/SettingSelect';
import { SettingSlider } from './shared/SettingSlider';
import logger from '@/utils/logger';

interface ParentalPrefs {
  pin_enabled: boolean;
  max_content_rating: string;
  block_explicit: boolean;
  restrict_purchases: boolean;
  restrict_ai_features: boolean;
  daily_time_limit_minutes: number;
}

const DEFAULTS: ParentalPrefs = {
  pin_enabled: false,
  max_content_rating: 'PG-13',
  block_explicit: false,
  restrict_purchases: false,
  restrict_ai_features: false,
  daily_time_limit_minutes: 0,
};

export function ParentalSection() {
  const { t } = useTranslation();
  const { isRTL } = useDirection();
  const navigate = useNavigate();
  const [prefs, setPrefs] = useState<ParentalPrefs>(DEFAULTS);

  const ratingOptions = [
    { label: 'G', value: 'G' },
    { label: 'PG', value: 'PG' },
    { label: 'PG-13', value: 'PG-13' },
    { label: 'R', value: 'R' },
  ];

  const updatePref = <K extends keyof ParentalPrefs>(key: K, value: ParentalPrefs[K]) => {
    setPrefs((p) => ({ ...p, [key]: value }));
  };

  return (
    <SettingSection title={t('settings.parentalControls', 'Parental Controls')} isRTL={isRTL}>
      <SettingRow
        type="toggle"
        icon={Lock}
        label={t('settings.parentalPin', 'Parental PIN')}
        description={t('settings.parentalPinDesc', 'Require PIN for restricted content')}
        value={prefs.pin_enabled}
        onValueChange={(v) => updatePref('pin_enabled', v)}
        isRTL={isRTL}
      />
      <SettingSelect
        icon={Film}
        label={t('settings.maxContentRating', 'Max Content Rating')}
        options={ratingOptions}
        value={prefs.max_content_rating}
        onValueChange={(v) => updatePref('max_content_rating', v)}
        isRTL={isRTL}
      />
      <SettingRow
        type="toggle"
        icon={ShieldAlert}
        label={t('settings.blockExplicit', 'Block Explicit Content')}
        value={prefs.block_explicit}
        onValueChange={(v) => updatePref('block_explicit', v)}
        isRTL={isRTL}
      />
      <SettingRow
        type="toggle"
        icon={ShoppingCart}
        label={t('settings.restrictPurchases', 'Restrict Purchases')}
        value={prefs.restrict_purchases}
        onValueChange={(v) => updatePref('restrict_purchases', v)}
        isRTL={isRTL}
      />
      <SettingRow
        type="toggle"
        icon={Brain}
        label={t('settings.restrictAI', 'Restrict AI Features')}
        value={prefs.restrict_ai_features}
        onValueChange={(v) => updatePref('restrict_ai_features', v)}
        isRTL={isRTL}
      />
      {prefs.daily_time_limit_minutes > 0 || prefs.pin_enabled ? (
        <SettingSlider
          icon={Clock}
          label={t('settings.dailyTimeLimit', 'Daily Time Limit')}
          description={t('settings.dailyTimeLimitDesc', 'Maximum viewing time per day')}
          min={0}
          max={480}
          step={15}
          value={prefs.daily_time_limit_minutes}
          onValueChange={(v) => updatePref('daily_time_limit_minutes', v)}
          formatValue={(v) => v === 0
            ? t('settings.unlimited', 'Unlimited')
            : `${Math.floor(v / 60)}h ${v % 60}m`}
          isRTL={isRTL}
        />
      ) : null}
      <SettingRow
        type="navigation"
        label={t('settings.familyControls', 'Family Controls')}
        description={t('settings.familyControlsDesc', 'Advanced family settings')}
        onPress={() => navigate('/settings/family-controls')}
        isRTL={isRTL}
      />
    </SettingSection>
  );
}
