import { useState, useEffect, useCallback } from 'react';
import { useToast } from '@shared/components/ui/ToastProvider';
import RAGApiService from '@shared/services/RAGApiService';

export interface DataSource {
  id: string;
  name: string;
  source_type: 'postgresql' | 'sqlite' | 'investigation_results';
  connection_config: Record<string, any>;
  enabled: boolean;
  status: 'connected' | 'disconnected' | 'error';
  last_checked?: string;
  error_message?: string;
  created_at: string;
  updated_at: string;
}

export interface DataSourceCreate {
  name: string;
  source_type: 'postgresql' | 'sqlite' | 'investigation_results';
  connection_config: Record<string, any>;
  enabled?: boolean;
}

export interface DataSourceUpdate {
  name?: string;
  connection_config?: Record<string, any>;
  enabled?: boolean;
}

export const useRAGDataSources = () => {
  const { showToast } = useToast();
  const [dataSources, setDataSources] = useState<DataSource[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadDataSources = useCallback(async () => {
    try {
      setIsLoading(true);
      setError(null);
      const sources = await RAGApiService.getDataSources();
      setDataSources(sources);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to load data sources';
      setError(errorMessage);
      showToast('error', 'Error', errorMessage);
    } finally {
      setIsLoading(false);
    }
  }, []);

  const createDataSource = useCallback(async (data: DataSourceCreate): Promise<DataSource | null> => {
    try {
      setIsLoading(true);
      setError(null);
      const newSource = await RAGApiService.createDataSource(data);
      setDataSources(prev => [...prev, newSource]);
      showToast('success', 'Success', `Data source "${data.name}" created successfully`);
      return newSource;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to create data source';
      setError(errorMessage);
      showToast('error', 'Error', errorMessage);
      return null;
    } finally {
      setIsLoading(false);
    }
  }, []);

  const updateDataSource = useCallback(async (id: string, data: DataSourceUpdate): Promise<DataSource | null> => {
    try {
      setIsLoading(true);
      setError(null);
      const updatedSource = await RAGApiService.updateDataSource(id, data);
      setDataSources(prev => prev.map(s => s.id === id ? updatedSource : s));
      showToast('success', 'Success', `Data source "${updatedSource.name}" updated successfully`);
      return updatedSource;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to update data source';
      setError(errorMessage);
      showToast('error', 'Error', errorMessage);
      return null;
    } finally {
      setIsLoading(false);
    }
  }, []);

  const deleteDataSource = useCallback(async (id: string): Promise<boolean> => {
    try {
      setIsLoading(true);
      setError(null);
      await RAGApiService.deleteDataSource(id);
      setDataSources(prev => prev.filter(s => s.id !== id));
      showToast('success', 'Success', 'Data source deleted successfully');
      return true;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to delete data source';
      setError(errorMessage);
      showToast('error', 'Error', errorMessage);
      return false;
    } finally {
      setIsLoading(false);
    }
  }, []);

  const testConnection = useCallback(async (id: string): Promise<boolean> => {
    try {
      setIsLoading(true);
      setError(null);
      const result = await RAGApiService.testDataSourceConnection(id);
      if (result.success) {
        showToast('success', 'Success', 'Connection test successful');
        await loadDataSources();
        return true;
      } else {
        throw new Error(result.error || 'Connection test failed');
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Connection test failed';
      setError(errorMessage);
      showToast('error', 'Error', errorMessage);
      return false;
    } finally {
      setIsLoading(false);
    }
  }, [loadDataSources]);

  const toggleEnabled = useCallback(async (id: string, enabled: boolean): Promise<boolean> => {
    const result = await updateDataSource(id, { enabled });
    return result !== null;
  }, [updateDataSource]);

  useEffect(() => {
    loadDataSources();
  }, [loadDataSources]);

  return {
    dataSources,
    isLoading,
    error,
    loadDataSources,
    createDataSource,
    updateDataSource,
    deleteDataSource,
    testConnection,
    toggleEnabled
  };
};

