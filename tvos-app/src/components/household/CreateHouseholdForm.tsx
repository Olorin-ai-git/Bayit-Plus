/**
 * CreateHouseholdForm - Household creation form for tvOS
 */

import React, { useState } from 'react';
import { View, Text, TextInput } from 'react-native';
import { GlassView, GlassButton } from '@bayit/glass';
import { useTranslation } from 'react-i18next';
import { colors } from '@olorin/design-tokens';
import { styles } from '../../screens/styles/HouseholdScreen.styles';

interface CreateHouseholdFormProps {
  loading: boolean;
  onCreateHousehold: (name: string) => Promise<void>;
}

export function CreateHouseholdForm({ loading, onCreateHousehold }: CreateHouseholdFormProps) {
  const { t } = useTranslation();
  const [householdName, setHouseholdName] = useState('');
  const [showForm, setShowForm] = useState(false);

  const handleCreate = async () => {
    if (!householdName.trim()) return;
    try {
      await onCreateHousehold(householdName.trim());
      setHouseholdName('');
      setShowForm(false);
    } catch (_err) {
      // Error handled by store
    }
  };

  return (
    <GlassView style={styles.section}>
      <Text style={styles.sectionHeader}>{t('household.createHousehold')}</Text>
      <Text style={styles.description}>{t('household.createDescription')}</Text>

      {!showForm ? (
        <GlassButton onPress={() => setShowForm(true)} variant="primary" hasTVPreferredFocus>
          {t('household.createButton')}
        </GlassButton>
      ) : (
        <View style={styles.formContainer}>
          <Text style={styles.label}>{t('household.householdName')}</Text>
          <TextInput
            value={householdName}
            onChangeText={setHouseholdName}
            placeholder={t('household.namePlaceholder')}
            placeholderTextColor={colors.textMuted}
            style={styles.input}
          />
          <View style={styles.buttonRow}>
            <GlassButton
              onPress={handleCreate}
              variant="primary"
              disabled={loading}
              style={styles.button}
              hasTVPreferredFocus
            >
              {loading ? t('common.creating') : t('household.create')}
            </GlassButton>
            <GlassButton
              onPress={() => { setShowForm(false); setHouseholdName(''); }}
              variant="secondary"
              style={styles.button}
            >
              {t('common.cancel')}
            </GlassButton>
          </View>
        </View>
      )}
    </GlassView>
  );
}
