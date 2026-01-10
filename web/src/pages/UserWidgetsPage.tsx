import { useState, useEffect, useCallback } from 'react';
import { View, Text, StyleSheet, Pressable, useWindowDimensions, ScrollView } from 'react-native';
import { Trash2, Plus, Grid3x3, X, AlertCircle } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';
import { useDirection } from '@/hooks/useDirection';
import { widgetsService } from '@/services/adminApi';
import { colors, spacing, borderRadius } from '@bayit/shared/theme';
import { GlassCard } from '@bayit/shared/ui';
import WidgetFormModal from '@/components/widgets/WidgetFormModal';
import logger from '@/utils/logger';

interface Widget {
  id: string;
  type: 'personal' | 'system';
  title: string;
  description?: string;
  icon?: string;
  content?: {
    content_type: 'live_channel' | 'iframe';
    live_channel_id?: string;
    iframe_url?: string;
    iframe_title?: string;
  };
  position?: {
    x: number;
    y: number;
    width: number;
    height: number;
    z_index: number;
  };
  is_active: boolean;
  is_muted: boolean;
  is_visible: boolean;
  is_closable: boolean;
  is_draggable: boolean;
  created_at: string;
  updated_at: string;
}

function WidgetCard({ widget, onDelete }: { widget: Widget; onDelete: (id: string) => void }) {
  const [isHovered, setIsHovered] = useState(false);

  const getContentTypeLabel = (contentType?: string): string => {
    switch (contentType) {
      case 'live_channel':
        return 'Live Channel';
      case 'iframe':
        return 'iFrame';
      default:
        return 'Widget';
    }
  };

  const getIcon = (): string => {
    if (widget.icon) return widget.icon;
    if (widget.content?.content_type === 'live_channel') return '📺';
    if (widget.content?.content_type === 'iframe') return '🌐';
    return '🎯';
  };

  return (
    <View
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      style={styles.cardWrapper}
    >
      <GlassCard style={[styles.card, isHovered && styles.cardHovered]}>
        <View style={styles.iconContainer}>
          <Text style={styles.icon}>{getIcon()}</Text>
        </View>

        <View style={styles.content}>
          <Text style={styles.title} numberOfLines={2}>
            {widget.title}
          </Text>
          {widget.description && (
            <Text style={styles.description} numberOfLines={2}>
              {widget.description}
            </Text>
          )}
          <View style={styles.metadata}>
            <Text style={styles.contentType}>
              {getContentTypeLabel(widget.content?.content_type)}
            </Text>
            <Text style={[styles.status, widget.is_active ? styles.statusActive : styles.statusInactive]}>
              {widget.is_active ? '● Active' : '● Inactive'}
            </Text>
          </View>
        </View>

        {/* Delete Button */}
        {isHovered && (
          <Pressable
            onPress={() => onDelete(widget.id)}
            style={styles.deleteButton}
          >
            <Trash2 size={18} color={colors.text} />
          </Pressable>
        )}
      </GlassCard>
    </View>
  );
}


export default function UserWidgetsPage() {
  const { t } = useTranslation();
  const { isRTL, textAlign, flexDirection, justifyContent } = useDirection();
  const navigate = useNavigate();
  const [widgets, setWidgets] = useState<Widget[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showWidgetForm, setShowWidgetForm] = useState(false);
  const { width } = useWindowDimensions();

  const numColumns = width >= 1280 ? 4 : width >= 1024 ? 3 : width >= 768 ? 2 : 1;

  const handleCreateWidget = () => {
    console.log('[UserWidgetsPage] Create button clicked');
    setShowWidgetForm(true);
  };

  const handleSaveWidget = async (formData: any) => {
    try {
      // formData from WidgetFormModal already has the correct structure
      // Just pass it directly without restructuring
      await widgetsService.createPersonalWidget(formData);
      setShowWidgetForm(false);
      setError(null);
      await loadWidgets();
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Failed to save widget';
      logger.error(msg, 'UserWidgetsPage', err);
      setError(msg);
    }
  };

  useEffect(() => {
    loadWidgets();
  }, []);

  const loadWidgets = async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await widgetsService.getMyWidgets('/');
      const response = Array.isArray(data) ? data : data?.items || [];

      // Only show personal widgets (user's own widgets)
      const personal = response.filter((w: Widget) => w.type === 'personal');

      setWidgets(personal);
    } catch (err) {
      logger.error('Failed to load widgets', 'UserWidgetsPage', err);
      setError(t('common.error'));
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id: string) => {
    try {
      await widgetsService.deletePersonalWidget(id);
      setWidgets((prev) => prev.filter((w) => w.id !== id));
    } catch (err) {
      logger.error('Failed to delete widget', 'UserWidgetsPage', err);
      setError(t('common.error'));
    }
  };

  if (loading) {
    return (
      <View style={styles.container}>
        <View style={[styles.header, { flexDirection, justifyContent }]}>
          <View style={styles.headerIcon}>
            <Grid3x3 size={28} color={colors.primary} />
          </View>
          <View>
            <Text style={[styles.pageTitle, { textAlign }]}>{t('nav.widgets')}</Text>
          </View>
        </View>
        <View style={styles.grid}>
          {[...Array(8)].map((_, i) => (
            <View key={i} style={styles.skeletonCard} />
          ))}
        </View>
      </View>
    );
  }

  return (
    <ScrollView style={styles.container} contentContainerStyle={{ flexGrow: 1 }}>
      {/* Header */}
      <View style={[styles.header, { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }]}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.sm }}>
          <View style={styles.headerIcon}>
            <Grid3x3 size={28} color={colors.primary} />
          </View>
          <View>
            <Text style={[styles.pageTitle, { textAlign }]}>{t('nav.widgets')}</Text>
            <Text style={[styles.description, { textAlign }]}>
              {widgets.length} {t('widgets.itemsTotal') || 'total widgets'}
            </Text>
          </View>
        </View>
        <Pressable style={styles.createButton} onPress={handleCreateWidget}>
          <Plus size={20} color={colors.text} />
          <Text style={styles.createButtonText}>{t('common.new') || 'New Widget'}</Text>
        </Pressable>
      </View>

      {/* Error Message */}
      {error && (
        <View style={[styles.errorContainer, { flexDirection: 'row', marginBottom: spacing.lg }]}>
          <AlertCircle size={18} color="#ef4444" />
          <Text style={styles.errorText}>{error}</Text>
          <Pressable onPress={() => setError(null)}>
            <X size={18} color="#ef4444" />
          </Pressable>
        </View>
      )}

      {/* Widget Form Modal */}
      <WidgetFormModal
        visible={showWidgetForm}
        onClose={() => setShowWidgetForm(false)}
        onSave={handleSaveWidget}
        isUserWidget={true}
      />

      {/* Widgets Grid */}
      {widgets.length > 0 && (
        <View style={styles.grid}>
          {widgets.map((widget) => (
            <View key={widget.id} style={{ width: `${100 / numColumns}%`, paddingHorizontal: spacing.xs }}>
              <WidgetCard widget={widget} onDelete={handleDelete} />
            </View>
          ))}
        </View>
      )}

      {/* Empty State */}
      {widgets.length === 0 && (
        <View style={styles.emptyState}>
          <GlassCard style={styles.emptyCard}>
            <Grid3x3 size={64} color="rgba(59, 130, 246, 0.5)" />
            <Text style={styles.emptyTitle}>{t('widgets.empty') || 'No widgets yet'}</Text>
            <Text style={styles.emptyDescription}>
              {t('widgets.emptyHint') || 'Create your first widget to get started'}
            </Text>
          </GlassCard>
        </View>
      )}
    </ScrollView>
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
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    marginBottom: spacing.lg,
  },
  headerIcon: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: 'rgba(59, 130, 246, 0.2)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  pageTitle: {
    fontSize: 32,
    fontWeight: 'bold',
    color: colors.text,
  },
  description: {
    fontSize: 14,
    color: colors.textMuted,
    marginTop: spacing.xs,
  },
  createButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: borderRadius.lg,
    backgroundColor: colors.primary,
  },
  createButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.text,
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  cardWrapper: {
    flex: 1,
  },
  card: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.md,
    marginBottom: spacing.md,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    position: 'relative',
    borderWidth: 0,
  },
  cardHovered: {
    backgroundColor: 'rgba(59, 130, 246, 0.05)',
  },
  iconContainer: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: colors.glass,
    justifyContent: 'center',
    alignItems: 'center',
  },
  icon: {
    fontSize: 28,
  },
  content: {
    flex: 1,
  },
  title: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.text,
  },
  metadata: {
    flexDirection: 'row',
    gap: spacing.sm,
    marginTop: spacing.sm,
  },
  contentType: {
    fontSize: 12,
    color: colors.textMuted,
    backgroundColor: colors.glass,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    borderRadius: borderRadius.sm,
  },
  status: {
    fontSize: 12,
    fontWeight: '500',
  },
  statusActive: {
    color: '#10b981',
  },
  statusInactive: {
    color: '#f59e0b',
  },
  deleteButton: {
    position: 'absolute',
    right: spacing.md,
    top: '50%',
    marginTop: -18,
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: 'rgba(239, 68, 68, 0.9)',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 10,
  },
  errorCard: {
    padding: spacing.md,
    marginBottom: spacing.lg,
    borderRadius: borderRadius.lg,
  },
  errorText: {
    color: '#dc2626',
    fontSize: 14,
  },
  emptyState: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: spacing.xl * 2,
  },
  emptyCard: {
    padding: spacing.xl * 1.5,
    alignItems: 'center',
  },
  emptyTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: colors.text,
    marginTop: spacing.md,
    marginBottom: spacing.sm,
  },
  emptyDescription: {
    fontSize: 14,
    color: colors.textSecondary,
  },
  skeletonCard: {
    width: '25%',
    height: 120,
    backgroundColor: colors.glass,
    borderRadius: borderRadius.lg,
    margin: spacing.xs,
  },
  errorContainer: {
    backgroundColor: 'rgba(239, 68, 68, 0.1)',
    borderRadius: borderRadius.lg,
    padding: spacing.md,
    alignItems: 'center',
    gap: spacing.sm,
  },
});
