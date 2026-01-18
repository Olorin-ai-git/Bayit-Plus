import { View, Text, StyleSheet, Pressable } from 'react-native';
import { colors, spacing } from '@bayit/shared/theme';

interface AuditCheckboxProps {
  checked: boolean;
  onPress: () => void;
  label: string;
  helper: string;
}

export const AuditCheckbox = ({ checked, onPress, label, helper }: AuditCheckboxProps) => (
  <View style={styles.checkboxRow}>
    <Pressable
      style={[styles.checkbox, checked && styles.checkboxChecked]}
      onPress={onPress}
    >
      {checked && <View style={styles.checkboxInner} />}
    </Pressable>
    <View style={styles.checkboxLabelContainer}>
      <Text style={styles.checkboxLabel}>{label}</Text>
      <Text style={styles.checkboxHelper}>{helper}</Text>
    </View>
  </View>
);

const styles = StyleSheet.create({
  checkboxRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: spacing.sm,
    marginBottom: spacing.md,
  },
  checkbox: {
    width: 20,
    height: 20,
    borderRadius: 4,
    borderWidth: 2,
    borderColor: colors.primary,
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 2,
  },
  checkboxChecked: {
    backgroundColor: colors.primary,
  },
  checkboxInner: {
    width: 10,
    height: 10,
    backgroundColor: colors.background,
    borderRadius: 2,
  },
  checkboxLabelContainer: {
    flex: 1,
  },
  checkboxLabel: {
    fontSize: 14,
    color: colors.text,
    marginBottom: 2,
  },
  checkboxHelper: {
    fontSize: 11,
    color: colors.textMuted,
    lineHeight: 14,
  },
});
