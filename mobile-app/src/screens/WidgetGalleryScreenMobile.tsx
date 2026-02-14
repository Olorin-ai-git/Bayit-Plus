/**
 * WidgetGalleryScreenMobile - Widget gallery with available system widgets
 *
 * Grid layout of widget cards, create custom widget action,
 * and management of installed widgets.
 */
import React, { useEffect, useState, useCallback } from 'react';
import {
  View,
  Text,
  ScrollView,
  SafeAreaView,
  StyleSheet,
} from 'react-native';
import { useTranslation } from 'react-i18next';
import { useNavigation } from '@react-navigation/native';
import { useDirection } from '@bayit/shared-hooks';
import { GlassButton } from '@olorin/glass-ui/native';
import { GlassLoadingSpinner } from '@bayit/shared/ui';
import { widgetService } from '@bayit/shared-services/api';
import { colors, spacing, fontSize } from '@olorin/design-tokens';
import { SystemWidgetGallery } from '../components/widgets/SystemWidgetGallery';
import { CreateWidget } from '../components/widgets/CreateWidget';
import logger from '@/utils/logger';

const moduleLogger = logger.scope('WidgetGalleryScreenMobile');

interface WidgetData {
  id: string;
  name: string;
  description: string;
  previewUrl: string;
  type: string;
}

export const WidgetGalleryScreenMobile: React.FC = () => {
  const { t } = useTranslation();
  const navigation = useNavigation<any>();
  const { textAlign } = useDirection();

  const [widgets, setWidgets] = useState<WidgetData[]>([]);
  const [installedIds, setInstalledIds] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreate, setShowCreate] = useState(false);

  const loadWidgets = useCallback(async () => {
    setLoading(true);
    try {
      const [available, installed] = await Promise.all([
        widgetService.getAvailableWidgets(),
        widgetService.getInstalledWidgets(),
      ]);
      setWidgets(available?.widgets || available?.data || []);
      const ids: string[] = (installed?.widgets || installed?.data || []).map(
        (w: WidgetData) => w.id,
      );
      setInstalledIds(ids);
    } catch (err) {
      moduleLogger.error('Failed to load widgets', { error: err });
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadWidgets();
  }, [loadWidgets]);

  const handleAdd = useCallback(
    async (widgetId: string) => {
      try {
        await widgetService.installWidget(widgetId);
        setInstalledIds((prev) => [...prev, widgetId]);
        moduleLogger.info('Widget installed', { widgetId });
      } catch (err) {
        moduleLogger.error('Failed to install widget', { widgetId, error: err });
      }
    },
    [],
  );

  const handleRemove = useCallback(
    async (widgetId: string) => {
      try {
        await widgetService.uninstallWidget(widgetId);
        setInstalledIds((prev) => prev.filter((id) => id !== widgetId));
        moduleLogger.info('Widget removed', { widgetId });
      } catch (err) {
        moduleLogger.error('Failed to remove widget', { widgetId, error: err });
      }
    },
    [],
  );

  const handleCreateSave = useCallback(
    async (config: { name: string; type: string; dataSource: string; appearance: string }) => {
      try {
        await widgetService.createCustomWidget(config);
        setShowCreate(false);
        await loadWidgets();
        moduleLogger.info('Custom widget created', { name: config.name });
      } catch (err) {
        moduleLogger.error('Failed to create widget', { error: err });
      }
    },
    [loadWidgets],
  );

  if (showCreate) {
    return (
      <SafeAreaView style={styles.container}>
        <CreateWidget onSave={handleCreateSave} onCancel={() => setShowCreate(false)} />
      </SafeAreaView>
    );
  }

  if (loading) {
    return (
      <SafeAreaView style={styles.loadingContainer}>
        <GlassLoadingSpinner size="large" />
        <Text style={styles.loadingText}>{t('common.loading')}</Text>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.header}>
          <Text style={[styles.title, { textAlign }]}>{t('widgets.gallery.title')}</Text>
          <Text style={[styles.subtitle, { textAlign }]}>
            {t('widgets.gallery.subtitle')}
          </Text>
        </View>

        <GlassButton
          variant="primary"
          onPress={() => setShowCreate(true)}
          style={styles.createButton}
          accessibilityLabel={t('widgets.create.buttonLabel')}
          accessibilityHint={t('widgets.create.buttonHint')}
          accessibilityRole="button"
        >
          {t('widgets.create.button')}
        </GlassButton>

        <SystemWidgetGallery
          widgets={widgets}
          installedWidgetIds={installedIds}
          onAdd={handleAdd}
          onRemove={handleRemove}
        />
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  loadingContainer: {
    flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: colors.background,
  },
  loadingText: { color: colors.textMuted, fontSize: fontSize.md, marginTop: spacing.md },
  scrollContent: { paddingBottom: spacing.xxl },
  header: { paddingHorizontal: spacing.lg, paddingTop: spacing.lg, marginBottom: spacing.md },
  title: { fontSize: fontSize.xxl, fontWeight: '700', color: colors.text, marginBottom: spacing.xs },
  subtitle: { fontSize: fontSize.sm, color: colors.textSecondary },
  createButton: { marginHorizontal: spacing.lg, marginBottom: spacing.lg },
});

export default WidgetGalleryScreenMobile;
