/**
 * JerusalemRowMobile
 *
 * Horizontal content row for Jerusalem-related content.
 * Reuses shared culture row pattern with Jerusalem theming.
 */

import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
} from 'react-native';
import { useTranslation } from 'react-i18next';
import { colors, spacing, borderRadius, fontSize } from '@olorin/design-tokens';
import { NativeIcon } from '@olorin/shared-icons/native';
import { useDirection } from '@bayit/shared-hooks';
import { CultureCard } from './CultureCard';

const JERUSALEM_ACCENT = '#C9A84C';

interface CultureItem {
  id: string;
  title: string;
  image?: string;
  category: string;
  description?: string;
}

interface JerusalemRowMobileProps {
  items: CultureItem[];
  onItemPress: (item: CultureItem) => void;
}

export const JerusalemRowMobile: React.FC<JerusalemRowMobileProps> = ({
  items,
  onItemPress,
}) => {
  const { t } = useTranslation();
  const { isRTL } = useDirection();

  if (items.length === 0) {
    return null;
  }

  return (
    <View
      style={styles.container}
      accessibilityLabel={t('culture.jerusalemSection')}
      accessibilityRole="list"
    >
      <View style={[styles.header, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}>
        <NativeIcon name="star" size="md" color={JERUSALEM_ACCENT} />
        <Text style={[styles.title, { textAlign: isRTL ? 'right' : 'left' }]}>
          {t('culture.jerusalem')}
        </Text>
      </View>

      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={[
          styles.scrollContent,
          { flexDirection: isRTL ? 'row-reverse' : 'row' },
        ]}
        accessibilityRole="scrollbar"
        accessibilityLabel={t('culture.jerusalemContentScroll')}
        accessibilityHint={t('culture.swipeToSeeMore')}
      >
        {items.map((item) => (
          <CultureCard
            key={item.id}
            item={item}
            onPress={() => onItemPress(item)}
          />
        ))}
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    marginTop: spacing.lg,
    paddingVertical: spacing.sm,
    borderRadius: borderRadius.lg,
    marginHorizontal: spacing.md,
    backgroundColor: 'rgba(201, 168, 76, 0.06)',
  },
  header: {
    alignItems: 'center',
    gap: spacing.sm,
    paddingHorizontal: spacing.md,
    paddingBottom: spacing.sm,
  },
  title: {
    fontSize: fontSize.lg,
    fontWeight: '700',
    color: JERUSALEM_ACCENT,
  },
  scrollContent: {
    paddingHorizontal: spacing.md,
    gap: spacing.md,
    paddingBottom: spacing.sm,
  },
});

export default JerusalemRowMobile;
