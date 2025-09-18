import { useState, useCallback, useEffect, useRef } from 'react';
import { Evidence, EvidenceType, ChainOfCustodyEntry } from '../types/manualInvestigation';
import { manualInvestigationService } from '../services/manualInvestigationService';
import { collaborationService } from '../services/collaborationService';
import { notificationService } from '../services/notificationService';

interface UseEvidenceState {
  evidence: Evidence[];
  isLoading: boolean;
  isUploading: boolean;
  isVerifying: boolean;
  error: string | null;
  uploadProgress: number;
  filteredEvidence: Evidence[];
  stats: {
    total: number;
    verified: number;
    pending: number;
    byType: Record<EvidenceType, number>;
  };
}

interface UseEvidenceActions {
  // Evidence management
  addEvidence: (evidence: Omit<Evidence, 'id'>, file?: File) => Promise<Evidence | null>;
  updateEvidence: (evidenceId: string, updates: Partial<Evidence>) => Promise<void>;
  verifyEvidence: (evidenceId: string) => Promise<void>;
  deleteEvidence: (evidenceId: string) => Promise<void>;
  downloadEvidence: (evidenceId: string) => Promise<void>;

  // Chain of custody
  addCustodyEntry: (evidenceId: string, entry: Omit<ChainOfCustodyEntry, 'id'>) => Promise<void>;

  // Filtering and search
  filterByType: (type: EvidenceType | 'all') => void;
  filterByVerification: (verified: boolean | 'all') => void;
  filterByStep: (stepId: string | 'all') => void;
  searchEvidence: (query: string) => void;
  clearFilters: () => void;

  // Bulk operations
  bulkVerify: (evidenceIds: string[]) => Promise<void>;
  bulkDelete: (evidenceIds: string[]) => Promise<void>;
  exportEvidence: (evidenceIds?: string[]) => Promise<void>;

  // Utility
  getEvidenceByStep: (stepId: string) => Evidence[];
  getUnverifiedEvidence: () => Evidence[];
  clearError: () => void;
}

interface UseEvidenceFilters {
  type: EvidenceType | 'all';
  verified: boolean | 'all';
  stepId: string | 'all';
  searchQuery: string;
}

interface UseEvidenceOptions {
  investigationId: string;
  currentUserId: string;
  currentUserName: string;
  enableRealtime?: boolean;
  autoRefresh?: boolean;
  refreshInterval?: number;
}

export function useEvidence(
  initialEvidence: Evidence[],
  options: UseEvidenceOptions
): UseEvidenceState & UseEvidenceActions {
  const {
    investigationId,
    currentUserId,
    currentUserName,
    enableRealtime = true,
    autoRefresh = false,
    refreshInterval = 30000
  } = options;

  const [evidence, setEvidence] = useState<Evidence[]>(initialEvidence);
  const [filters, setFilters] = useState<UseEvidenceFilters>({
    type: 'all',
    verified: 'all',
    stepId: 'all',
    searchQuery: ''
  });

  const [state, setState] = useState({
    isLoading: false,
    isUploading: false,
    isVerifying: false,
    error: null as string | null,
    uploadProgress: 0
  });

  const refreshTimeoutRef = useRef<NodeJS.Timeout>();

  // Calculate statistics
  const stats = {
    total: evidence.length,
    verified: evidence.filter(e => e.isVerified).length,
    pending: evidence.filter(e => !e.isVerified).length,
    byType: evidence.reduce((acc, e) => {
      acc[e.type] = (acc[e.type] || 0) + 1;
      return acc;
    }, {} as Record<EvidenceType, number>)
  };

  // Filter evidence based on current filters
  const filteredEvidence = evidence.filter(item => {
    const matchesType = filters.type === 'all' || item.type === filters.type;
    const matchesVerification = filters.verified === 'all' || item.isVerified === filters.verified;
    const matchesStep = filters.stepId === 'all' || item.relatedStepId === filters.stepId;
    const matchesSearch = !filters.searchQuery ||
      item.title.toLowerCase().includes(filters.searchQuery.toLowerCase()) ||
      item.description.toLowerCase().includes(filters.searchQuery.toLowerCase()) ||
      item.tags.some(tag => tag.toLowerCase().includes(filters.searchQuery.toLowerCase()));

    return matchesType && matchesVerification && matchesStep && matchesSearch;
  });

  // Evidence management functions
  const addEvidence = useCallback(async (
    evidenceData: Omit<Evidence, 'id'>,
    file?: File
  ): Promise<Evidence | null> => {
    setState(prev => ({ ...prev, isUploading: true, error: null, uploadProgress: 0 }));

    try {
      // Simulate upload progress if file is provided
      if (file) {
        const progressInterval = setInterval(() => {
          setState(prev => ({
            ...prev,
            uploadProgress: Math.min(prev.uploadProgress + 10, 90)
          }));
        }, 100);

        const response = await manualInvestigationService.addEvidence({
          investigationId,
          evidence: evidenceData,
          file
        });

        clearInterval(progressInterval);

        if (!response.success) {
          throw new Error(response.error || 'Failed to add evidence');
        }

        const newEvidence = response.data!;

        // Update local state
        setEvidence(prev => [newEvidence, ...prev]);

        // Send real-time update
        if (enableRealtime) {
          collaborationService.sendEvidenceAdded(newEvidence);
        }

        // Create notification
        await notificationService.createNotification({
          type: 'evidence_added',
          investigationId,
          investigationTitle: '', // Will be filled by the service
          relatedEntityId: newEvidence.id,
          relatedEntityType: 'evidence',
          variables: { evidenceTitle: newEvidence.title }
        });

        setState(prev => ({ ...prev, isUploading: false, uploadProgress: 100 }));

        // Reset progress after a delay
        setTimeout(() => {
          setState(prev => ({ ...prev, uploadProgress: 0 }));
        }, 1000);

        return newEvidence;
      } else {
        // No file upload, just metadata
        const response = await manualInvestigationService.addEvidence({
          investigationId,
          evidence: evidenceData
        });

        if (!response.success) {
          throw new Error(response.error || 'Failed to add evidence');
        }

        const newEvidence = response.data!;
        setEvidence(prev => [newEvidence, ...prev]);

        setState(prev => ({ ...prev, isUploading: false }));
        return newEvidence;
      }
    } catch (error) {
      setState(prev => ({
        ...prev,
        error: error instanceof Error ? error.message : 'Failed to add evidence',
        isUploading: false,
        uploadProgress: 0
      }));
      return null;
    }
  }, [investigationId, enableRealtime]);

  const updateEvidence = useCallback(async (
    evidenceId: string,
    updates: Partial<Evidence>
  ) => {
    setState(prev => ({ ...prev, error: null }));

    try {
      const response = await manualInvestigationService.updateEvidence(
        investigationId,
        evidenceId,
        updates
      );

      if (!response.success) {
        throw new Error(response.error || 'Failed to update evidence');
      }

      const updatedEvidence = response.data!;

      setEvidence(prev =>
        prev.map(item => item.id === evidenceId ? updatedEvidence : item)
      );

      // Send real-time update
      if (enableRealtime) {
        collaborationService.sendEvidenceAdded(updatedEvidence);
      }
    } catch (error) {
      setState(prev => ({
        ...prev,
        error: error instanceof Error ? error.message : 'Failed to update evidence'
      }));
    }
  }, [investigationId, enableRealtime]);

  const verifyEvidence = useCallback(async (evidenceId: string) => {
    setState(prev => ({ ...prev, isVerifying: true, error: null }));

    try {
      const response = await manualInvestigationService.verifyEvidence(
        investigationId,
        evidenceId
      );

      if (!response.success) {
        throw new Error(response.error || 'Failed to verify evidence');
      }

      const verifiedEvidence = response.data!;

      setEvidence(prev =>
        prev.map(item => item.id === evidenceId ? verifiedEvidence : item)
      );

      setState(prev => ({ ...prev, isVerifying: false }));
    } catch (error) {
      setState(prev => ({
        ...prev,
        error: error instanceof Error ? error.message : 'Failed to verify evidence',
        isVerifying: false
      }));
    }
  }, [investigationId]);

  const deleteEvidence = useCallback(async (evidenceId: string) => {
    setState(prev => ({ ...prev, error: null }));

    try {
      // Optimistically remove from local state
      setEvidence(prev => prev.filter(item => item.id !== evidenceId));

      // TODO: Implement delete endpoint in service
      // const response = await manualInvestigationService.deleteEvidence(investigationId, evidenceId);
    } catch (error) {
      // Restore evidence on error
      const deletedEvidence = evidence.find(item => item.id === evidenceId);
      if (deletedEvidence) {
        setEvidence(prev => [...prev, deletedEvidence]);
      }

      setState(prev => ({
        ...prev,
        error: error instanceof Error ? error.message : 'Failed to delete evidence'
      }));
    }
  }, [investigationId, evidence]);

  const downloadEvidence = useCallback(async (evidenceId: string) => {
    setState(prev => ({ ...prev, error: null }));

    try {
      const response = await manualInvestigationService.downloadEvidence(
        investigationId,
        evidenceId
      );

      if (!response.success || !response.data) {
        throw new Error(response.error || 'Failed to download evidence');
      }

      const evidenceItem = evidence.find(e => e.id === evidenceId);
      const fileName = evidenceItem?.fileName || 'evidence';

      // Create download link
      const url = window.URL.createObjectURL(response.data);
      const link = document.createElement('a');
      link.href = url;
      link.download = fileName;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);
    } catch (error) {
      setState(prev => ({
        ...prev,
        error: error instanceof Error ? error.message : 'Failed to download evidence'
      }));
    }
  }, [investigationId, evidence]);

  // Chain of custody
  const addCustodyEntry = useCallback(async (
    evidenceId: string,
    entry: Omit<ChainOfCustodyEntry, 'id'>
  ) => {
    const newEntry: ChainOfCustodyEntry = {
      ...entry,
      id: `custody-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`
    };

    setEvidence(prev =>
      prev.map(item => {
        if (item.id !== evidenceId) return item;
        return {
          ...item,
          chainOfCustody: [...item.chainOfCustody, newEntry]
        };
      })
    );
  }, []);

  // Filtering and search
  const filterByType = useCallback((type: EvidenceType | 'all') => {
    setFilters(prev => ({ ...prev, type }));
  }, []);

  const filterByVerification = useCallback((verified: boolean | 'all') => {
    setFilters(prev => ({ ...prev, verified }));
  }, []);

  const filterByStep = useCallback((stepId: string | 'all') => {
    setFilters(prev => ({ ...prev, stepId }));
  }, []);

  const searchEvidence = useCallback((query: string) => {
    setFilters(prev => ({ ...prev, searchQuery: query }));
  }, []);

  const clearFilters = useCallback(() => {
    setFilters({
      type: 'all',
      verified: 'all',
      stepId: 'all',
      searchQuery: ''
    });
  }, []);

  // Bulk operations
  const bulkVerify = useCallback(async (evidenceIds: string[]) => {
    setState(prev => ({ ...prev, isVerifying: true, error: null }));

    try {
      const promises = evidenceIds.map(id =>
        manualInvestigationService.verifyEvidence(investigationId, id)
      );

      const responses = await Promise.allSettled(promises);

      // Update successful verifications
      const successfulVerifications: Evidence[] = [];
      responses.forEach((response, index) => {
        if (response.status === 'fulfilled' && response.value.success) {
          successfulVerifications.push(response.value.data!);
        }
      });

      if (successfulVerifications.length > 0) {
        setEvidence(prev =>
          prev.map(item => {
            const verified = successfulVerifications.find(v => v.id === item.id);
            return verified || item;
          })
        );
      }

      setState(prev => ({ ...prev, isVerifying: false }));
    } catch (error) {
      setState(prev => ({
        ...prev,
        error: error instanceof Error ? error.message : 'Failed to verify evidence',
        isVerifying: false
      }));
    }
  }, [investigationId]);

  const bulkDelete = useCallback(async (evidenceIds: string[]) => {
    setState(prev => ({ ...prev, error: null }));

    try {
      // Optimistically remove from local state
      const deletedEvidence = evidence.filter(item => evidenceIds.includes(item.id));
      setEvidence(prev => prev.filter(item => !evidenceIds.includes(item.id)));

      // TODO: Implement bulk delete endpoint
    } catch (error) {
      setState(prev => ({
        ...prev,
        error: error instanceof Error ? error.message : 'Failed to delete evidence'
      }));
    }
  }, [evidence]);

  const exportEvidence = useCallback(async (evidenceIds?: string[]) => {
    setState(prev => ({ ...prev, error: null }));

    try {
      const idsToExport = evidenceIds || evidence.map(e => e.id);
      const evidenceToExport = evidence.filter(e => idsToExport.includes(e.id));

      // Create CSV export
      const csvContent = [
        'Title,Type,Description,Verified,Collected By,Collected At,File Name,Tags',
        ...evidenceToExport.map(e =>
          `"${e.title}","${e.type}","${e.description}","${e.isVerified}","${e.collectedBy}","${e.collectedAt}","${e.fileName || ''}","${e.tags.join('; ')}"`
        )
      ].join('\n');

      const blob = new Blob([csvContent], { type: 'text/csv' });
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `evidence-export-${new Date().toISOString().split('T')[0]}.csv`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);
    } catch (error) {
      setState(prev => ({
        ...prev,
        error: error instanceof Error ? error.message : 'Failed to export evidence'
      }));
    }
  }, [evidence]);

  // Utility functions
  const getEvidenceByStep = useCallback((stepId: string): Evidence[] => {
    return evidence.filter(item => item.relatedStepId === stepId);
  }, [evidence]);

  const getUnverifiedEvidence = useCallback((): Evidence[] => {
    return evidence.filter(item => !item.isVerified);
  }, [evidence]);

  const clearError = useCallback(() => {
    setState(prev => ({ ...prev, error: null }));
  }, []);

  // Real-time event handlers
  useEffect(() => {
    if (!enableRealtime) return;

    const handleEvidenceAdded = (event: any) => {
      if (event.data.evidence && event.investigationId === investigationId) {
        setEvidence(prev => {
          // Check if evidence already exists to avoid duplicates
          const exists = prev.some(e => e.id === event.data.evidence.id);
          return exists ? prev : [event.data.evidence, ...prev];
        });
      }
    };

    const unsubscribe = collaborationService.onEvent('evidence_added', handleEvidenceAdded);

    return unsubscribe;
  }, [enableRealtime, investigationId]);

  // Auto refresh
  useEffect(() => {
    if (!autoRefresh || !refreshInterval) return;

    refreshTimeoutRef.current = setInterval(() => {
      // Could implement a refresh mechanism here
      console.log('Auto-refreshing evidence...');
    }, refreshInterval);

    return () => {
      if (refreshTimeoutRef.current) {
        clearInterval(refreshTimeoutRef.current);
      }
    };
  }, [autoRefresh, refreshInterval]);

  // Update evidence when initial evidence changes
  useEffect(() => {
    setEvidence(initialEvidence);
  }, [initialEvidence]);

  return {
    // State
    evidence,
    filteredEvidence,
    stats,
    ...state,

    // Actions
    addEvidence,
    updateEvidence,
    verifyEvidence,
    deleteEvidence,
    downloadEvidence,
    addCustodyEntry,
    filterByType,
    filterByVerification,
    filterByStep,
    searchEvidence,
    clearFilters,
    bulkVerify,
    bulkDelete,
    exportEvidence,
    getEvidenceByStep,
    getUnverifiedEvidence,
    clearError
  };
}