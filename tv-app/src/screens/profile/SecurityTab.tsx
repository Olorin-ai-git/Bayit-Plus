/**
 * SecurityTab component - Security settings and device management.
 */

import React from 'react';
import { View, Text, TouchableOpacity } from 'react-native';
import { useTranslation } from 'react-i18next';
import { GlassView } from '../../components';
import { styles } from './ProfileScreen.styles';

export const SecurityTab: React.FC = () => {
  const { t } = useTranslation();

  const securityItems = [
    { key: 'changePassword', label: t('profile.changePassword'), desc: t('profile.updatePassword') },
    { key: 'connectedDevices', label: t('profile.connectedDevices'), desc: t('profile.manageDevices') },
    { key: 'twoFactorAuth', label: t('profile.twoFactorAuth'), desc: t('profile.addExtraSecurity') },
  ];

  return (
    <GlassView style={styles.contentCard}>
      <Text style={styles.sectionTitle}>{t('profile.security')}</Text>

      {securityItems.map((item) => (
        <TouchableOpacity key={item.key} style={styles.securityItem}>
          <View style={styles.securityInfo}>
            <Text style={styles.securityLabel}>{item.label}</Text>
            <Text style={styles.securityDesc}>{item.desc}</Text>
          </View>
          <Text style={styles.chevron}>◀</Text>
        </TouchableOpacity>
      ))}
    </GlassView>
  );
};
