import { useState, useCallback, useMemo, useEffect } from 'react';
import {
  Document,
  DocumentChunk,
  DocumentMetadata,
  PaginatedRAGResponse,
  RAGFilter,
  ChunkMetadata
} from '../types/ragIntelligence';
import { ragServices } from '../services';
import { handleRAGError, RAGError } from '../services/errorService';

// Upload progress interface
export interface UploadProgress {
  fileName: string;
  progress: number;
  status: 'uploading' | 'processing' | 'completed' | 'error';
  error?: string;
}

// Hook options
export interface UseDocumentsOptions {
  knowledgeBaseId?: string;
  autoLoad?: boolean;
  pageSize?: number;
  filter?: RAGFilter;
}

// Hook state
export interface DocumentsState {
  documents: PaginatedRAGResponse<Document> | null;
  selectedDocument: Document | null;
  chunks: DocumentChunk[];
  uploadProgress: Record<string, UploadProgress>;
  loading: {
    list: boolean;
    details: boolean;
    chunks: boolean;
    upload: boolean;
    update: boolean;
    delete: boolean;
    reprocess: boolean;
  };
  errors: {
    list: RAGError | null;
    details: RAGError | null;
    chunks: RAGError | null;
    upload: RAGError | null;
    update: RAGError | null;
    delete: RAGError | null;
    reprocess: RAGError | null;
  };
}

// Initial state
const initialState: DocumentsState = {
  documents: null,
  selectedDocument: null,
  chunks: [],
  uploadProgress: {},
  loading: {
    list: false,
    details: false,
    chunks: false,
    upload: false,
    update: false,
    delete: false,
    reprocess: false
  },
  errors: {
    list: null,
    details: null,
    chunks: null,
    upload: null,
    update: null,
    delete: null,
    reprocess: null
  }
};

export const useDocuments = (options: UseDocumentsOptions = {}) => {
  const {
    knowledgeBaseId,
    autoLoad = true,
    pageSize = 20,
    filter
  } = options;

  const [state, setState] = useState<DocumentsState>(initialState);
  const [currentPage, setCurrentPage] = useState(1);

  // Update loading state
  const setLoading = useCallback((key: keyof DocumentsState['loading'], loading: boolean) => {
    setState(prev => ({
      ...prev,
      loading: { ...prev.loading, [key]: loading }
    }));
  }, []);

  // Update error state
  const setError = useCallback((key: keyof DocumentsState['errors'], error: RAGError | null) => {
    setState(prev => ({
      ...prev,
      errors: { ...prev.errors, [key]: error }
    }));
  }, []);

  // Update upload progress
  const setUploadProgress = useCallback((fileName: string, progress: Partial<UploadProgress>) => {
    setState(prev => ({
      ...prev,
      uploadProgress: {
        ...prev.uploadProgress,
        [fileName]: {
          ...prev.uploadProgress[fileName],
          fileName,
          ...progress
        }
      }
    }));
  }, []);

  // Load documents with pagination
  const loadDocuments = useCallback(async (page: number = 1, customFilter?: RAGFilter) => {
    setLoading('list', true);
    setError('list', null);

    try {
      const paginatedFilter = {
        ...(customFilter || filter),
        page,
        pageSize,
        maxResults: pageSize
      };

      const documents = await ragServices.document.getDocuments(knowledgeBaseId, paginatedFilter);
      setState(prev => ({ ...prev, documents }));
      setCurrentPage(page);
      return documents;
    } catch (error) {
      const ragError = handleRAGError(error as Error, {
        operation: 'loadDocuments',
        knowledgeBaseId,
        page,
        filter: customFilter || filter
      });
      setError('list', ragError);
      throw ragError;
    } finally {
      setLoading('list', false);
    }
  }, [knowledgeBaseId, filter, pageSize, setLoading, setError]);

  // Load next page
  const loadNextPage = useCallback(async () => {
    if (!state.documents?.hasNext) return;
    return loadDocuments(currentPage + 1);
  }, [state.documents?.hasNext, currentPage, loadDocuments]);

  // Load previous page
  const loadPreviousPage = useCallback(async () => {
    if (!state.documents?.hasPrevious) return;
    return loadDocuments(currentPage - 1);
  }, [state.documents?.hasPrevious, currentPage, loadDocuments]);

  // Select document and load details
  const selectDocument = useCallback(async (id: string) => {
    setLoading('details', true);
    setError('details', null);

    try {
      const document = await ragServices.document.getDocument(id);
      setState(prev => ({ ...prev, selectedDocument: document }));
      return document;
    } catch (error) {
      const ragError = handleRAGError(error as Error, { operation: 'selectDocument', id });
      setError('details', ragError);
      throw ragError;
    } finally {
      setLoading('details', false);
    }
  }, [setLoading, setError]);

  // Load document chunks
  const loadChunks = useCallback(async (documentId: string) => {
    setLoading('chunks', true);
    setError('chunks', null);

    try {
      const chunks = await ragServices.document.getChunks(documentId);
      setState(prev => ({ ...prev, chunks }));
      return chunks;
    } catch (error) {
      const ragError = handleRAGError(error as Error, { operation: 'loadChunks', documentId });
      setError('chunks', ragError);
      throw ragError;
    } finally {
      setLoading('chunks', false);
    }
  }, [setLoading, setError]);

  // Clear selection
  const clearSelection = useCallback(() => {
    setState(prev => ({
      ...prev,
      selectedDocument: null,
      chunks: []
    }));
    setError('details', null);
    setError('chunks', null);
  }, [setError]);

  // Upload document
  const uploadDocument = useCallback(async (
    file: File,
    metadata: Partial<DocumentMetadata>,
    targetKnowledgeBaseId?: string,
    onProgress?: (progress: number) => void
  ) => {
    const fileName = file.name;
    setLoading('upload', true);
    setError('upload', null);
    setUploadProgress(fileName, {
      progress: 0,
      status: 'uploading'
    });

    try {
      // Create upload progress handler
      const progressHandler = (progress: number) => {
        setUploadProgress(fileName, { progress, status: 'uploading' });
        onProgress?.(progress);
      };

      // Upload with progress tracking
      const uploaded = await ragServices.document.uploadDocument(
        file,
        metadata,
        targetKnowledgeBaseId || knowledgeBaseId
      );

      // Update progress to processing
      setUploadProgress(fileName, {
        progress: 100,
        status: 'processing'
      });

      // Add to current documents list if they match the current filter
      if (state.documents && (!knowledgeBaseId || knowledgeBaseId === targetKnowledgeBaseId)) {
        setState(prev => ({
          ...prev,
          documents: prev.documents ? {
            ...prev.documents,
            items: [uploaded, ...prev.documents.items],
            total: prev.documents.total + 1
          } : null
        }));
      }

      // Mark as completed
      setUploadProgress(fileName, {
        progress: 100,
        status: 'completed'
      });

      // Remove progress after delay
      setTimeout(() => {
        setState(prev => ({
          ...prev,
          uploadProgress: Object.fromEntries(
            Object.entries(prev.uploadProgress).filter(([key]) => key !== fileName)
          )
        }));
      }, 3000);

      return uploaded;
    } catch (error) {
      const ragError = handleRAGError(error as Error, {
        operation: 'uploadDocument',
        fileName,
        fileSize: file.size,
        knowledgeBaseId: targetKnowledgeBaseId || knowledgeBaseId
      });

      setUploadProgress(fileName, {
        progress: 0,
        status: 'error',
        error: ragError.userMessage
      });

      setError('upload', ragError);
      throw ragError;
    } finally {
      setLoading('upload', false);
    }
  }, [knowledgeBaseId, state.documents, setLoading, setError, setUploadProgress]);

  // Upload multiple documents
  const uploadMultipleDocuments = useCallback(async (
    files: File[],
    metadata: Partial<DocumentMetadata>[],
    targetKnowledgeBaseId?: string,
    onProgress?: (fileName: string, progress: number) => void
  ) => {
    const results: { file: File; document?: Document; error?: RAGError }[] = [];

    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      const fileMetadata = metadata[i] || {};

      try {
        const document = await uploadDocument(
          file,
          fileMetadata,
          targetKnowledgeBaseId,
          (progress) => onProgress?.(file.name, progress)
        );
        results.push({ file, document });
      } catch (error) {
        results.push({ file, error: error as RAGError });
      }
    }

    return results;
  }, [uploadDocument]);

  // Update document
  const updateDocument = useCallback(async (id: string, updates: Partial<Document>) => {
    setLoading('update', true);
    setError('update', null);

    try {
      const updated = await ragServices.document.updateDocument(id, updates);

      // Update in documents list
      if (state.documents) {
        setState(prev => ({
          ...prev,
          documents: prev.documents ? {
            ...prev.documents,
            items: prev.documents.items.map(doc => doc.id === id ? updated : doc)
          } : null,
          selectedDocument: prev.selectedDocument?.id === id ? updated : prev.selectedDocument
        }));
      }

      return updated;
    } catch (error) {
      const ragError = handleRAGError(error as Error, { operation: 'updateDocument', id });
      setError('update', ragError);
      throw ragError;
    } finally {
      setLoading('update', false);
    }
  }, [state.documents, setLoading, setError]);

  // Delete document
  const deleteDocument = useCallback(async (id: string) => {
    setLoading('delete', true);
    setError('delete', null);

    try {
      await ragServices.document.deleteDocument(id);

      // Remove from documents list
      if (state.documents) {
        setState(prev => ({
          ...prev,
          documents: prev.documents ? {
            ...prev.documents,
            items: prev.documents.items.filter(doc => doc.id !== id),
            total: prev.documents.total - 1
          } : null,
          selectedDocument: prev.selectedDocument?.id === id ? null : prev.selectedDocument
        }));
      }
    } catch (error) {
      const ragError = handleRAGError(error as Error, { operation: 'deleteDocument', id });
      setError('delete', ragError);
      throw ragError;
    } finally {
      setLoading('delete', false);
    }
  }, [state.documents, setLoading, setError]);

  // Reprocess document
  const reprocessDocument = useCallback(async (id: string) => {
    setLoading('reprocess', true);
    setError('reprocess', null);

    try {
      const reprocessed = await ragServices.document.reprocessDocument(id);

      // Update in documents list
      if (state.documents) {
        setState(prev => ({
          ...prev,
          documents: prev.documents ? {
            ...prev.documents,
            items: prev.documents.items.map(doc => doc.id === id ? reprocessed : doc)
          } : null,
          selectedDocument: prev.selectedDocument?.id === id ? reprocessed : prev.selectedDocument
        }));
      }

      return reprocessed;
    } catch (error) {
      const ragError = handleRAGError(error as Error, { operation: 'reprocessDocument', id });
      setError('reprocess', ragError);
      throw ragError;
    } finally {
      setLoading('reprocess', false);
    }
  }, [state.documents, setLoading, setError]);

  // Update chunk metadata
  const updateChunkMetadata = useCallback(async (chunkId: string, metadata: Partial<ChunkMetadata>) => {
    try {
      const updated = await ragServices.document.updateChunkMetadata(chunkId, metadata);

      // Update in chunks list
      setState(prev => ({
        ...prev,
        chunks: prev.chunks.map(chunk => chunk.id === chunkId ? updated : chunk)
      }));

      return updated;
    } catch (error) {
      const ragError = handleRAGError(error as Error, { operation: 'updateChunkMetadata', chunkId });
      throw ragError;
    }
  }, []);

  // Clear all errors
  const clearErrors = useCallback(() => {
    setState(prev => ({
      ...prev,
      errors: {
        list: null,
        details: null,
        chunks: null,
        upload: null,
        update: null,
        delete: null,
        reprocess: null
      }
    }));
  }, []);

  // Clear upload progress
  const clearUploadProgress = useCallback(() => {
    setState(prev => ({
      ...prev,
      uploadProgress: {}
    }));
  }, []);

  // Reset hook state
  const reset = useCallback(() => {
    setState(initialState);
    setCurrentPage(1);
  }, []);

  // Auto-load on mount
  useEffect(() => {
    if (autoLoad) {
      loadDocuments(1);
    }
  }, [autoLoad, loadDocuments]);

  // Auto-load when knowledgeBaseId changes
  useEffect(() => {
    if (knowledgeBaseId && state.documents) {
      loadDocuments(1);
    }
  }, [knowledgeBaseId]); // Intentionally not including loadDocuments to avoid infinite loop

  // Computed values
  const computed = useMemo(() => ({
    hasDocuments: state.documents && state.documents.items.length > 0,
    hasErrors: Object.values(state.errors).some(error => error !== null),
    isLoading: Object.values(state.loading).some(loading => loading),
    hasUploadProgress: Object.keys(state.uploadProgress).length > 0,

    // Pagination info
    canLoadNext: state.documents?.hasNext || false,
    canLoadPrevious: state.documents?.hasPrevious || false,
    totalPages: state.documents?.totalPages || 0,
    totalDocuments: state.documents?.total || 0,

    // Document utilities
    getDocument: (id: string) => state.documents?.items.find(doc => doc.id === id),

    // Filter utilities
    processingDocuments: state.documents?.items.filter(doc => doc.status === 'processing') || [],
    indexedDocuments: state.documents?.items.filter(doc => doc.status === 'indexed') || [],
    failedDocuments: state.documents?.items.filter(doc => doc.status === 'failed') || [],
    archivedDocuments: state.documents?.items.filter(doc => doc.status === 'archived') || [],

    // Document type grouping
    documentsByType: state.documents?.items.reduce((acc, doc) => {
      const type = doc.metadata.fileType;
      if (!acc[type]) acc[type] = [];
      acc[type].push(doc);
      return acc;
    }, {} as Record<string, Document[]>) || {},

    // Document category grouping
    documentsByCategory: state.documents?.items.reduce((acc, doc) => {
      const category = doc.metadata.category;
      if (!acc[category]) acc[category] = [];
      acc[category].push(doc);
      return acc;
    }, {} as Record<string, Document[]>) || {},

    // Size statistics
    totalSize: state.documents?.items.reduce((total, doc) => total + doc.metadata.fileSize, 0) || 0,
    averageSize: state.documents?.items.length
      ? Math.round((state.documents.items.reduce((total, doc) => total + doc.metadata.fileSize, 0) / state.documents.items.length))
      : 0,

    // Chunk statistics for selected document
    selectedDocumentChunks: state.chunks.length,
    totalTokens: state.chunks.reduce((total, chunk) => total + chunk.metadata.tokens, 0),
    averageTokensPerChunk: state.chunks.length
      ? Math.round(state.chunks.reduce((total, chunk) => total + chunk.metadata.tokens, 0) / state.chunks.length)
      : 0,

    // Upload status
    activeUploads: Object.values(state.uploadProgress).filter(up => up.status === 'uploading' || up.status === 'processing'),
    completedUploads: Object.values(state.uploadProgress).filter(up => up.status === 'completed'),
    failedUploads: Object.values(state.uploadProgress).filter(up => up.status === 'error'),

    // Current page info
    currentPage,
    isFirstPage: currentPage === 1,
    isLastPage: currentPage >= (state.documents?.totalPages || 0)
  }), [state, currentPage]);

  return {
    // State
    ...state,

    // Operations
    loadDocuments,
    loadNextPage,
    loadPreviousPage,
    selectDocument,
    clearSelection,
    loadChunks,
    uploadDocument,
    uploadMultipleDocuments,
    updateDocument,
    deleteDocument,
    reprocessDocument,
    updateChunkMetadata,

    // Utilities
    clearErrors,
    clearUploadProgress,
    reset,

    // Computed values
    ...computed
  };
};

export default useDocuments;