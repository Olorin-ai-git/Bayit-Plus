/**
 * TelAvivRowMobile
 *
 * Horizontal content row for Tel Aviv-related content.
 * Modern beach-inspired theming with horizontal card scrolling.
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

const TEL_AVIV_ACCENT = '#4FC3F7';

interface CultureItem {
  id: string;
  title: string;
  image?: string;
  category: string;
  description?: string;
}

interface TelAvivRowMobileProps {
  items: CultureItem[];
  onItemPress: (item: CultureItem) => void;
}

export const TelAvivRowMobile: React.FC<TelAvivRowMobileProps> = ({
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
      accessibilityLabel={t('culture.telAvivSection')}
      accessibilityRole="list"
    >
      <View style={[styles.header, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}>
        <NativeIcon name="sun" size="md" color={TEL_AVIV_ACCENT} />
        <Text style={[styles.title, { textAlign: isRTL ? 'right' : 'left' }]}>
          {t('culture.telAviv')}
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
        accessibilityLabel={t('culture.telAvivContentScroll')}
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
    backgroundColor: 'rgba(79, 195, 247, 0.06)',
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
    color: TEL_AVIV_ACCENT,
  },
  scrollContent: {
    paddingHorizontal: spacing.md,
    gap: spacing.md,
    paddingBottom: spacing.sm,
  },
});

export default TelAvivRowMobile;
