/**
 * CulturalExplanationSheet - Bottom sheet displaying cultural context
 *
 * Shows Hebrew term, transliteration, explanation, cultural significance,
 * and optional shoresh (root) information for the current scene.
 */

import React from 'react';
import { View, Text, ScrollView, StyleSheet } from 'react-native';
import { useTranslation } from 'react-i18next';
import { useDirection } from '@bayit/shared-hooks';
import { GlassButton } from '@bayit/shared/ui';
import { colors, spacing, borderRadius, fontSize } from '@olorin/design-tokens';
import { NativeIcon } from '@olorin/shared-icons/native';
import { Colors } from '../../../theme/colors';
import { BottomSheet } from '../../BottomSheet';
import { ShoreshHighlight } from './ShoreshHighlight';
import logger from '@/utils/logger';

const log = logger.scope('CulturalExplanationSheet');

export interface CulturalExplanation {
  term: string;
  transliteration: string;
  meaning: string;
  culturalNote: string;
  shoresh?: string;
}

interface CulturalExplanationSheetProps {
  visible: boolean;
  onClose: () => void;
  explanation: CulturalExplanation;
}

export const CulturalExplanationSheet: React.FC<CulturalExplanationSheetProps> = ({
  visible, onClose, explanation,
}) => {
  const { t } = useTranslation();
  const { isRTL, textAlign } = useDirection();
  const handleDismiss = () => { log.info('Cultural explanation dismissed'); onClose(); };

  return (
    <BottomSheet visible={visible} onClose={handleDismiss} showHandle dismissable>
      <ScrollView showsVerticalScrollIndicator={false} style={styles.scrollView}>
        <View
          style={[styles.header, isRTL && styles.headerRTL]}
          accessible accessibilityRole="header"
          accessibilityLabel={`${explanation.term} - ${explanation.transliteration}`}
        >
          <View style={styles.termContainer}>
            <Text style={[styles.hebrewTerm, { textAlign }]}>{explanation.term}</Text>
            <Text style={[styles.transliteration, { textAlign }]}>{explanation.transliteration}</Text>
          </View>
          <View style={styles.iconBadge}>
            <NativeIcon name="bookOpen" size="md" color={Colors.Primary.p400} />
          </View>
        </View>

        <View style={styles.divider} />

        <View style={styles.section} accessible accessibilityRole="text"
          accessibilityLabel={`${t('cultural.meaning')}: ${explanation.meaning}`}>
          <Text style={[styles.sectionLabel, { textAlign }]}>{t('cultural.meaning')}</Text>
          <Text style={[styles.sectionContent, { textAlign }]}>{explanation.meaning}</Text>
        </View>

        <View style={styles.section} accessible accessibilityRole="text"
          accessibilityLabel={`${t('cultural.culturalSignificance')}: ${explanation.culturalNote}`}>
          <Text style={[styles.sectionLabel, { textAlign }]}>{t('cultural.culturalSignificance')}</Text>
          <View style={styles.noteCard}>
            <NativeIcon name="info" size="sm" color={Colors.Primary.p400} />
            <Text style={[styles.noteText, { textAlign }]}>{explanation.culturalNote}</Text>
          </View>
        </View>

        {explanation.shoresh && (
          <View style={styles.section}>
            <Text style={[styles.sectionLabel, { textAlign }]}>{t('cultural.hebrewRoot')}</Text>
            <ShoreshHighlight root={explanation.shoresh} derivedWord={explanation.term} meaning={explanation.meaning} />
          </View>
        )}

        <GlassButton variant="secondary" onPress={handleDismiss} style={styles.dismissButton}
          accessibilityLabel={t('common.close')} accessibilityHint={t('cultural.closeCulturalSheet')}
          accessibilityRole="button">
          <Text style={styles.dismissText}>{t('common.close')}</Text>
        </GlassButton>
      </ScrollView>
    </BottomSheet>
  );
};

const styles = StyleSheet.create({
  scrollView: { maxHeight: 480 },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: spacing.md },
  headerRTL: { flexDirection: 'row-reverse' },
  termContainer: { flex: 1 },
  hebrewTerm: { fontSize: 28, fontWeight: '700', color: colors.text, lineHeight: 36 },
  transliteration: { fontSize: fontSize.md, fontWeight: '500', color: colors.textSecondary, marginTop: spacing.xxs },
  iconBadge: { width: 44, height: 44, borderRadius: borderRadius.full, backgroundColor: Colors.Glass.purpleLight, justifyContent: 'center', alignItems: 'center' },
  divider: { height: 1, backgroundColor: Colors.Glass.border, marginBottom: spacing.md },
  section: { marginBottom: spacing.lg },
  sectionLabel: { fontSize: fontSize.xs, fontWeight: '600', color: Colors.Primary.p400, textTransform: 'uppercase', letterSpacing: 0.8, marginBottom: spacing.xs },
  sectionContent: { fontSize: fontSize.md, color: colors.text, lineHeight: 24 },
  noteCard: { flexDirection: 'row', gap: spacing.sm, padding: spacing.md, backgroundColor: Colors.Glass.whiteSubtle, borderRadius: borderRadius.md, borderLeftWidth: 3, borderLeftColor: Colors.Primary.p500 },
  noteText: { flex: 1, fontSize: fontSize.sm, color: colors.textSecondary, lineHeight: 22 },
  dismissButton: { marginTop: spacing.sm, marginBottom: spacing.md, paddingVertical: spacing.md, minHeight: 48 },
  dismissText: { fontSize: fontSize.md, fontWeight: '600', color: colors.text, textAlign: 'center' },
});
