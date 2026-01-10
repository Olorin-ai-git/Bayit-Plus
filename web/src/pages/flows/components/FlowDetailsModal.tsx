/**
 * FlowDetailsModal Component
 * Modal for viewing flow details and actions
 * Replaces sidebar selection functionality
 */

import React, { useState } from 'react';
import { View, Text, StyleSheet, ScrollView } from 'react-native';
import { useTranslation } from 'react-i18next';
import { Play, Edit2, Trash2, SkipForward, Clock, Sparkles, List, X, Calendar, Zap } from 'lucide-react';
import LinearGradient from 'react-native-web-linear-gradient';
import { colors, spacing, borderRadius } from '@bayit/shared/theme';
import { GlassView, GlassModal, GlassButton, GlassBadge } from '@bayit/shared/ui';
import { isTV } from '@bayit/shared/utils/platform';
import { useDirection } from '@/hooks/useDirection';
import type { Flow } from '../types/flows.types';
import { getLocalizedName, getLocalizedDescription, formatTriggerTime } from '../utils/flowHelpers';

// Flow gradient configurations
const FLOW_GRADIENTS: Record<string, string[]> = {
  'טקס בוקר': ['#FF9500', '#FF6B00'],
  'Morning Ritual': ['#FF9500', '#FF6B00'],
  'ליל שבת': ['#5856D6', '#8B5CF6'],
  'Shabbat Evening': ['#5856D6', '#8B5CF6'],
  'שעת שינה': ['#1A1A2E', '#4A4A8A'],
  'Sleep Time': ['#1A1A2E', '#4A4A8A'],
  'זמן ילדים': ['#FF2D55', '#FF6B9D'],
  'Kids Time': ['#FF2D55', '#FF6B9D'],
};

const DEFAULT_GRADIENT = ['#00D9FF', '#0099CC'];

interface FlowDetailsModalProps {
  flow: Flow | null;
  visible: boolean;
  onClose: () => void;
  onStart: () => void;
  onEdit?: () => void;
  onDelete?: () => void;
  onSkip?: () => void;
}

export function FlowDetailsModal({
  flow,
  visible,
  onClose,
  onStart,
  onEdit,
  onDelete,
  onSkip,
}: FlowDetailsModalProps) {
  const { t, i18n } = useTranslation();
  const { isRTL, flexDirection, textAlign } = useDirection();
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  if (!flow) return null;

  const gradient = FLOW_GRADIENTS[flow.name] || FLOW_GRADIENTS[flow.name_en || ''] || DEFAULT_GRADIENT;
  const localizedName = getLocalizedName(flow, i18n.language);
  const localizedDescription = getLocalizedDescription(flow, i18n.language);
  const triggerDisplay = flow.triggers.length > 0
    ? formatTriggerTime(flow.triggers[0], t)
    : t('flows.manual');

  const isCustomFlow = flow.flow_type === 'custom';

  const handleDelete = () => {
    setShowDeleteConfirm(true);
  };

  const confirmDelete = () => {
    setShowDeleteConfirm(false);
    onDelete?.();
    onClose();
  };

  const modalButtons = showDeleteConfirm
    ? [
        {
          text: t('common.cancel'),
          style: 'cancel' as const,
          onPress: () => setShowDeleteConfirm(false),
        },
        {
          text: t('common.delete'),
          style: 'destructive' as const,
          onPress: confirmDelete,
        },
      ]
    : [];

  return (
    <GlassModal
      visible={visible}
      onClose={onClose}
      title=""
      message=""
    >
      <View style={styles.container}>
        {/* Close Button */}
        <GlassButton
          title=""
          icon={<X size={20} color={colors.textMuted} />}
          variant="ghost"
          size="sm"
          onPress={onClose}
          style={[styles.closeBtn, isRTL && styles.closeBtnRTL]}
        />

        {/* Header with Icon */}
        <View style={styles.header}>
          <LinearGradient
            colors={gradient}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={styles.iconContainer}
          >
            <Play size={isTV ? 48 : 40} color="#fff" fill="#fff" />
          </LinearGradient>

          {/* Badges */}
          <View style={[styles.badges, { flexDirection }]}>
            <GlassBadge
              variant={isCustomFlow ? 'primary' : 'default'}
              size="sm"
            >
              {isCustomFlow ? t('flows.customFlow') : t('flows.systemFlow')}
            </GlassBadge>
            {flow.ai_enabled && (
              <GlassBadge variant="warning" size="sm">
                AI
              </GlassBadge>
            )}
          </View>
        </View>

        {/* Title & Description */}
        <Text style={[styles.title, { textAlign }]}>
          {localizedName}
        </Text>
        {localizedDescription && (
          <Text style={[styles.description, { textAlign }]}>
            {localizedDescription}
          </Text>
        )}

        {/* Details Section */}
        <ScrollView style={styles.detailsScroll} showsVerticalScrollIndicator={false}>
          <GlassView style={styles.detailsCard} intensity="low">
            <Text style={[styles.sectionTitle, { textAlign }]}>
              {t('flows.details.title')}
            </Text>

            {/* Schedule */}
            <View style={[styles.detailRow, { flexDirection }]}>
              <View style={styles.detailIcon}>
                <Clock size={18} color={colors.primary} />
              </View>
              <View style={styles.detailContent}>
                <Text style={[styles.detailLabel, isRTL && styles.textRTL]}>
                  {t('flows.details.schedule')}
                </Text>
                <Text style={[styles.detailValue, isRTL && styles.textRTL]}>
                  {triggerDisplay}
                </Text>
              </View>
            </View>

            {/* Days */}
            {flow.triggers[0]?.days && flow.triggers[0].days.length > 0 && (
              <View style={[styles.detailRow, { flexDirection }]}>
                <View style={styles.detailIcon}>
                  <Calendar size={18} color={colors.info} />
                </View>
                <View style={styles.detailContent}>
                  <Text style={[styles.detailLabel, isRTL && styles.textRTL]}>
                    {t('flows.details.days')}
                  </Text>
                  <View style={[styles.daysContainer, { flexDirection }]}>
                    {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map((day, idx) => (
                      <View
                        key={day}
                        style={[
                          styles.dayBadge,
                          flow.triggers[0]?.days?.includes(idx as any) && styles.dayBadgeActive,
                        ]}
                      >
                        <Text
                          style={[
                            styles.dayText,
                            flow.triggers[0]?.days?.includes(idx as any) && styles.dayTextActive,
                          ]}
                        >
                          {day.charAt(0)}
                        </Text>
                      </View>
                    ))}
                  </View>
                </View>
              </View>
            )}

            {/* Content */}
            <View style={[styles.detailRow, { flexDirection }]}>
              <View style={styles.detailIcon}>
                <List size={18} color={colors.secondary} />
              </View>
              <View style={styles.detailContent}>
                <Text style={[styles.detailLabel, isRTL && styles.textRTL]}>
                  {t('flows.details.content')}
                </Text>
                <Text style={[styles.detailValue, isRTL && styles.textRTL]}>
                  {flow.items.length > 0
                    ? `${flow.items.length} ${t('flows.items')}`
                    : t('flows.aiGenerated')}
                </Text>
              </View>
            </View>

            {/* Features */}
            <View style={[styles.detailRow, { flexDirection }]}>
              <View style={styles.detailIcon}>
                <Zap size={18} color={colors.warning} />
              </View>
              <View style={styles.detailContent}>
                <Text style={[styles.detailLabel, isRTL && styles.textRTL]}>
                  {t('flows.details.features')}
                </Text>
                <View style={[styles.featuresContainer, { flexDirection }]}>
                  {flow.ai_enabled && (
                    <View style={styles.featureBadge}>
                      <Sparkles size={12} color={colors.warning} />
                      <Text style={styles.featureText}>AI</Text>
                    </View>
                  )}
                  {flow.ai_brief_enabled && (
                    <View style={styles.featureBadge}>
                      <Sparkles size={12} color={colors.info} />
                      <Text style={styles.featureText}>{t('flows.aiBrief')}</Text>
                    </View>
                  )}
                  {flow.auto_play && (
                    <View style={styles.featureBadge}>
                      <Play size={12} color={colors.primary} />
                      <Text style={styles.featureText}>{t('flows.autoPlay')}</Text>
                    </View>
                  )}
                  {!flow.ai_enabled && !flow.ai_brief_enabled && !flow.auto_play && (
                    <Text style={[styles.detailValue, isRTL && styles.textRTL]}>
                      {t('flows.noFeatures')}
                    </Text>
                  )}
                </View>
              </View>
            </View>
          </GlassView>
        </ScrollView>

        {/* Action Buttons */}
        <View style={styles.actions}>
          {/* Primary: Start Flow */}
          <GlassButton
            title={t('flows.startFlow')}
            icon={<Play size={20} color="#000" />}
            variant="primary"
            size={isTV ? 'lg' : 'md'}
            onPress={onStart}
            fullWidth
            hasTVPreferredFocus
          />

          {/* Secondary Actions Row */}
          <View style={[styles.secondaryActions, { flexDirection }]}>
            {/* Skip Today */}
            {onSkip && (
              <GlassButton
                title={t('flows.hero.skipToday')}
                icon={<SkipForward size={16} color={colors.text} />}
                variant="ghost"
                size="sm"
                onPress={onSkip}
                style={styles.secondaryBtn}
              />
            )}

            {/* Edit (Custom flows only) */}
            {isCustomFlow && onEdit && (
              <GlassButton
                title={t('flows.editFlow')}
                icon={<Edit2 size={16} color={colors.text} />}
                variant="ghost"
                size="sm"
                onPress={onEdit}
                style={styles.secondaryBtn}
              />
            )}

            {/* Delete (Custom flows only) */}
            {isCustomFlow && onDelete && (
              <GlassButton
                title={t('flows.deleteFlow')}
                icon={<Trash2 size={16} color={colors.error} />}
                variant="ghost"
                size="sm"
                onPress={handleDelete}
                textStyle={{ color: colors.error }}
                style={styles.secondaryBtn}
              />
            )}
          </View>
        </View>

        {/* Delete Confirmation */}
        {showDeleteConfirm && (
          <GlassView style={styles.confirmOverlay} intensity="high">
            <Text style={styles.confirmTitle}>
              {t('flows.deleteConfirmTitle')}
            </Text>
            <Text style={styles.confirmMessage}>
              {t('flows.deleteConfirmMessage')}
            </Text>
            <View style={[styles.confirmActions, { flexDirection }]}>
              <GlassButton
                title={t('common.cancel')}
                variant="ghost"
                size="md"
                onPress={() => setShowDeleteConfirm(false)}
              />
              <GlassButton
                title={t('common.delete')}
                variant="danger"
                size="md"
                onPress={confirmDelete}
              />
            </View>
          </GlassView>
        )}
      </View>
    </GlassModal>
  );
}

const styles = StyleSheet.create({
  container: {
    position: 'relative',
    maxHeight: '80vh',
  },
  closeBtn: {
    position: 'absolute',
    top: 0,
    right: 0,
    zIndex: 10,
  },
  closeBtnRTL: {
    right: 'auto' as any,
    left: 0,
  },
  header: {
    alignItems: 'center',
    marginBottom: spacing.lg,
    paddingTop: spacing.md,
  },
  iconContainer: {
    width: isTV ? 100 : 80,
    height: isTV ? 100 : 80,
    borderRadius: isTV ? 25 : 20,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: spacing.md,
  },
  badges: {
    flexDirection: 'row',
    gap: spacing.sm,
  },
  title: {
    fontSize: isTV ? 32 : 24,
    fontWeight: '800',
    color: colors.text,
    marginBottom: spacing.sm,
    textAlign: 'center',
  },
  description: {
    fontSize: isTV ? 18 : 15,
    color: colors.textMuted,
    textAlign: 'center',
    marginBottom: spacing.lg,
    lineHeight: isTV ? 28 : 22,
  },
  detailsScroll: {
    maxHeight: 300,
    marginBottom: spacing.lg,
  },
  detailsCard: {
    padding: spacing.lg,
    borderRadius: borderRadius.lg,
  },
  sectionTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.textMuted,
    textTransform: 'uppercase',
    letterSpacing: 1,
    marginBottom: spacing.md,
  },
  textRTL: {
    textAlign: 'right',
  },
  detailRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: spacing.md,
    gap: spacing.md,
  },
  detailIcon: {
    width: 36,
    height: 36,
    borderRadius: borderRadius.md,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  detailContent: {
    flex: 1,
  },
  detailLabel: {
    fontSize: 12,
    color: colors.textMuted,
    marginBottom: 4,
  },
  detailValue: {
    fontSize: 15,
    color: colors.text,
    fontWeight: '500',
  },
  daysContainer: {
    flexDirection: 'row',
    gap: 6,
    marginTop: 4,
  },
  dayBadge: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  dayBadgeActive: {
    backgroundColor: colors.primary,
  },
  dayText: {
    fontSize: 11,
    fontWeight: '600',
    color: colors.textMuted,
  },
  dayTextActive: {
    color: '#000',
  },
  featuresContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
    marginTop: 4,
  },
  featureBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: spacing.sm,
    paddingVertical: 4,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    borderRadius: borderRadius.full,
  },
  featureText: {
    fontSize: 12,
    fontWeight: '600',
    color: colors.text,
  },
  actions: {
    gap: spacing.md,
  },
  secondaryActions: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: spacing.sm,
    flexWrap: 'wrap',
  },
  secondaryBtn: {
    flex: 1,
    minWidth: 100,
  },
  confirmOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    justifyContent: 'center',
    alignItems: 'center',
    padding: spacing.xl,
    borderRadius: borderRadius.xl,
  },
  confirmTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: colors.text,
    marginBottom: spacing.sm,
    textAlign: 'center',
  },
  confirmMessage: {
    fontSize: 15,
    color: colors.textMuted,
    marginBottom: spacing.lg,
    textAlign: 'center',
  },
  confirmActions: {
    flexDirection: 'row',
    gap: spacing.md,
  },
});

export default FlowDetailsModal;
