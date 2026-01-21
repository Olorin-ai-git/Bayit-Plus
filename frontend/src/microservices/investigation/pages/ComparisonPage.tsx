/**
 * Comparison Page Component
 *
 * Main page for investigation comparison feature.
 * Displays side-by-side panels with metrics, deltas, and summary.
 *
 * Constitutional Compliance:
 * - All data from API (no hardcoded values)
 * - Loading and error states handled gracefully
 * - Empty state for zero transactions
 * - Pending labels displayed when present
 */

import React, { useState, useCallback, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Card } from '@shared/components/ui/Card';
import { Button } from '@shared/components/ui/Button';
import LoadingSpinner from '@shared/components/LoadingSpinner';
// Temporarily disable auth to fix route - will re-enable once route works
// import { useAuth } from '@microservices/core-ui/hooks/useAuth';
import { comparisonService } from '../services/comparisonService';
import { investigationService } from '../services/investigationService';
import { ComparisonControls } from '../components/ComparisonControls';
import { BaselineInvestigationSelector } from '../components/BaselineInvestigationSelector';
import { DeltaStrip } from '../components/DeltaStrip';
import { SummaryBlock } from '../components/SummaryBlock';
import { PerMerchantTable } from '../components/PerMerchantTable';
import { PageToolbar } from '../components/PageToolbar';
import { WindowPanel } from '../components/WindowPanel';
// import { useToast } from '@shared/hooks/useToast'; // TODO: Find correct path
import { generateInvestigationId } from '@shared/utils/idGenerator';
import { useNavigate } from 'react-router-dom';
import type {
  ComparisonRequest,
  ComparisonResponse,
  WindowSpec,
  Entity
} from '../types/comparison';
import type { Investigation } from '@microservices/investigations-management/types/investigations';

export const ComparisonPage: React.FC = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  // TODO: Import useToast from correct path
  const showToast = useCallback((type: 'success' | 'error' | 'warning', title: string, message: string) => {
    console.log(`[Toast ${type}] ${title}: ${message}`);
  }, []);
  
  // Temporarily disable auth to fix route - will re-enable once route works
  const hasPrivilegedRole = false;
  
  // Initialize state from URL params if present (from investigation comparison)
  const invA = searchParams.get('invA');
  const invB = searchParams.get('invB');
  const entityTypeParam = searchParams.get('entityType');
  const entityValueParam = searchParams.get('entityValue');
  const windowAStartParam = searchParams.get('windowAStart');
  const windowAEndParam = searchParams.get('windowAEnd');
  const windowBStartParam = searchParams.get('windowBStart');
  const windowBEndParam = searchParams.get('windowBEnd');
  const windowALabelParam = searchParams.get('windowALabel');
  const windowBLabelParam = searchParams.get('windowBLabel');

  const [entity, setEntity] = useState<Entity | undefined>(
    entityTypeParam && entityValueParam 
      ? { type: entityTypeParam as Entity['type'], value: entityValueParam }
      : undefined
  );
  const [windowA, setWindowA] = useState<WindowSpec>(
    windowAStartParam && windowAEndParam
      ? { preset: 'custom', start: windowAStartParam, end: windowAEndParam, label: windowALabelParam || undefined }
      : { preset: 'retro_14d_6mo_back' }
  );
  const [windowB, setWindowB] = useState<WindowSpec>(
    windowBStartParam && windowBEndParam
      ? { preset: 'custom', start: windowBStartParam, end: windowBEndParam, label: windowBLabelParam || undefined }
      : { preset: 'recent_14d' }
  );
  const [riskThreshold, setRiskThreshold] = useState(0.7);
  const [matchDurations, setMatchDurations] = useState(false);
  const [merchantIds, setMerchantIds] = useState<string[]>([]);
  const [includeHistograms, setIncludeHistograms] = useState(false);
  const [includeTimeseries, setIncludeTimeseries] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [data, setData] = useState<ComparisonResponse | null>(null);
  
  // Baseline investigation mode
  const [comparisonMode, setComparisonMode] = useState<'manual' | 'baseline'>('manual');
  const [baselineInvestigation, setBaselineInvestigation] = useState<Investigation | null>(null);
  const [isCreatingInvestigation, setIsCreatingInvestigation] = useState(false);

  // Auto-populate fields when baseline investigation is selected
  useEffect(() => {
    if (baselineInvestigation && comparisonMode === 'baseline') {
      // Populate entity
      if (baselineInvestigation.entity_type && baselineInvestigation.entity_id) {
        // Map entity types: user_id -> email (if value looks like email), otherwise keep as-is
        let mappedEntityType = baselineInvestigation.entity_type;
        if (mappedEntityType === 'user_id') {
          // Check if the entity_id looks like an email
          if (baselineInvestigation.entity_id.includes('@')) {
            mappedEntityType = 'email';
          } else {
            // For non-email user_ids, try to infer from value or default to email
            mappedEntityType = 'email';
          }
        }
        
        setEntity({
          type: mappedEntityType as Entity['type'],
          value: baselineInvestigation.entity_id
        });
      }

      // Populate Window A (baseline investigation's time window)
      if (baselineInvestigation.from && baselineInvestigation.to) {
        setWindowA({
          preset: 'custom',
          start: baselineInvestigation.from,
          end: baselineInvestigation.to,
          label: `Baseline: ${baselineInvestigation.name || baselineInvestigation.id.substring(0, 8)}...`
        });

        // Calculate Window B (same duration, recent dates)
        const baselineStart = new Date(baselineInvestigation.from);
        const baselineEnd = new Date(baselineInvestigation.to);
        const windowDurationMs = baselineEnd.getTime() - baselineStart.getTime();
        const windowDurationDays = Math.round(windowDurationMs / (1000 * 60 * 60 * 24));

        const now = new Date();
        const newEnd = new Date(now);
        newEnd.setHours(0, 0, 0, 0); // Start of today
        const newStart = new Date(newEnd);
        newStart.setDate(newStart.getDate() - windowDurationDays);

        setWindowB({
          preset: 'custom',
          start: newStart.toISOString(),
          end: newEnd.toISOString(),
          label: `Recent ${windowDurationDays}d window`
        });
      }
    }
  }, [baselineInvestigation, comparisonMode]);

  const handleCompare = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      // If we have investigation IDs, use investigation-level comparison
      if (invA && invB) {
        const response = await comparisonService.compareInvestigations(invA, invB);
        // Transform investigation comparison response to match ComparisonResponse format
        // For now, store raw response - UI will need to be updated to handle investigation metrics
        setData(response as any);
      } else {
        // Use transaction-level comparison (original behavior)
        const request: ComparisonRequest = {
          entity: entity || undefined,
          windowA,
          windowB,
          risk_threshold: riskThreshold,
          merchant_ids: merchantIds.length > 0 ? merchantIds : undefined,
          options: {
            include_per_merchant: true,
            max_merchants: 25,
            include_histograms: includeHistograms,
            include_timeseries: includeTimeseries
          }
        };

        const response = await comparisonService.compareWindows(request);
        setData(response);
        
        // Check for missing risk scores in historical windows and notify user
        const windowAIsHistorical = windowA.label?.toLowerCase().includes('retro') || 
                                     windowA.label?.toLowerCase().includes('6mo') ||
                                     windowA.preset === 'retro_14d_6mo_back';
        const windowBIsHistorical = windowB.label?.toLowerCase().includes('retro') || 
                                     windowB.label?.toLowerCase().includes('6mo') ||
                                     windowB.preset === 'retro_14d_6mo_back';
        
        // Check if window A is historical and missing risk score
        if (windowAIsHistorical && response.A.source === 'fallback' && entity) {
          const windowAStart = new Date(response.windowA.start);
          const now = new Date();
          const daysAgo = Math.floor((now.getTime() - windowAStart.getTime()) / (1000 * 60 * 60 * 24));
          
          showToast('warning', 'Missing Historical Risk Score', 
            `Window A (${response.windowA.label}) does not have a risk score. ` +
            `This historical window (${daysAgo} days ago) needs an investigation to enable accurate comparison. ` +
            `Click "Run Investigation" in the window panel to create one.`
          );
        }
        
        // Check if window B is historical and missing risk score
        if (windowBIsHistorical && response.B.source === 'fallback' && entity) {
          const windowBStart = new Date(response.windowB.start);
          const now = new Date();
          const daysAgo = Math.floor((now.getTime() - windowBStart.getTime()) / (1000 * 60 * 60 * 24));
          
          showToast('warning', 'Missing Historical Risk Score', 
            `Window B (${response.windowB.label}) does not have a risk score. ` +
            `This historical window (${daysAgo} days ago) needs an investigation to enable accurate comparison. ` +
            `Click "Run Investigation" in the window panel to create one.`
          );
        }
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to compare';
      setError(errorMessage);
      
      // Clear data if comparison failed
      setData(null);
    } finally {
      setLoading(false);
    }
  }, [entity, windowA, windowB, riskThreshold, merchantIds, includeHistograms, includeTimeseries, invA, invB, showToast]);

  const handleRunInvestigation = useCallback(async (windowStart: string, windowEnd: string) => {
    if (!entity) {
      showToast('error', 'Error', 'Entity is required to run investigation');
      return;
    }

    try {
      const investigationId = generateInvestigationId();
      
      await investigationService.createInvestigation({
        id: investigationId,
        entityType: entity.type,
        entityId: entity.value,
        timeRange: {
          start: windowStart,
          end: windowEnd
        },
        tools: [],
        investigationType: 'structured'
      });

      showToast('success', 'Investigation Started', `Investigation ${investigationId.substring(0, 8)}... created`);
      
      // Navigate to progress page
      navigate(`/investigation/progress?id=${investigationId}`);
    } catch (err) {
      showToast('error', 'Error', 
        err instanceof Error ? err.message : 'Failed to create investigation'
      );
    }
  }, [entity, navigate, showToast]);

  const handleRunBaselineComparison = useCallback(async (baselineInv: Investigation) => {
    if (!baselineInv.from || !baselineInv.to || !baselineInv.entity_type || !baselineInv.entity_id) {
      showToast('error', 'Error', 'Baseline investigation must have entity and time window');
      return;
    }

    setIsCreatingInvestigation(true);
    setError(null);

    try {
      // Calculate window duration from baseline investigation
      const baselineStart = new Date(baselineInv.from);
      const baselineEnd = new Date(baselineInv.to);
      const windowDurationMs = baselineEnd.getTime() - baselineStart.getTime();
      const windowDurationDays = Math.round(windowDurationMs / (1000 * 60 * 60 * 24));

      // Create new investigation with same window duration but recent dates
      const now = new Date();
      const newEnd = new Date(now);
      newEnd.setHours(0, 0, 0, 0); // Start of today
      const newStart = new Date(newEnd);
      newStart.setDate(newStart.getDate() - windowDurationDays);

      const newInvestigationId = generateInvestigationId();
      
      showToast('warning', 'Creating Investigation', 'Creating new investigation with same window duration...');
      
      await investigationService.createInvestigation({
        id: newInvestigationId,
        entityType: baselineInv.entity_type,
        entityId: baselineInv.entity_id,
        timeRange: {
          start: newStart.toISOString(),
          end: newEnd.toISOString()
        },
        tools: [],
        investigationType: 'structured'
      });

      showToast('success', 'Investigation Created', `New investigation ${newInvestigationId.substring(0, 8)}... created. Running comparison...`);

      // Set entity from baseline investigation
      setEntity({
        type: baselineInv.entity_type as Entity['type'],
        value: baselineInv.entity_id
      });

      // Set windows for comparison
      setWindowA({
        preset: 'custom',
        start: baselineInv.from,
        end: baselineInv.to,
        label: `Baseline: ${baselineInv.name || baselineInv.id}`
      });
      setWindowB({
        preset: 'custom',
        start: newStart.toISOString(),
        end: newEnd.toISOString(),
        label: `Recent: ${newInvestigationId.substring(0, 8)}...`
      });

      // Run comparison using investigation IDs
      const comparisonResponse = await comparisonService.compareInvestigations(
        baselineInv.id,
        newInvestigationId
      );

      setData(comparisonResponse as any);
      showToast('success', 'Comparison Complete', 'Comparison between baseline and new investigation completed');
      
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to run baseline comparison';
      setError(errorMessage);
      showToast('error', 'Error', errorMessage);
    } finally {
      setIsCreatingInvestigation(false);
    }
  }, [showToast, setEntity, setWindowA, setWindowB]);

  // Auto-run comparison if URL params are present (from investigation comparison)
  useEffect(() => {
    // If we have investigation IDs, run comparison immediately
    if (invA && invB) {
      handleCompare();
    }
    // Otherwise, if we have all window params, run transaction-level comparison
    else if (entityTypeParam && entityValueParam && windowAStartParam && windowAEndParam && windowBStartParam && windowBEndParam) {
      handleCompare();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); // Run once on mount

  return (
    <div className="min-h-screen bg-black p-6">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Title Bar */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-corporate-textPrimary">
              Investigation Comparison
            </h1>
            {entity && (
              <p className="text-sm text-corporate-textSecondary mt-1">
                {entity.type} · {entity.value}
              </p>
            )}
          </div>
          <PageToolbar 
            data={data} 
            entity={entity || undefined}
            request={data ? {
              entity: entity || undefined,
              windowA,
              windowB,
              risk_threshold: riskThreshold,
              merchant_ids: merchantIds.length > 0 ? merchantIds : undefined,
              options: {
                include_per_merchant: true,
                max_merchants: 25,
                include_histograms: includeHistograms,
                include_timeseries: includeTimeseries
              }
            } : null}
          />
        </div>

        {/* Mode Toggle */}
        <Card variant="outlined" padding="md">
          <div className="flex items-center gap-4">
            <span className="text-sm font-medium text-corporate-textSecondary">Comparison Mode:</span>
            <div className="flex gap-2">
              <button
                onClick={() => setComparisonMode('manual')}
                className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                  comparisonMode === 'manual'
                    ? 'bg-corporate-accentPrimary text-white'
                    : 'bg-black/40 text-corporate-textSecondary hover:bg-black/60'
                }`}
              >
                Manual Windows
              </button>
              <button
                onClick={() => setComparisonMode('baseline')}
                className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                  comparisonMode === 'baseline'
                    ? 'bg-corporate-accentPrimary text-white'
                    : 'bg-black/40 text-corporate-textSecondary hover:bg-black/60'
                }`}
              >
                Baseline Investigation
              </button>
            </div>
          </div>
        </Card>

        {/* Baseline Investigation Selector */}
        {comparisonMode === 'baseline' && (
          <>
            <BaselineInvestigationSelector
              selectedInvestigationId={baselineInvestigation?.id || null}
              onSelectInvestigation={setBaselineInvestigation}
              onRunComparison={handleRunBaselineComparison}
              isRunningComparison={isCreatingInvestigation}
            />
            
            {/* Show populated fields - allow editing */}
            {baselineInvestigation && (
              <>
                <Card variant="outlined" padding="md" className="bg-blue-900/10 border-blue-500/30">
                  <div className="flex items-center gap-2 mb-3">
                    <span className="text-sm font-semibold text-blue-200">Auto-populated from baseline investigation</span>
                    <span className="text-xs text-blue-300">(You can modify these fields)</span>
                  </div>
                </Card>
                
                <ComparisonControls
                  entity={entity}
                  onEntityChange={setEntity}
                  windowA={windowA}
                  onWindowAChange={setWindowA}
                  windowB={windowB}
                  onWindowBChange={setWindowB}
                  matchDurations={matchDurations}
                  onMatchDurationsChange={setMatchDurations}
                  riskThreshold={riskThreshold}
                  onRiskThresholdChange={setRiskThreshold}
                  merchantIds={merchantIds}
                  onMerchantIdsChange={setMerchantIds}
                  includeHistograms={includeHistograms}
                  onIncludeHistogramsChange={setIncludeHistograms}
                  includeTimeseries={includeTimeseries}
                  onIncludeTimeseriesChange={setIncludeTimeseries}
                  onCompare={handleCompare}
                  loading={loading}
                  hasPrivilegedRole={hasPrivilegedRole}
                />
              </>
            )}
          </>
        )}

        {/* Manual Controls Row */}
        {comparisonMode === 'manual' && (
          <ComparisonControls
            entity={entity}
            onEntityChange={setEntity}
            windowA={windowA}
            onWindowAChange={setWindowA}
            windowB={windowB}
            onWindowBChange={setWindowB}
            matchDurations={matchDurations}
            onMatchDurationsChange={setMatchDurations}
            riskThreshold={riskThreshold}
            onRiskThresholdChange={setRiskThreshold}
            merchantIds={merchantIds}
            onMerchantIdsChange={setMerchantIds}
            includeHistograms={includeHistograms}
            onIncludeHistogramsChange={setIncludeHistograms}
            includeTimeseries={includeTimeseries}
            onIncludeTimeseriesChange={setIncludeTimeseries}
            onCompare={handleCompare}
            loading={loading}
            hasPrivilegedRole={hasPrivilegedRole}
          />
        )}

        {/* Error State */}
        {error && (
          <Card variant="outlined" padding="md" className="border-red-500">
            <p className="text-red-400">{error}</p>
          </Card>
        )}

        {/* Loading State */}
        {loading && (
          <div className="flex items-center justify-center h-64">
            <LoadingSpinner size="md" />
          </div>
        )}

        {/* Results */}
        {data && !loading && (
          <>
            {/* Missing Risk Score Banner for Historical Windows */}
            {((data.A.source === 'fallback' && (windowA.preset === 'retro_14d_6mo_back' || windowA.label?.toLowerCase().includes('retro'))) ||
              (data.B.source === 'fallback' && (windowB.preset === 'retro_14d_6mo_back' || windowB.label?.toLowerCase().includes('retro')))) && entity && (
              <Card variant="outlined" padding="md" className="border-amber-500/50 bg-amber-900/20 mb-4">
                <div className="flex items-start gap-3">
                  <span className="text-2xl">⚠️</span>
                  <div className="flex-1">
                    <h3 className="text-amber-200 font-semibold mb-1">Historical Window Missing Risk Score</h3>
                    <p className="text-amber-300 text-sm mb-3">
                      One or more historical windows do not have investigation risk scores. 
                      This limits comparison accuracy. Run investigations for these windows to get risk scores.
                    </p>
                    <div className="flex gap-2 flex-wrap">
                      {data.A.source === 'fallback' && (windowA.preset === 'retro_14d_6mo_back' || windowA.label?.toLowerCase().includes('retro')) && (
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleRunInvestigation(data.windowA.start, data.windowA.end)}
                          className="border-amber-500 text-amber-200 hover:bg-amber-800"
                        >
                          Run Investigation for {data.windowA.label}
                        </Button>
                      )}
                      {data.B.source === 'fallback' && (windowB.preset === 'retro_14d_6mo_back' || windowB.label?.toLowerCase().includes('retro')) && (
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleRunInvestigation(data.windowB.start, data.windowB.end)}
                          className="border-amber-500 text-amber-200 hover:bg-amber-800"
                        >
                          Run Investigation for {data.windowB.label}
                        </Button>
                      )}
                    </div>
                  </div>
                </div>
              </Card>
            )}

            {/* Pending Labels Banner */}
            {data.B.pending_label_count && data.B.pending_label_count > 0 && (
              <Card variant="outlined" padding="md" className="border-yellow-500/40 bg-yellow-900/10">
                <div className="flex items-center space-x-2">
                  <span className="text-yellow-400">⚠️</span>
                  <p className="text-sm text-yellow-400">
                    {data.B.pending_label_count} pending labels excluded from Window B metrics. 
                    Metrics may change once labels are finalized.
                  </p>
                </div>
              </Card>
            )}
            
            {/* Delta Strip */}
            <DeltaStrip delta={data.delta} />

            {/* Side-by-Side Panels */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <WindowPanel 
                windowInfo={data.windowA} 
                metrics={data.A}
                entity={entity}
                onRunInvestigation={handleRunInvestigation}
              />
              <WindowPanel 
                windowInfo={data.windowB} 
                metrics={data.B}
                entity={entity}
                onRunInvestigation={handleRunInvestigation}
              />
            </div>

            {/* Summary Block */}
            <SummaryBlock summary={data.investigation_summary} />

            {/* Per-Merchant Table */}
            {data.per_merchant && data.per_merchant.length > 0 && (
              <Card variant="elevated" padding="lg">
                <h3 className="text-lg font-semibold text-corporate-textPrimary mb-4">
                  Per-Merchant Breakdown
                </h3>
                <PerMerchantTable data={data.per_merchant} />
              </Card>
            )}

            {/* Empty State */}
            {data.A.total_transactions === 0 && data.B.total_transactions === 0 && (
              <Card variant="outlined" padding="lg" className="text-center">
                <p className="text-corporate-textSecondary">
                  No data for this entity in selected windows.
                </p>
              </Card>
            )}
          </>
        )}
      </div>
    </div>
  );
};

export default ComparisonPage;

