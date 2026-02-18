/**
 * AboutSection
 * App information: version, legal links, support.
 */

import { View, Text, StyleSheet, Linking } from 'react-native';
import { useTranslation } from 'react-i18next';
import { useDirection } from '@/hooks/useDirection';
import {
  Info, FileText, Shield, Code, HelpCircle, MessageSquare, ExternalLink,
} from 'lucide-react';
import { colors, spacing, fontSize } from '@olorin/design-tokens';
import { SettingSection } from './shared/SettingSection';
import { SettingRow } from './shared/SettingRow';
import { config as appConfig } from '@/config/appConfig';

export function AboutSection() {
  const { t } = useTranslation();
  const { isRTL } = useDirection();

  const openLink = (path: string) => {
    Linking.openURL(path);
  };

  return (
    <SettingSection title={t('settings.about', 'About')} isRTL={isRTL}>
      <SettingRow
        type="value"
        icon={Info}
        label={t('settings.appVersion', 'App Version')}
        value={appConfig.version}
        isRTL={isRTL}
      />
      <SettingRow
        type="navigation"
        icon={FileText}
        label={t('settings.termsOfService', 'Terms of Service')}
        onPress={() => openLink(appConfig.links.termsOfService)}
        isRTL={isRTL}
      />
      <SettingRow
        type="navigation"
        icon={Shield}
        label={t('settings.privacyPolicy', 'Privacy Policy')}
        onPress={() => openLink(appConfig.links.privacyPolicy)}
        isRTL={isRTL}
      />
      <SettingRow
        type="navigation"
        icon={Code}
        label={t('settings.openSourceLicenses', 'Open Source Licenses')}
        onPress={() => openLink(appConfig.links.openSource)}
        isRTL={isRTL}
      />
      <SettingRow
        type="navigation"
        icon={HelpCircle}
        label={t('settings.helpCenter', 'Help Center')}
        onPress={() => openLink(appConfig.links.helpCenter)}
        isRTL={isRTL}
      />
      <SettingRow
        type="navigation"
        icon={MessageSquare}
        label={t('settings.sendFeedback', 'Send Feedback')}
        onPress={() => openLink(appConfig.links.feedback)}
        isRTL={isRTL}
      />
      <SettingRow
        type="navigation"
        icon={ExternalLink}
        label={t('settings.website', 'Website')}
        onPress={() => openLink(appConfig.links.website)}
        isRTL={isRTL}
      />
    </SettingSection>
  );
}
