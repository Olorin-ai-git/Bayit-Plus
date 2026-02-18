/**
 * NotificationSection
 * Notification settings: push, email digest, quiet hours, per-category toggles.
 */

import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { useDirection } from '@/hooks/useDirection';
import {
  Bell, BellRing, Mail, Moon, Film, Radio, Star, Tag, Coins,
} from 'lucide-react';
import { SettingSection } from './shared/SettingSection';
import { SettingRow } from './shared/SettingRow';
import { SettingSelect } from './shared/SettingSelect';
import { profilesService } from '@/services/api';
import logger from '@/utils/logger';

interface NotificationPrefs {
  push_enabled: boolean;
  new_content: boolean;
  live_tv: boolean;
  recommendations: boolean;
  promotions: boolean;
  credits_alerts: boolean;
  email_digest: boolean;
  email_digest_frequency: string;
  quiet_hours_enabled: boolean;
  quiet_hours_start: string;
  quiet_hours_end: string;
}

const DEFAULTS: NotificationPrefs = {
  push_enabled: true,
  new_content: true,
  live_tv: true,
  recommendations: true,
  promotions: false,
  credits_alerts: true,
  email_digest: false,
  email_digest_frequency: 'weekly',
  quiet_hours_enabled: false,
  quiet_hours_start: '22:00',
  quiet_hours_end: '07:00',
};

export function NotificationSection() {
  const { t } = useTranslation();
  const { isRTL } = useDirection();
  const [prefs, setPrefs] = useState<NotificationPrefs>(DEFAULTS);

  useEffect(() => {
    loadPrefs();
  }, []);

  const loadPrefs = async () => {
    try {
      const data = await profilesService.getNotificationPreferences();
      setPrefs({ ...DEFAULTS, ...data });
    } catch (error) {
      logger.error('Failed to load notification prefs', 'NotificationSection', error);
    }
  };

  const updatePref = async <K extends keyof NotificationPrefs>(
    key: K, value: NotificationPrefs[K],
  ) => {
    const prev = prefs;
    setPrefs((p) => ({ ...p, [key]: value }));
    try {
      await profilesService.updateNotificationPreferences({ ...prefs, [key]: value });
    } catch (error) {
      logger.error('Failed to update notification pref', 'NotificationSection', error);
      setPrefs(prev);
    }
  };

  const frequencyOptions = [
    { label: t('settings.daily', 'Daily'), value: 'daily' },
    { label: t('settings.weekly', 'Weekly'), value: 'weekly' },
    { label: t('settings.monthly', 'Monthly'), value: 'monthly' },
  ];

  return (
    <SettingSection title={t('settings.notifications', 'Notifications')} isRTL={isRTL}>
      <SettingRow
        type="toggle"
        icon={Bell}
        label={t('settings.pushNotifications', 'Push Notifications')}
        description={t('settings.pushNotificationsDesc', 'Enable push notifications')}
        value={prefs.push_enabled}
        onValueChange={(v) => updatePref('push_enabled', v)}
        isRTL={isRTL}
      />
      <SettingRow
        type="toggle"
        icon={Film}
        label={t('settings.newContent', 'New Content')}
        value={prefs.new_content}
        onValueChange={(v) => updatePref('new_content', v)}
        isRTL={isRTL}
        disabled={!prefs.push_enabled}
      />
      <SettingRow
        type="toggle"
        icon={Radio}
        label={t('settings.liveTvAlerts', 'Live TV Alerts')}
        value={prefs.live_tv}
        onValueChange={(v) => updatePref('live_tv', v)}
        isRTL={isRTL}
        disabled={!prefs.push_enabled}
      />
      <SettingRow
        type="toggle"
        icon={Star}
        label={t('settings.recommendations', 'Recommendations')}
        value={prefs.recommendations}
        onValueChange={(v) => updatePref('recommendations', v)}
        isRTL={isRTL}
        disabled={!prefs.push_enabled}
      />
      <SettingRow
        type="toggle"
        icon={Tag}
        label={t('settings.promotions', 'Promotions')}
        value={prefs.promotions}
        onValueChange={(v) => updatePref('promotions', v)}
        isRTL={isRTL}
        disabled={!prefs.push_enabled}
      />
      <SettingRow
        type="toggle"
        icon={Coins}
        label={t('settings.creditsAlerts', 'Credits Alerts')}
        description={t('settings.creditsAlertsDesc', 'Notify when credits are low')}
        value={prefs.credits_alerts}
        onValueChange={(v) => updatePref('credits_alerts', v)}
        isRTL={isRTL}
        disabled={!prefs.push_enabled}
      />
      <SettingRow
        type="toggle"
        icon={Mail}
        label={t('settings.emailDigest', 'Email Digest')}
        value={prefs.email_digest}
        onValueChange={(v) => updatePref('email_digest', v)}
        isRTL={isRTL}
      />
      {prefs.email_digest && (
        <SettingSelect
          label={t('settings.digestFrequency', 'Digest Frequency')}
          options={frequencyOptions}
          value={prefs.email_digest_frequency}
          onValueChange={(v) => updatePref('email_digest_frequency', v)}
          isRTL={isRTL}
        />
      )}
      <SettingRow
        type="toggle"
        icon={Moon}
        label={t('settings.quietHours', 'Quiet Hours')}
        description={t('settings.quietHoursDesc', 'Mute notifications during set hours')}
        value={prefs.quiet_hours_enabled}
        onValueChange={(v) => updatePref('quiet_hours_enabled', v)}
        isRTL={isRTL}
      />
    </SettingSection>
  );
}
