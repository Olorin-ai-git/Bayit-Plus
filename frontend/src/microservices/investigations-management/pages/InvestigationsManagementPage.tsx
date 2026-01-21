/**
 * Investigations Management Page
 * Main page component for viewing and managing investigations
 */

import React, { useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useToast } from '@shared/components/ui/ToastProvider';
import { Investigation, InvestigationStatus, InvestigationTab } from '../types/investigations';
import { investigationsManagementService } from '../services/investigationsManagementService';
import { downloadInvestigations, importInvestigations } from '../utils/exportImport';
import { InvestigationList } from '../components/InvestigationList';
import { InvestigationFilters } from '../components/InvestigationFilters';
import { InvestigationDetailsModal } from '../components/InvestigationDetailsModal';
import { ConfirmationModal } from '@shared/components/ConfirmationModal';
import { useInvestigations } from '../hooks/useInvestigations';
import { useRealtimeUpdates } from '../hooks/useRealtimeUpdates';
import { useKeyboardShortcuts } from '../utils/keyboardShortcuts';
import { getMaxComparisonInvestigations, canCompareInvestigations } from '../utils/investigationComparison';

export const InvestigationsManagementPage: React.FC = () => {
  const navigate = useNavigate();
  const { showToast } = useToast();
  const {
    filteredInvestigations,
    isLoading,
    error,
    filters,
    setFilters,
    reload
  } = useInvestigations();


  const [selectedInvestigation, setSelectedInvestigation] = useState<Investigation | null>(null);
  const [isDetailsModalOpen, setIsDetailsModalOpen] = useState(false);
  const [investigationToDelete, setInvestigationToDelete] = useState<Investigation | null>(null);
  const [isDeleteConfirmationOpen, setIsDeleteConfirmationOpen] = useState(false);
  const [realtimeEnabled, setRealtimeEnabled] = useState(false); // Disabled by default to avoid rate limiting
  const [isReplaying, setIsReplaying] = useState(false);
  const searchInputRef = useRef<HTMLInputElement>(null);

  // Multi-select state (limited to 2 for comparison)
  const [selectedInvestigations, setSelectedInvestigations] = useState<Set<string>>(new Set());
  const [isBulkDeleteConfirmationOpen, setIsBulkDeleteConfirmationOpen] = useState(false);
  const [isComparing, setIsComparing] = useState(false);

  // Real-time updates - use 15 second interval to avoid rate limiting
  const { isConnected, lastUpdate } = useRealtimeUpdates({
    enabled: realtimeEnabled,
    pollInterval: 15000, // 15 seconds - more reasonable for rate limits
    onUpdate: async () => {
      await reload();
    }
  });

  // Keyboard shortcuts
  useKeyboardShortcuts({
    onSearchFocus: () => {
      searchInputRef.current?.focus();
    },
    onNewInvestigation: () => {
      handleNewInvestigation();
    },
    onCloseModal: () => {
      if (isDeleteConfirmationOpen) {
        setIsDeleteConfirmationOpen(false);
        setInvestigationToDelete(null);
      }
    }
  });

  const handleSearchChange = (query: string) => {
    setFilters({ searchQuery: query });
  };

  const handleStatusFilterChange = (status: InvestigationStatus | 'all') => {
    setFilters({ status: status === 'all' ? undefined : status });
  };

  const handleTabChange = (tab: InvestigationTab) => {
    setFilters({ tab });
  };

  const handleInvestigationClick = (investigation: Investigation) => {
    setSelectedInvestigation(investigation);
    setIsDetailsModalOpen(true);
  };

  const handleViewInvestigation = (investigation: Investigation) => {
    setSelectedInvestigation(investigation);
    setIsDetailsModalOpen(true);
  };

  const handleCloseDetailsModal = () => {
    setIsDetailsModalOpen(false);
    setSelectedInvestigation(null);
  };

  const handleDeleteInvestigation = (investigation: Investigation) => {
    setInvestigationToDelete(investigation);
    setIsDeleteConfirmationOpen(true);
  };

  const handleConfirmDelete = async () => {
    if (!investigationToDelete) return;

    try {
      await investigationsManagementService.delete(investigationToDelete.id);
      showToast('success', 'Success', `Investigation "${investigationToDelete.name || investigationToDelete.id}" deleted successfully`);
      setIsDeleteConfirmationOpen(false);
      setIsDetailsModalOpen(false);
      setSelectedInvestigation(null);
      setInvestigationToDelete(null);
      await reload();
    } catch (err: any) {
      // Handle 403 Forbidden (permission denied) specifically
      if (err?.response?.status === 403) {
        showToast('error', 'Permission Denied', 'You do not have write access to delete investigations');
      } else if (err?.response?.status === 404) {
        showToast('error', 'Not Found', 'Investigation not found. It may have already been deleted.');
      } else {
        showToast('error', 'Error', 
          err instanceof Error 
            ? err.message 
            : 'Failed to delete investigation'
        );
      }
      setIsDeleteConfirmationOpen(false);
      setInvestigationToDelete(null);
    }
  };

  const handleCancelDelete = () => {
    setIsDeleteConfirmationOpen(false);
    setInvestigationToDelete(null);
  };

  const handleExportJSON = () => {
    try {
      downloadInvestigations(filteredInvestigations);
      showToast('success', 'Success', 'Investigations exported successfully');
    } catch (err) {
      showToast('error', 'Error', 'Failed to export investigations');
    }
  };

  const handleImportJSON = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    try {
      const importedInvestigations = await importInvestigations(file);
      showToast('success', 'Success', `Imported ${importedInvestigations.length} investigation(s)`);
      
      // TODO: Upload imported investigations to backend
      // For now, just show success message
      console.log('Imported investigations:', importedInvestigations);
      
      // Reload to show any new investigations
      await reload();
    } catch (err) {
      showToast('error', 'Error',
        err instanceof Error 
          ? err.message 
          : 'Failed to import investigations'
      );
    } finally {
      // Reset file input
      event.target.value = '';
    }
  };

  const handleClearFilters = () => {
    setFilters({ searchQuery: '', status: undefined, tab: 'all' });
  };

  const handleNewInvestigation = () => {
    // Navigate to investigation settings page instead of opening modal
    navigate('/investigation/settings');
  };

  const handleReplayInvestigation = async (investigation: Investigation) => {
    if (isReplaying) return; // Prevent multiple simultaneous replays

    setIsReplaying(true);
    try {
      const newInvestigation = await investigationsManagementService.replayInvestigation(investigation.id);
      const newInvestigationId = newInvestigation.investigation_id || newInvestigation.id;
      showToast('success', 'Success', `Investigation "${newInvestigationId}" created from replay`);

      // Navigate to investigation progress page
      navigate(`/investigation/progress?id=${newInvestigationId}`);
    } catch (err: any) {
      showToast('error', 'Error',
        err instanceof Error
          ? err.message
          : 'Failed to replay investigation'
      );
    } finally {
      setIsReplaying(false);
    }
  };

  // Multi-select handlers (limited to 2 for comparison)
  const handleSelectInvestigation = (id: string, selected: boolean) => {
    setSelectedInvestigations(prev => {
      const newSet = new Set(prev);
      if (selected) {
        // Limit to maximum 2 investigations for comparison
        if (newSet.size >= getMaxComparisonInvestigations()) {
          showToast('warning', 'Maximum Selection', `You can select a maximum of ${getMaxComparisonInvestigations()} investigations for comparison`);
          return prev;
        }
        newSet.add(id);
      } else {
        newSet.delete(id);
      }
      return newSet;
    });
  };

  const handleSelectAll = (selected: boolean) => {
    if (selected) {
      // Limit to maximum 2 investigations for comparison
      const maxCount = getMaxComparisonInvestigations();
      const limitedIds = filteredInvestigations.slice(0, maxCount).map(inv => inv.id);
      setSelectedInvestigations(new Set(limitedIds));
      if (filteredInvestigations.length > maxCount) {
        showToast('info', 'Selection Limited', `Only ${maxCount} investigations can be selected for comparison`);
      }
    } else {
      setSelectedInvestigations(new Set());
    }
  };

  const handleBulkDelete = () => {
    if (selectedInvestigations.size === 0) return;
    setIsBulkDeleteConfirmationOpen(true);
  };

  const handleConfirmBulkDelete = async () => {
    if (selectedInvestigations.size === 0) return;

    const idsToDelete = Array.from(selectedInvestigations);
    const deletePromises = idsToDelete.map(id =>
      investigationsManagementService.delete(id).catch(err => {
        console.error(`Failed to delete investigation ${id}:`, err);
        return { id, error: err };
      })
    );

    try {
      const results = await Promise.allSettled(deletePromises);
      const failures = results.filter(r => r.status === 'rejected').length;

      if (failures > 0) {
        showToast('error', 'Error', `Failed to delete ${failures} of ${idsToDelete.length} investigations`);
      } else {
        showToast('success', 'Success', `Successfully deleted ${idsToDelete.length} investigation(s)`);
      }

      setSelectedInvestigations(new Set());
      setIsBulkDeleteConfirmationOpen(false);
      await reload();
    } catch (err: any) {
      showToast('error', 'Error',
        err instanceof Error
          ? err.message
          : 'Failed to delete investigations'
      );
      setIsBulkDeleteConfirmationOpen(false);
    }
  };

  const handleCancelBulkDelete = () => {
    setIsBulkDeleteConfirmationOpen(false);
  };

  const handleCompareInvestigations = async () => {
    if (selectedInvestigations.size !== 2) {
      showToast('error', 'Invalid Selection', 'Please select exactly 2 investigations to compare');
      return;
    }

    const selectedIds = Array.from(selectedInvestigations);
    const invA = filteredInvestigations.find(inv => inv.id === selectedIds[0]);
    const invB = filteredInvestigations.find(inv => inv.id === selectedIds[1]);

    if (!invA || !invB) {
      showToast('error', 'Error', 'Could not find selected investigations');
      return;
    }

    // Validate investigations can be compared
    const validation = canCompareInvestigations(invA, invB);
    if (!validation.valid) {
      showToast('error', 'Cannot Compare', validation.reason || 'Investigations cannot be compared');
      return;
    }

    setIsComparing(true);
    try {
      // Use investigation-level comparison (risk scores, LLM insights)
      // Navigate to comparison page with investigation IDs
      const params = new URLSearchParams();
      params.set('invA', invA.id);
      params.set('invB', invB.id);
      
      // Include entity info for display
      if (invA.entity_type && invA.entity_id) {
        params.set('entityType', invA.entity_type);
        params.set('entityValue', invA.entity_id);
      }
      
      // Include time windows for context
      if (invA.from && invA.to) {
        params.set('windowAStart', invA.from);
        params.set('windowAEnd', invA.to);
      }
      if (invB.from && invB.to) {
        params.set('windowBStart', invB.from);
        params.set('windowBEnd', invB.to);
      }
      
      navigate(`/compare?${params.toString()}`);
      showToast('success', 'Comparing Investigations', 'Redirecting to comparison page...');
    } catch (err) {
      showToast('error', 'Error', 
        err instanceof Error 
          ? err.message 
          : 'Failed to start comparison'
      );
    } finally {
      setIsComparing(false);
    }
  };

  const allSelected = filteredInvestigations.length > 0 && selectedInvestigations.size === filteredInvestigations.length;
  const canCompare = selectedInvestigations.size === 2;

  return (
    <div className="min-h-screen bg-black">
      {/* Header */}
      <header className="sticky top-0 z-100 bg-black/90 backdrop-blur-md border-b border-corporate-borderPrimary/30 px-4 md:px-6 py-4">
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
          <div className="flex items-center gap-3 md:gap-4">
            <div className="w-10 h-10 rounded-full bg-gradient-to-br from-corporate-accentPrimary to-corporate-accentSecondary flex items-center justify-center flex-shrink-0">
              <span className="text-xl">📋</span>
            </div>
            <div>
              <h1 className="text-xl md:text-2xl font-bold text-corporate-accentPrimary">
                Investigations Management
              </h1>
              <p className="text-xs md:text-sm text-corporate-textSecondary">
                Manage, view, and monitor fraud investigations
              </p>
            </div>
          </div>
          <div className="flex flex-wrap gap-2 md:gap-3 w-full md:w-auto">
            <button 
              onClick={handleExportJSON}
              className="px-3 md:px-4 py-2 bg-corporate-bgSecondary border border-corporate-borderPrimary/40 rounded-lg text-corporate-textSecondary hover:border-corporate-accentPrimary transition-colors text-xs md:text-sm"
            >
              Export JSON
            </button>
            <label className="px-3 md:px-4 py-2 bg-corporate-bgSecondary border border-corporate-borderPrimary/40 rounded-lg text-corporate-textSecondary hover:border-corporate-accentPrimary transition-colors text-xs md:text-sm cursor-pointer">
              Import JSON
              <input 
                type="file" 
                accept="application/json" 
                className="hidden" 
                onChange={handleImportJSON}
              />
            </label>
            <button 
              onClick={handleNewInvestigation}
              className="px-3 md:px-4 py-2 bg-gradient-to-r from-corporate-accentPrimary to-corporate-accentSecondary text-white rounded-lg font-semibold hover:shadow-lg hover:shadow-corporate-accentPrimary/50 transition-all text-xs md:text-sm"
            >
              New Investigation <span className="ml-1 md:ml-2 px-1.5 md:px-2 py-0.5 bg-black/20 rounded text-xs">N</span>
            </button>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <div className="max-w-7xl mx-auto px-4 md:px-6 py-4 md:py-8">
        {/* Filters */}
        <div className="mb-6">
          <InvestigationFilters
            searchQuery={filters.searchQuery || ''}
            statusFilter={filters.status || 'all'}
            currentTab={filters.tab || 'all'}
            onSearchChange={handleSearchChange}
            onStatusFilterChange={handleStatusFilterChange}
            onTabChange={handleTabChange}
            searchInputRef={searchInputRef}
          />
        </div>

        {/* Bulk Actions Bar */}
        {filteredInvestigations.length > 0 && (
          <div className="mb-6 p-4 bg-corporate-bgSecondary border border-corporate-borderPrimary/40 rounded-lg">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                {/* Select All Checkbox */}
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={allSelected}
                    onChange={(e) => handleSelectAll(e.target.checked)}
                    className="w-5 h-5 rounded border-2 border-corporate-borderPrimary bg-corporate-bgSecondary checked:bg-corporate-accentPrimary checked:border-corporate-accentPrimary cursor-pointer transition-colors"
                    aria-label="Select all investigations"
                  />
                  <span className="text-sm text-corporate-textSecondary">
                    Select All
                  </span>
                </label>

                {/* Selection Count */}
                {selectedInvestigations.size > 0 && (
                  <span className="px-3 py-1 rounded text-sm bg-corporate-accentPrimary/20 text-corporate-accentPrimary border border-corporate-accentPrimary/40">
                    {selectedInvestigations.size} selected
                  </span>
                )}
              </div>

              {/* Bulk Actions */}
              {selectedInvestigations.size > 0 && (
                <div className="flex items-center gap-2">
                  {canCompare && (
                    <button
                      onClick={handleCompareInvestigations}
                      disabled={isComparing}
                      className="px-4 py-2 bg-gradient-to-r from-corporate-accentPrimary to-corporate-accentSecondary text-white rounded-lg hover:shadow-lg hover:shadow-corporate-accentPrimary/50 transition-all text-sm font-medium disabled:opacity-50 disabled:cursor-not-allowed"
                      aria-label="Compare selected investigations"
                    >
                      {isComparing ? 'Comparing...' : 'Compare (2)'}
                    </button>
                  )}
                  <button
                    onClick={handleBulkDelete}
                    className="px-4 py-2 bg-corporate-error/10 border border-corporate-error/40 rounded-lg text-corporate-error hover:bg-corporate-error/20 hover:border-corporate-error transition-all text-sm font-medium"
                    aria-label={`Delete ${selectedInvestigations.size} selected investigation(s)`}
                  >
                    Delete ({selectedInvestigations.size})
                  </button>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Realtime Toggle */}
        <div className="mb-6 p-4 bg-corporate-bgSecondary border border-corporate-borderPrimary/40 rounded-lg">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <span className="px-2 py-1 rounded text-xs border border-corporate-borderPrimary/40 text-corporate-textSecondary">
                Realtime
              </span>
              <button
                onClick={() => setRealtimeEnabled(!realtimeEnabled)}
                className={`relative w-11 h-6 rounded-full transition-all ${
                  realtimeEnabled
                    ? 'bg-gradient-to-r from-corporate-accentPrimary to-corporate-accentSecondary'
                    : 'bg-corporate-bgSecondary border border-corporate-borderPrimary/40'
                }`}
                aria-label={realtimeEnabled ? 'Disable realtime updates' : 'Enable realtime updates'}
              >
                <div
                  className={`absolute top-0.5 w-5 h-5 bg-white rounded-full transition-transform ${
                    realtimeEnabled ? 'translate-x-5' : 'translate-x-0.5'
                  }`}
                />
              </button>
              {isConnected && (
                <span className="flex items-center gap-1 text-xs text-corporate-success">
                  <span className="w-2 h-2 bg-corporate-success rounded-full animate-pulse"></span>
                  Connected
                </span>
              )}
              {lastUpdate && (
                <span className="text-xs text-corporate-textTertiary">
                  Updated {new Date(lastUpdate).toLocaleTimeString()}
                </span>
              )}
            </div>
            <div className="text-xs text-corporate-textTertiary">
              Tips: Press <span className="px-1.5 py-0.5 bg-corporate-bgSecondary border border-corporate-borderPrimary/40 rounded">N</span> for new investigation, <span className="px-1.5 py-0.5 bg-corporate-bgSecondary border border-corporate-borderPrimary/40 rounded">/</span> to search
            </div>
          </div>
        </div>

        {/* Investigation List */}
        <InvestigationList
          investigations={filteredInvestigations}
          isLoading={isLoading}
          error={error}
          onInvestigationClick={handleInvestigationClick}
          onView={handleViewInvestigation}
          onReplay={handleReplayInvestigation}
          onCreateNew={handleNewInvestigation}
          onClearFilters={handleClearFilters}
          selectedInvestigations={selectedInvestigations}
          onSelectInvestigation={handleSelectInvestigation}
        />
      </div>

      {/* Investigation Details Modal */}
      <InvestigationDetailsModal
        investigation={selectedInvestigation}
        isOpen={isDetailsModalOpen}
        onClose={handleCloseDetailsModal}
        onDelete={handleDeleteInvestigation}
        onReplay={(inv) => {
          setIsDetailsModalOpen(false);
          handleReplayInvestigation(inv);
        }}
      />

      {/* Delete Confirmation Modal */}
      <ConfirmationModal
        isOpen={isDeleteConfirmationOpen}
        onClose={handleCancelDelete}
        onConfirm={handleConfirmDelete}
        title="Delete Investigation"
        message={`Are you sure you want to delete "${investigationToDelete?.name}"? This action cannot be undone.`}
        confirmText="Delete"
        cancelText="Cancel"
        confirmVariant="danger"
        size="md"
        closeOnBackdrop={true}
      />

      {/* Bulk Delete Confirmation Modal */}
      <ConfirmationModal
        isOpen={isBulkDeleteConfirmationOpen}
        onClose={handleCancelBulkDelete}
        onConfirm={handleConfirmBulkDelete}
        title="Delete Multiple Investigations"
        message={`Are you sure you want to delete ${selectedInvestigations.size} investigation(s)? This action cannot be undone.`}
        confirmText={`Delete ${selectedInvestigations.size} Investigation(s)`}
        cancelText="Cancel"
        confirmVariant="danger"
        size="md"
        closeOnBackdrop={true}
      />
    </div>
  );
};
