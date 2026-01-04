/**
 * DetectorStudioPage Component - Canvas page for tuning detector parameters
 * Uses Olorin glassmorphic styling with dark/neon theme
 */

import React, { useState, useRef } from 'react';
import { useParams, useNavigate, useSearchParams } from 'react-router-dom';
import { AnalyticsHeader } from '../components/common/AnalyticsHeader';
import { DetectorForm } from '../components/anomaly/DetectorForm';
import { DetectorPreview } from '../components/anomaly/DetectorPreview';
import { DetectorsTable } from '../components/anomaly/DetectorsTable';
import { SkeletonLoader } from '../components/common/SkeletonLoader';
import { EmptyState } from '../components/common/EmptyState';
import { ErrorBoundary } from '../components/common/ErrorBoundary';
import { useDetectors } from '../hooks/useDetectors';
import { useToast } from '../hooks/useToast';
import type { Detector } from '../types/anomaly';

export const DetectorStudioPage: React.FC = () => {
  const { id } = useParams<{ id?: string }>();
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const { detectors, loading, error, getDetector, createDetector, updateDetector } = useDetectors();
  const [detector, setDetector] = useState<Detector | null>(null);
  const [k, setK] = useState(3.5);
  const [persistence, setPersistence] = useState(2);
  const [saving, setSaving] = useState(false);
  const [shouldAutoRun, setShouldAutoRun] = useState(false);
  const runPreviewRef = useRef<(() => Promise<void>) | null>(null);
  const { showToast } = useToast();

  React.useEffect(() => {
    if (id) {
      getDetector(id)
        .then((detectorData) => {
          setDetector(detectorData);
          // Check if autoRun query parameter is present
          if (searchParams.get('autoRun') === 'true') {
            setShouldAutoRun(true);
            // Remove query parameter from URL
            setSearchParams((prev) => {
              const newParams = new URLSearchParams(prev);
              newParams.delete('autoRun');
              return newParams;
            });
          }
        })
        .catch((err) => {
          showToast('error', 'Failed to load detector', err.message);
        });
    }
  }, [id, getDetector, showToast, searchParams, setSearchParams]);

  // Auto-run preview when detector is loaded and shouldAutoRun is true
  React.useEffect(() => {
    if (shouldAutoRun && detector?.id && runPreviewRef.current) {
      // Small delay to ensure preview component is ready
      const timer = setTimeout(() => {
        runPreviewRef.current?.();
        setShouldAutoRun(false);
      }, 500);
      return () => clearTimeout(timer);
    }
  }, [shouldAutoRun, detector?.id]);

  const handleSubmit = async (detectorData: Omit<Detector, 'id' | 'created_at' | 'updated_at'>) => {
    try {
      setSaving(true);
      
      // Client-side validation
      if (!detectorData.name || !detectorData.name.trim()) {
        showToast('error', 'Validation Error', 'Detector name is required');
        return;
      }
      
      if (!detectorData.cohort_by || detectorData.cohort_by.length === 0) {
        showToast('error', 'Validation Error', 'At least one cohort dimension must be selected');
        return;
      }
      
      if (!detectorData.metrics || detectorData.metrics.length === 0) {
        showToast('error', 'Validation Error', 'At least one metric must be selected');
        return;
      }
      
      if (detector) {
        await updateDetector(detector.id, detectorData);
        showToast('success', 'Detector Updated', 'Detector configuration saved successfully. Running preview...');
        // Reload detector to show updated data
        const updated = await getDetector(detector.id);
        setDetector(updated);
        // Trigger preview after update (same as clicking Update button)
        if (runPreviewRef.current) {
          // Small delay to ensure detector state is updated
          setTimeout(() => {
            runPreviewRef.current?.();
          }, 300);
        }
      } else {
        const newDetector = await createDetector(detectorData);
        showToast(
          'success',
          'Detector Created',
          `Detector "${newDetector.name}" has been created successfully. Running preview...`
        );
        // Set detector state so preview can run
        setDetector(newDetector);
        // Preview will auto-run when detector is set (handled in DetectorPreview)
      }
    } catch (err) {
      // Extract error message from API error response
      let errorMessage = 'Unknown error';
      if (err instanceof Error) {
        errorMessage = err.message;
      } else if (typeof err === 'object' && err !== null) {
        const apiError = err as any;
        errorMessage = apiError.message || apiError.error || apiError.detail || 'Failed to save detector';
      }
      
      showToast('error', 'Failed to save detector', errorMessage);
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-corporate-bgPrimary p-6">
        <div className="max-w-7xl mx-auto">
          <SkeletonLoader variant="chart" />
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-corporate-bgPrimary p-6">
        <div className="max-w-7xl mx-auto">
          <EmptyState
            title="Error Loading Detector"
            message={error.message}
            actionLabel="Retry"
            onAction={() => window.location.reload()}
          />
        </div>
      </div>
    );
  }

  return (
    <ErrorBoundary>
      <div className="min-h-screen bg-corporate-bgPrimary p-6">
        <div className="max-w-7xl mx-auto space-y-6">
          <AnalyticsHeader
            title="Detector Studio"
            subtitle="Tune detection parameters and preview flags"
          />

          {/* Detectors Table Section */}
          <DetectorsTable />

          <div className="flex flex-col gap-6">
            {/* Detector Form Section */}
            <div className="w-full">
              <DetectorForm
                detector={detector || undefined}
                onSubmit={handleSubmit}
                loading={saving}
              />
            </div>

            {/* Preview Section - Below Form and Configuration */}
            <div className="w-full">
              <DetectorPreview
                detector={detector}
                k={k}
                persistence={persistence}
                onKChange={setK}
                onPersistenceChange={setPersistence}
                autoRun={true}
                onPreviewReady={(runPreview) => {
                  runPreviewRef.current = runPreview;
                }}
              />
            </div>
          </div>
        </div>
      </div>
    </ErrorBoundary>
  );
};

