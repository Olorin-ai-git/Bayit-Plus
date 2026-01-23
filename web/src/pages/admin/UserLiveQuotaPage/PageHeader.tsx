import { View, Text, StyleSheet } from 'react-native';
import { useTranslation } from 'react-i18next';
import { ArrowLeft } from 'lucide-react';
import { GlassButton } from '@bayit/shared/ui';
import { colors, spacing } from '@bayit/shared/theme';

interface PageHeaderProps {
  userId: string;
  isRTL: boolean;
  onBack: () => void;
}

export default function PageHeader({ userId, isRTL, onBack }: PageHeaderProps) {
  const { t } = useTranslation();

  return (
    <View style={[styles.header, isRTL && styles.headerRTL]}>
      <GlassButton
        variant="secondary"
        size="sm"
        onPress={onBack}
        style={styles.backButton}
        accessibilityLabel={t('common.back', 'Back')}
        accessibilityRole="button"
      >
        <ArrowLeft size={16} color={colors.textSecondary} />
        <Text style={styles.backText}>{t('common.back', 'Back')}</Text>
      </GlassButton>
      <Text style={[styles.title, isRTL && styles.textRTL]}>
        {t('admin.liveQuotas.title', 'Live Feature Quota Management')}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
  },
  headerRTL: {
    flexDirection: 'row-reverse',
  },
  backButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
  },
  backText: {
    color: colors.textSecondary,
    fontSize: 14,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: colors.text,
    flex: 1,
  },
  textRTL: {
    textAlign: 'right',
  },
});
