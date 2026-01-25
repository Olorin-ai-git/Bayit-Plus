/**
 * Admin Uploads Page - Main Orchestrator
 * Modular rebuild of the uploads management interface
 * Coordinates queue, manual uploads, monitored folders
 */

import React, { useState } from 'react';
import { View, StyleSheet, ScrollView } from 'react-native';
import { Upload } from 'lucide-react';
import { spacing } from '@olorin/design-tokens';
import { GlassPageHeader, GlassTabs } from '@bayit/shared/ui';
import { GlassDraggableExpander } from '../../../../shared/components/ui/GlassDraggableExpander';
import { useTranslation } from 'react-i18next';

// Hooks
import { useUploadQueue } from './hooks/useUploadQueue';
import { useDryRun } from './hooks/useDryRun';

// Components
import { QueueDashboard } from './components/QueueDashboard';
import { ManualUpload } from './components/ManualUpload';
import { UrlInputPanel } from './components/UrlImport/UrlInputPanel';
import { MonitoredFolders } from './components/MonitoredFolders';
import { DryRunToggle } from './components/DryRun/DryRunToggle';
import { DryRunPreview } from './components/DryRun/DryRunPreview';

type UploadMode = 'browser' | 'url';

const UploadsPage: React.FC = () => {
  const { t } = useTranslation();
  const [uploadMode, setUploadMode] = useState<UploadMode>('browser');

  // Queue management
  const { queueState, connected, loading, refreshQueue } = useUploadQueue();

  // Dry run functionality
  const { dryRunEnabled, results, showPreview, toggleDryRun, reset, setShowPreview } = useDryRun();

  const handleDryRunProceed = () => {
    // User confirmed to proceed with upload after dry run
    setShowPreview(false);
    reset();
    // Note: Actual upload will be triggered by ManualUpload component
  };

  return (
    <View style={styles.container}>
      <ScrollView showsVerticalScrollIndicator={false}>
        {/* Page Header */}
        <GlassPageHeader
          title={t('admin.uploads.title')}
          icon={<Upload size={24} />}
          badge={connected ? undefined : 'Disconnected'}
        />

        {/* Queue Dashboard - Always visible */}
        <View style={styles.section}>
          <QueueDashboard queueState={queueState} onRefresh={refreshQueue} />
        </View>

        {/* Manual Upload Section */}
        <GlassDraggableExpander
          title={t('admin.uploads.manualUpload.title')}
          defaultExpanded={true}
        >
          <View style={styles.section}>
            {/* Dry Run Toggle */}
            <DryRunToggle enabled={dryRunEnabled} onChange={toggleDryRun} />

            {/* Upload Mode Tabs */}
            <GlassTabs
              tabs={[
                { key: 'browser', label: t('admin.uploads.manualUpload.browserUpload') },
                { key: 'url', label: t('admin.uploads.manualUpload.urlUpload') },
              ]}
              activeTab={uploadMode}
              onTabChange={(tab) => setUploadMode(tab as UploadMode)}
            />

            {/* Upload Interface */}
            {uploadMode === 'browser' ? <ManualUpload /> : <UrlInputPanel />}
          </View>
        </GlassDraggableExpander>

        {/* Monitored Folders Section */}
        <GlassDraggableExpander
          title={t('admin.uploads.monitoredFolders.title')}
          defaultExpanded={false}
        >
          <View style={styles.section}>
            <MonitoredFolders />
          </View>
        </GlassDraggableExpander>

        {/* Dry Run Preview Modal */}
        <DryRunPreview
          visible={showPreview}
          results={results}
          onProceed={handleDryRunProceed}
          onCancel={() => setShowPreview(false)}
        />
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  section: {
    padding: spacing.lg,
    gap: spacing.lg,
  },
});

export default UploadsPage;
