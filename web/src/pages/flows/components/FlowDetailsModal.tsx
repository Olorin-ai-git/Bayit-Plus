/**
 * FlowDetailsModal Component
 * Modal for viewing flow details and actions
 * Replaces sidebar selection functionality
 */

import React, { useState } from 'react';
import { View, Text, ScrollView } from 'react-native';
import { useTranslation } from 'react-i18next';
import { Play, Edit2, Trash2, SkipForward, Clock, Sparkles, List, X, Calendar, Zap } from 'lucide-react';
import LinearGradient from 'react-native-web-linear-gradient';
import { colors, spacing, borderRadius } from '@bayit/shared/theme';
import { GlassView, GlassModal, GlassButton, GlassBadge } from '@bayit/shared/ui';
import { isTV } from '@bayit/shared-utils/platform';
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

const DEFAULT_GRADIENT = ['#a855f7', '#7c3aed'];

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
      <View className="relative max-h-[80vh]">
        {/* Close Button */}
        <GlassButton
          title=""
          icon={<X size={20} color={colors.textMuted} />}
          variant="ghost"
          size="sm"
          onPress={onClose}
          style={isRTL ? { position: 'absolute', top: 0, left: 0, zIndex: 10 } : { position: 'absolute', top: 0, right: 0, zIndex: 10 }}
        />

        {/* Header with Icon */}
        <View className="items-center mb-4 pt-4">
          <LinearGradient
            colors={gradient}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={{
              width: isTV ? 100 : 80,
              height: isTV ? 100 : 80,
              borderRadius: isTV ? 25 : 20,
              justifyContent: 'center',
              alignItems: 'center',
              marginBottom: spacing.md,
            }}
          >
            <Play size={isTV ? 48 : 40} color="#fff" fill="#fff" />
          </LinearGradient>

          {/* Badges */}
          <View className={`flex ${flexDirection} gap-2`}>
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
        <Text className={`${isTV ? 'text-[32px]' : 'text-2xl'} font-extrabold text-white mb-2 text-center`} style={{ textAlign }}>
          {localizedName}
        </Text>
        {localizedDescription && (
          <Text className={`${isTV ? 'text-lg' : 'text-[15px]'} text-[${colors.textMuted}] text-center mb-4 ${isTV ? 'leading-7' : 'leading-[22px]'}`} style={{ textAlign }}>
            {localizedDescription}
          </Text>
        )}

        {/* Details Section */}
        <ScrollView className="max-h-[300px] mb-4" showsVerticalScrollIndicator={false}>
          <GlassView className="p-4 rounded-lg" intensity="low">
            <Text className="text-sm font-semibold text-[${colors.textMuted}] uppercase tracking-wider mb-4" style={{ textAlign }}>
              {t('flows.details.title')}
            </Text>

            {/* Schedule */}
            <View className={`flex ${flexDirection} items-start mb-4 gap-4`}>
              <View className="w-9 h-9 rounded-lg bg-white/10 justify-center items-center">
                <Clock size={18} color={colors.primary} />
              </View>
              <View className="flex-1">
                <Text className={`text-xs text-[${colors.textMuted}] mb-1 ${isRTL ? 'text-right' : ''}`}>
                  {t('flows.details.schedule')}
                </Text>
                <Text className={`text-[15px] text-white font-medium ${isRTL ? 'text-right' : ''}`}>
                  {triggerDisplay}
                </Text>
              </View>
            </View>

            {/* Days */}
            {flow.triggers[0]?.days && flow.triggers[0].days.length > 0 && (
              <View className={`flex ${flexDirection} items-start mb-4 gap-4`}>
                <View className="w-9 h-9 rounded-lg bg-white/10 justify-center items-center">
                  <Calendar size={18} color={colors.info} />
                </View>
                <View className="flex-1">
                  <Text className={`text-xs text-[${colors.textMuted}] mb-1 ${isRTL ? 'text-right' : ''}`}>
                    {t('flows.details.days')}
                  </Text>
                  <View className={`flex ${flexDirection} gap-1.5 mt-1`}>
                    {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map((day, idx) => (
                      <View
                        key={day}
                        className={`w-7 h-7 rounded-full ${flow.triggers[0]?.days?.includes(idx as any) ? `bg-[${colors.primary}]` : 'bg-white/10'} justify-center items-center`}
                      >
                        <Text className={`text-[11px] font-semibold ${flow.triggers[0]?.days?.includes(idx as any) ? 'text-black' : `text-[${colors.textMuted}]`}`}>
                          {day.charAt(0)}
                        </Text>
                      </View>
                    ))}
                  </View>
                </View>
              </View>
            )}

            {/* Content */}
            <View className={`flex ${flexDirection} items-start mb-4 gap-4`}>
              <View className="w-9 h-9 rounded-lg bg-white/10 justify-center items-center">
                <List size={18} color={colors.secondary} />
              </View>
              <View className="flex-1">
                <Text className={`text-xs text-[${colors.textMuted}] mb-1 ${isRTL ? 'text-right' : ''}`}>
                  {t('flows.details.content')}
                </Text>
                <Text className={`text-[15px] text-white font-medium ${isRTL ? 'text-right' : ''}`}>
                  {flow.items.length > 0
                    ? `${flow.items.length} ${t('flows.items')}`
                    : t('flows.aiGenerated')}
                </Text>
              </View>
            </View>

            {/* Features */}
            <View className={`flex ${flexDirection} items-start mb-4 gap-4`}>
              <View className="w-9 h-9 rounded-lg bg-white/10 justify-center items-center">
                <Zap size={18} color={colors.warning} />
              </View>
              <View className="flex-1">
                <Text className={`text-xs text-[${colors.textMuted}] mb-1 ${isRTL ? 'text-right' : ''}`}>
                  {t('flows.details.features')}
                </Text>
                <View className={`flex ${flexDirection} flex-wrap gap-2 mt-1`}>
                  {flow.ai_enabled && (
                    <View className="flex flex-row items-center gap-1 px-2 py-1 bg-white/10 rounded-full">
                      <Sparkles size={12} color={colors.warning} />
                      <Text className="text-xs font-semibold text-white">AI</Text>
                    </View>
                  )}
                  {flow.ai_brief_enabled && (
                    <View className="flex flex-row items-center gap-1 px-2 py-1 bg-white/10 rounded-full">
                      <Sparkles size={12} color={colors.info} />
                      <Text className="text-xs font-semibold text-white">{t('flows.aiBrief')}</Text>
                    </View>
                  )}
                  {flow.auto_play && (
                    <View className="flex flex-row items-center gap-1 px-2 py-1 bg-white/10 rounded-full">
                      <Play size={12} color={colors.primary} />
                      <Text className="text-xs font-semibold text-white">{t('flows.autoPlay')}</Text>
                    </View>
                  )}
                  {!flow.ai_enabled && !flow.ai_brief_enabled && !flow.auto_play && (
                    <Text className={`text-[15px] text-white font-medium ${isRTL ? 'text-right' : ''}`}>
                      {t('flows.noFeatures')}
                    </Text>
                  )}
                </View>
              </View>
            </View>
          </GlassView>
        </ScrollView>

        {/* Action Buttons */}
        <View className="gap-4">
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
          <View className={`flex ${flexDirection} justify-center gap-2 flex-wrap`}>
            {/* Skip Today */}
            {onSkip && (
              <GlassButton
                title={t('flows.hero.skipToday')}
                icon={<SkipForward size={16} color={colors.text} />}
                variant="ghost"
                size="sm"
                onPress={onSkip}
                style={{ flex: 1, minWidth: 100 }}
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
                style={{ flex: 1, minWidth: 100 }}
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
                style={{ flex: 1, minWidth: 100 }}
              />
            )}
          </View>
        </View>

        {/* Delete Confirmation */}
        {showDeleteConfirm && (
          <GlassView className="absolute inset-0 justify-center items-center p-6 rounded-2xl" intensity="high">
            <Text className="text-xl font-bold text-white mb-2 text-center">
              {t('flows.deleteConfirmTitle')}
            </Text>
            <Text className="text-[15px] text-[${colors.textMuted}] mb-4 text-center">
              {t('flows.deleteConfirmMessage')}
            </Text>
            <View className={`flex ${flexDirection} gap-4`}>
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

export default FlowDetailsModal;
