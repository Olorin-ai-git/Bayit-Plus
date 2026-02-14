/**
 * BreadcrumbBar - Breadcrumb navigation bar for mobile
 *
 * Shows the current navigation path with tappable segments.
 * Delegates rendering to the shared GlassBreadcrumbs component.
 */
import React, { useCallback } from 'react';
import { View, StyleSheet } from 'react-native';
import { useTranslation } from 'react-i18next';
import { useDirection } from '@bayit/shared-hooks';
import {
  GlassBreadcrumbs,
  BreadcrumbItem,
} from '@olorin/glass-ui/native';
import { colors, spacing } from '@olorin/design-tokens';
import logger from '@/utils/logger';

const moduleLogger = logger.scope('BreadcrumbBar');

interface Breadcrumb {
  label: string;
  route?: string;
}

interface BreadcrumbBarProps {
  breadcrumbs: Breadcrumb[];
  onNavigate: (route: string) => void;
}

export const BreadcrumbBar: React.FC<BreadcrumbBarProps> = ({
  breadcrumbs,
  onNavigate,
}) => {
  const { t } = useTranslation();
  const { isRTL } = useDirection();

  const glassBreadcrumbItems: BreadcrumbItem[] = breadcrumbs.map(
    (crumb, index) => ({
      path: crumb.route || `breadcrumb-${index}`,
      label: crumb.label,
    }),
  );

  const handleNavigate = useCallback(
    (path: string) => {
      const targetCrumb = breadcrumbs.find((c) => c.route === path);
      if (targetCrumb?.route) {
        moduleLogger.debug('Breadcrumb navigation', { route: targetCrumb.route });
        onNavigate(targetCrumb.route);
      }
    },
    [breadcrumbs, onNavigate],
  );

  if (breadcrumbs.length <= 1) return null;

  return (
    <View
      style={styles.container}
      accessibilityLabel={t('navigation.breadcrumbLabel')}
      accessibilityRole="navigation"
      accessibilityHint={t('navigation.breadcrumbHint')}
    >
      <GlassBreadcrumbs
        items={glassBreadcrumbItems}
        onNavigate={handleNavigate}
        isRTL={isRTL}
        style={styles.breadcrumbs}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    backgroundColor: colors.background,
  },
  breadcrumbs: {
    paddingHorizontal: spacing.sm,
  },
});
