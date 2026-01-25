import { View, Text, StyleSheet } from 'react-native';
import { useTranslation } from 'react-i18next';
import { sanitizeI18n } from '@/utils/security/sanitizeI18n';
import { colors, spacing } from '@olorin/design-tokens';

interface PlanHeaderProps {
  title?: string;
  subtitle?: string;
}

export function PlanHeader({ title, subtitle }: PlanHeaderProps) {
  const { t } = useTranslation();

  const headerTitle = title || t('subscribe.title');
  const headerSubtitle = subtitle || t('subscribe.subtitle');

  // Sanitize i18n strings for security
  const sanitizedTitle = sanitizeI18n(headerTitle);
  const sanitizedSubtitle = sanitizeI18n(headerSubtitle);

  return (
    <View style={styles.header}>
      <Text style={styles.title}>{sanitizedTitle}</Text>
      <Text style={styles.subtitle}>{sanitizedSubtitle}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  header: {
    alignItems: 'center',
    marginBottom: spacing.xl,
    zIndex: 10,
  },
  title: {
    fontSize: 36,
    fontWeight: 'bold',
    textAlign: 'center',
    marginBottom: spacing.md,
    color: colors.text,
  },
  subtitle: {
    fontSize: 18,
    textAlign: 'center',
    maxWidth: 600,
    color: colors.textMuted,
  },
});
