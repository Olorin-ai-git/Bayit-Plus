/**
 * ProfileTab component - Personal information display and edit.
 */

import React from 'react';
import { View, Text } from 'react-native';
import { useTranslation } from 'react-i18next';
import { GlassView, GlassButton } from '../../components';
import { styles } from './ProfileScreen.styles';

interface ProfileTabProps {
  user: {
    name?: string;
    email?: string;
  } | null;
}

export const ProfileTab: React.FC<ProfileTabProps> = ({ user }) => {
  const { t } = useTranslation();

  return (
    <GlassView style={styles.contentCard}>
      <Text style={styles.sectionTitle}>{t('profile.profileDetails')}</Text>

      <View style={styles.fieldGroup}>
        <Text style={styles.fieldLabel}>{t('profile.name')}</Text>
        <View style={styles.fieldValue}>
          <Text style={styles.fieldValueText}>{user?.name || t('profile.notSet')}</Text>
        </View>
      </View>

      <View style={styles.fieldGroup}>
        <Text style={styles.fieldLabel}>{t('profile.email')}</Text>
        <View style={styles.fieldValue}>
          <Text style={[styles.fieldValueText, styles.ltrText]}>{user?.email}</Text>
        </View>
      </View>

      <GlassButton
        title={t('profile.editProfile')}
        onPress={() => {}}
        variant="primary"
        style={styles.editButton}
      />
    </GlassView>
  );
};
