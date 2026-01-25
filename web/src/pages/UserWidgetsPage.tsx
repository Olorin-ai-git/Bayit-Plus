import { View, Text, StyleSheet, useWindowDimensions, ScrollView } from 'react-native';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';
import { useDirection } from '@/hooks/useDirection';
import { useWidgetsPage } from '@/hooks/useWidgetsPage';
import { colors, spacing, borderRadius } from '@olorin/design-tokens';
import { GlassCard } from '@bayit/shared/ui';
import WidgetFormModal from '@/components/widgets/WidgetFormModal';
import { SystemWidgetGallery } from '@/components/widgets/SystemWidgetGallery';
import { WidgetsIntroVideo } from '@bayit/shared/widgets/WidgetsIntroVideo';
import { config } from '@bayit/shared-config/appConfig';
import WidgetCard from '@/components/widgets/WidgetCard';
import { IntroSection } from '@/components/widgets/IntroSection';
import WidgetsLoadingState from '@/components/widgets/WidgetsLoadingState';
import WidgetsErrorBanner from '@/components/widgets/WidgetsErrorBanner';
import WidgetsPageHeader from '@/components/widgets/WidgetsPageHeader';

export default function UserWidgetsPage() {
  const { t } = useTranslation();
  const { isRTL, textAlign, flexDirection, justifyContent } = useDirection();
  const navigate = useNavigate();
  const { width } = useWindowDimensions();

  // All state and handlers from custom hook
  const {
    widgets,
    loading,
    error,
    setError,
    showWidgetForm,
    showIntroVideo,
    hasSeenIntro,
    setShowWidgetForm,
    setShowIntroVideo,
    handleDismissIntro,
    isWidgetHidden,
    handleToggleVisibility,
    handleResetPosition,
    handleCreateWidget,
    handleSaveWidget,
    handleDelete,
    loadWidgets,
  } = useWidgetsPage();

  const numColumns = width >= 1280 ? 4 : width >= 1024 ? 3 : width >= 768 ? 2 : 1;

  if (loading) {
    return <WidgetsLoadingState numSkeletons={8} />;
  }

  return (
    <ScrollView style={styles.container} contentContainerStyle={{ flexGrow: 1 }}>
      {/* Header */}
      <WidgetsPageHeader
        widgetCount={widgets.length}
        onCreateWidget={handleCreateWidget}
      />

      {/* Error Message */}
      {error && (
        <WidgetsErrorBanner
          message={error}
          onDismiss={() => setError(null)}
        />
      )}

      {/* Widget Form Modal */}
      <WidgetFormModal
        visible={showWidgetForm}
        onClose={() => setShowWidgetForm(false)}
        onSave={handleSaveWidget}
        isUserWidget={true}
      />

      {/* Widgets Intro Video */}
      <WidgetsIntroVideo
        videoUrl={config.media.widgetsIntroVideo}
        visible={showIntroVideo}
        onComplete={() => setShowIntroVideo(false)}
        onDismiss={handleDismissIntro}
        showDismissButton={true}
      />

      {/* Intro Section */}
      {!hasSeenIntro && (
        <IntroSection
          onWatchVideo={() => setShowIntroVideo(true)}
          onDismiss={handleDismissIntro}
        />
      )}

      {/* System Widgets Gallery */}
      <SystemWidgetGallery onWidgetAdded={loadWidgets} />

      {/* Personal Widgets Section */}
      <View style={styles.sectionHeader}>
        <Text style={[styles.sectionTitle, { textAlign }]}>
          {t('widgets.myWidgets') || 'My Personal Widgets'}
        </Text>
        <Text style={[styles.sectionDescription, { textAlign }]}>
          {t('widgets.myWidgetsHint') || 'Widgets you have created'}
        </Text>
      </View>

      {/* Widgets Grid */}
      {widgets.length > 0 && (
        <View style={styles.grid}>
          {widgets.map((widget) => (
            <View key={widget.id} style={{ width: `${100 / numColumns}%`, paddingHorizontal: spacing.xs }}>
              <WidgetCard
                widget={widget}
                onDelete={handleDelete}
                isHidden={isWidgetHidden(widget.id)}
                onToggleVisibility={handleToggleVisibility}
                onResetPosition={handleResetPosition}
              />
            </View>
          ))}
        </View>
      )}

      {/* Empty State */}
      {widgets.length === 0 && (
        <View style={styles.emptyState}>
          <GlassCard style={styles.emptyCard}>
            <Text style={styles.emptyIcon}>⊞</Text>
            <Text style={styles.emptyTitle}>{t('widgets.emptyPersonal') || 'No personal widgets yet'}</Text>
            <Text style={styles.emptyDescription}>
              {t('widgets.emptyPersonalHint') || 'Create your first personal widget or add system widgets above'}
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
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
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
  emptyIcon: {
    fontSize: 64,
    color: 'rgba(168, 85, 247, 0.5)',
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
  sectionHeader: {
    marginTop: spacing.lg,
    marginBottom: spacing.md,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: colors.text,
    marginBottom: spacing.xs,
  },
  sectionDescription: {
    fontSize: 14,
    color: colors.textMuted,
  },
});
