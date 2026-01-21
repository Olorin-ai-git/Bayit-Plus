/**
 * NotificationsTab component - Notification preferences.
 */

import React from 'react';
import { View, Text, Switch } from 'react-native';
import { useTranslation } from 'react-i18next';
import { GlassView } from '../../components';
import { colors } from '../../theme';
import { styles } from './ProfileScreen.styles';
import { NOTIFICATION_SETTINGS } from './types';

interface NotificationsTabProps {
  notifications: Record<string, boolean>;
  onToggle: (id: string) => void;
}

export const NotificationsTab: React.FC<NotificationsTabProps> = ({
  notifications,
  onToggle,
}) => {
  const { t } = useTranslation();

  return (
    <GlassView style={styles.contentCard}>
      <Text style={styles.sectionTitle}>{t('profile.notificationSettings')}</Text>

      {NOTIFICATION_SETTINGS.map((item) => (
        <View key={item.id} style={styles.notificationItem}>
          <View style={styles.notificationInfo}>
            <Text style={styles.notificationLabel}>{t(item.labelKey)}</Text>
            <Text style={styles.notificationDesc}>{t(item.descKey)}</Text>
          </View>
          <Switch
            value={notifications[item.id]}
            onValueChange={() => onToggle(item.id)}
            trackColor={{ false: colors.backgroundLight, true: colors.primary }}
            thumbColor={colors.text}
          />
        </View>
      ))}
    </GlassView>
  );
};
