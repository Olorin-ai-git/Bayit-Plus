/**
 * PageLoading Component
 * Consistent loading state for all pages
 */

import { View, Text, StyleSheet } from 'react-native';
import { useTranslation } from 'react-i18next';
import { colors, spacing, fontSize } from '@olorin/design-tokens';
import { GlassPageHeader, GlassLoadingSpinner } from '@bayit/shared/ui';

interface PageLoadingProps {
  title?: string;
  pageType?: 'live' | 'vod' | 'radio' | 'podcasts' | 'search' | 'profile' | 'settings' | 'default';
  message?: string;
  showHeader?: boolean;
  isRTL?: boolean;
  icon?: React.ReactNode;
}

export default function PageLoading({
  title,
  pageType = 'default',
  message,
  showHeader = true,
  isRTL = false,
  icon,
}: PageLoadingProps) {
  const { t } = useTranslation();

  const loadingMessage = message || t('common.loading', 'Loading...');

  return (
    <View style={styles.container}>
      {showHeader && title && (
        <GlassPageHeader
          title={title}
          pageType={pageType}
          isRTL={isRTL}
          icon={icon}
        />
      )}

      <View style={styles.loadingContainer}>
        <GlassLoadingSpinner size={64} />
        <Text style={styles.loadingText}>{loadingMessage}</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.lg,
    maxWidth: 1400,
    marginHorizontal: 'auto',
    width: '100%',
  },
  loadingContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 96,
  },
  loadingText: {
    fontSize: fontSize.lg,
    color: colors.text,
    fontWeight: '500',
    marginTop: spacing.lg,
  },
});
