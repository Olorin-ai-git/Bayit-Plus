/**
 * Optimized Investigation Dashboard Component
 * 
 * High-performance investigation dashboard with advanced React optimizations:
 * - Component memoization and virtualization
 * - Optimized API calls with caching
 * - Performance monitoring and alerting
 * - Lazy loading and code splitting
 * - Intelligent re-render prevention
 */

import React, { 
  memo, 
  useMemo, 
  useCallback, 
  useState, 
  useEffect,
  Suspense,
  lazy,
  forwardRef,
  useImperativeHandle,
  RefObject
} from 'react';
import { InvestigationType, InvestigationResult, AgentResult } from '../types/investigation';
import { 
  useOptimizedCallback, 
  useOptimizedMemo, 
  useRenderPerformance,
  useVirtualScrolling,
  useIntersectionObserver,
  useDebounce
} from '../hooks/usePerformanceOptimization';
import { optimizedApiService } from '../services/optimized-api-service';

// Lazy load heavy components
const InvestigationChart = lazy(() => import('./InvestigationChart'));
const RiskAnalysisPanel = lazy(() => import('./RiskAnalysisPanel'));
const AgentExecutionLogs = lazy(() => import('./AgentExecutionLogs'));

// Types
interface Investigation extends InvestigationResult {
  // Legacy fields for backward compatibility
  userId: string;
  startTime: string;
  endTime?: string;
  metadata?: Record<string, any>;
}

// AgentResult is now imported from types

interface DashboardProps {
  userId?: string;
  autoRefresh?: boolean;
  refreshInterval?: number;
  enableRealTime?: boolean;
  maxInvestigations?: number;
  onInvestigationSelect?: (investigation: Investigation) => void;
  onPerformanceAlert?: (alert: string, metrics: any) => void;
}

interface DashboardRef {
  refreshData: () => Promise<void>;
  clearCache: () => void;
  getPerformanceMetrics: () => any;
}

// Memoized sub-components
const InvestigationCard = memo<{
  investigation: Investigation;
  onClick: (investigation: Investigation) => void;
  isSelected: boolean;
}>(({ investigation, onClick, isSelected }) => {
  const handleClick = useOptimizedCallback(() => {
    onClick(investigation);
  }, [investigation, onClick], 'investigation-card-click');
  
  const cardClassName = useOptimizedMemo(() => {
    const baseClasses = 'investigation-card p-4 mb-2 border rounded-lg cursor-pointer transition-colors';
    const statusClasses: Record<string, string> = {
      SUCCESS: 'border-green-300 bg-green-50',
      FAILURE: 'border-red-300 bg-red-50'
    };
    const selectedClass = isSelected ? 'ring-2 ring-blue-500' : '';
    
    return `${baseClasses} ${statusClasses[investigation.status]} ${selectedClass}`;
  }, [investigation.status, isSelected], 'card-className');
  
  const riskScoreColor = useOptimizedMemo(() => {
    if (investigation.riskScore >= 80) return 'text-red-600';
    if (investigation.riskScore >= 60) return 'text-orange-600';
    if (investigation.riskScore >= 40) return 'text-yellow-600';
    return 'text-green-600';
  }, [investigation.riskScore], 'risk-score-color');
  
  return (
    <div className={cardClassName} onClick={handleClick}>
      <div className="flex justify-between items-start">
        <div className="flex-1">
          <h3 className="font-semibold text-gray-900">
            Investigation {investigation.id}
          </h3>
          <p className="text-sm text-gray-600 mt-1">
            User ID: {investigation.userId}
          </p>
          <p className="text-xs text-gray-500 mt-1">
            Started: {investigation.startTime ? new Date(investigation.startTime).toLocaleString() : 'N/A'}
          </p>
        </div>
        <div className="flex flex-col items-end">
          <span className={`text-lg font-bold ${riskScoreColor}`}>
            {investigation.riskScore}%
          </span>
          <span className="text-xs text-gray-500 capitalize">
            {investigation.status}
          </span>
        </div>
      </div>
      
      {investigation.agentResults.length > 0 && (
        <div className="mt-3 flex flex-wrap gap-1">
          {investigation.agentResults.slice(0, 4).map((result, index) => (
            <span
              key={index}
              className={`text-xs px-2 py-1 rounded ${
                result.status === 'completed' 
                  ? 'bg-green-100 text-green-800'
                  : result.status === 'running'
                  ? 'bg-blue-100 text-blue-800'
                  : 'bg-gray-100 text-gray-800'
              }`}
            >
              {result.agentName}
            </span>
          ))}
          {investigation.agentResults.length > 4 && (
            <span className="text-xs px-2 py-1 rounded bg-gray-100 text-gray-600">
              +{investigation.agentResults.length - 4} more
            </span>
          )}
        </div>
      )}
    </div>
  );
});

InvestigationCard.displayName = 'InvestigationCard';

// Performance monitoring component
const PerformanceMonitor = memo<{
  onAlert: (alert: string, metrics: any) => void;
}>(({ onAlert }) => {
  const metrics = useRenderPerformance('PerformanceMonitor');
  const [apiMetrics, setApiMetrics] = useState<any>(null);
  
  useEffect(() => {
    const interval = setInterval(async () => {
      try {
        const performanceData = optimizedApiService.getPerformanceMetrics();
        setApiMetrics(performanceData);
        
        // Check for performance issues
        if (performanceData.cacheStats.hitRate < 0.7) {
          onAlert('Low cache hit rate detected', performanceData);
        }
        
        if (performanceData.averageResponseTime > 1000) {
          onAlert('High API response times detected', performanceData);
        }
        
      } catch (error) {
        console.error('Performance monitoring error:', error);
      }
    }, 30000); // Check every 30 seconds
    
    return () => clearInterval(interval);
  }, [onAlert]);
  
  if (process.env.NODE_ENV !== 'development') {
    return null;
  }
  
  return (
    <div className="performance-monitor fixed bottom-4 right-4 p-2 bg-gray-800 text-white text-xs rounded shadow-lg z-50">
      <div>Renders: {metrics.renderCount}</div>
      <div>Avg Render: {metrics.averageRenderTime.toFixed(1)}ms</div>
      {apiMetrics && (
        <>
          <div>Cache Hit Rate: {(apiMetrics.cacheStats.hitRate * 100).toFixed(1)}%</div>
          <div>API Avg: {apiMetrics.averageResponseTime.toFixed(0)}ms</div>
        </>
      )}
    </div>
  );
});

PerformanceMonitor.displayName = 'PerformanceMonitor';

// Main dashboard component
export const OptimizedInvestigationDashboard = memo(
  forwardRef<DashboardRef, DashboardProps>(({
    userId,
    autoRefresh = false,
    refreshInterval = 30000,
    enableRealTime = true,
    maxInvestigations = 100,
    onInvestigationSelect,
    onPerformanceAlert
  }, ref) => {
    // Performance monitoring
    const renderMetrics = useRenderPerformance('OptimizedInvestigationDashboard', true);
    
    // State
    const [investigations, setInvestigations] = useState<Investigation[]>([]);
    const [selectedInvestigation, setSelectedInvestigation] = useState<Investigation | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [searchQuery, setSearchQuery] = useState('');
    const [filterStatus, setFilterStatus] = useState<string>('all');
    
    // Search debouncing
    const debouncedSearchQuery = useDebounce(
      useCallback((query: string) => {
        setSearchQuery(query);
      }, []),
      300
    );
    
    // Filtered and sorted investigations
    const filteredInvestigations = useOptimizedMemo(() => {
      let filtered = investigations;
      
      // Apply search filter
      if (searchQuery.trim()) {
        const query = searchQuery.toLowerCase();
        filtered = filtered.filter(inv => 
          inv.id.toLowerCase().includes(query) ||
          (inv.userId && inv.userId.toLowerCase().includes(query))
        );
      }
      
      // Apply status filter
      if (filterStatus !== 'all') {
        filtered = filtered.filter(inv => inv.status === filterStatus);
      }
      
      // Sort by start time (most recent first)
      return filtered.sort((a, b) => {
        const aTime = a.startTime ? new Date(a.startTime).getTime() : 0;
        const bTime = b.startTime ? new Date(b.startTime).getTime() : 0;
        return bTime - aTime;
      });
    }, [investigations, searchQuery, filterStatus], 'filtered-investigations');
    
    // Virtual scrolling for large lists
    const {
      visibleItems: visibleInvestigations,
      totalHeight,
      handleScroll,
      containerProps
    } = useVirtualScrolling(filteredInvestigations, 120, 600, 5);
    
    // API calls
    const fetchInvestigations = useOptimizedCallback(async () => {
      try {
        setLoading(true);
        setError(null);
        
        const params = userId ? { userId, limit: maxInvestigations } : { limit: maxInvestigations };
        const data = await optimizedApiService.get<Investigation[]>('/investigations', {
          params,
          cacheTTL: 60000, // 1 minute cache
          backgroundRefresh: autoRefresh
        });
        
        setInvestigations(data);
      } catch (err: any) {
        setError(err.message || 'Failed to fetch investigations');
        console.error('Failed to fetch investigations:', err);
      } finally {
        setLoading(false);
      }
    }, [userId, maxInvestigations, autoRefresh], 'fetch-investigations');
    
    const handleInvestigationSelect = useOptimizedCallback((investigation: Investigation) => {
      setSelectedInvestigation(investigation);
      onInvestigationSelect?.(investigation);
    }, [onInvestigationSelect], 'handle-investigation-select');
    
    const handlePerformanceAlert = useOptimizedCallback((alert: string, metrics: any) => {
      onPerformanceAlert?.(alert, metrics);
      console.warn('Performance Alert:', alert, metrics);
    }, [onPerformanceAlert], 'handle-performance-alert');
    
    // Auto refresh
    useEffect(() => {
      if (autoRefresh && refreshInterval > 0) {
        const interval = setInterval(fetchInvestigations, refreshInterval);
        return () => clearInterval(interval);
      }
    }, [autoRefresh, refreshInterval, fetchInvestigations]);
    
    // Initial data fetch
    useEffect(() => {
      fetchInvestigations();
    }, [fetchInvestigations]);
    
    // Imperative handle for parent component access
    useImperativeHandle(ref, () => ({
      refreshData: fetchInvestigations,
      clearCache: () => optimizedApiService.clearCache(),
      getPerformanceMetrics: () => ({
        renderMetrics,
        apiMetrics: optimizedApiService.getPerformanceMetrics()
      })
    }), [fetchInvestigations, renderMetrics]);
    
    // Memoized search input handler
    const handleSearchChange = useOptimizedCallback((event: React.ChangeEvent<HTMLInputElement>) => {
      debouncedSearchQuery(event.target.value);
    }, [debouncedSearchQuery], 'handle-search-change');
    
    // Memoized filter handler
    const handleFilterChange = useOptimizedCallback((event: React.ChangeEvent<HTMLSelectElement>) => {
      setFilterStatus(event.target.value);
    }, [], 'handle-filter-change');
    
    // Error state
    if (error) {
      return (
        <div className="error-state p-6 text-center">
          <div className="text-red-600 mb-4">
            <h2 className="text-lg font-semibold">Error Loading Investigations</h2>
            <p className="text-sm">{error}</p>
          </div>
          <button
            onClick={fetchInvestigations}
            className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
          >
            Retry
          </button>
        </div>
      );
    }
    
    return (
      <div className="optimized-investigation-dashboard h-full flex flex-col">
        {/* Header */}
        <div className="dashboard-header p-4 border-b bg-white">
          <h1 className="text-2xl font-bold text-gray-900 mb-4">
            Investigation Dashboard
          </h1>
          
          {/* Controls */}
          <div className="flex gap-4 items-center">
            <div className="flex-1">
              <input
                type="text"
                placeholder="Search investigations..."
                onChange={handleSearchChange}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              />
            </div>
            
            <select
              value={filterStatus}
              onChange={handleFilterChange}
              className="px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            >
              <option value="all">All Status</option>
              <option value="pending">Pending</option>
              <option value="running">Running</option>
              <option value="completed">Completed</option>
              <option value="error">Error</option>
            </select>
            
            <button
              onClick={fetchInvestigations}
              disabled={loading}
              className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50"
            >
              {loading ? 'Loading...' : 'Refresh'}
            </button>
          </div>
          
          {/* Stats */}
          <div className="mt-4 grid grid-cols-3 gap-4 text-center">
            <div className="bg-gray-50 p-3 rounded">
              <div className="text-2xl font-bold text-gray-900">{investigations.length}</div>
              <div className="text-sm text-gray-600">Total</div>
            </div>
            <div className="bg-green-50 p-3 rounded">
              <div className="text-2xl font-bold text-green-800">
                {investigations.filter(i => i.status === 'SUCCESS').length}
              </div>
              <div className="text-sm text-green-600">Success</div>
            </div>
            <div className="bg-red-50 p-3 rounded">
              <div className="text-2xl font-bold text-red-800">
                {investigations.filter(i => i.status === 'FAILURE').length}
              </div>
              <div className="text-sm text-red-600">Failure</div>
            </div>
          </div>
        </div>
        
        {/* Main content */}
        <div className="dashboard-content flex-1 flex">
          {/* Investigation list */}
          <div className="investigation-list w-1/3 border-r bg-gray-50">
            {loading && investigations.length === 0 ? (
              <div className="p-4 text-center text-gray-500">Loading investigations...</div>
            ) : filteredInvestigations.length === 0 ? (
              <div className="p-4 text-center text-gray-500">No investigations found</div>
            ) : (
              <div {...containerProps} className="p-4">
                <div style={{ height: totalHeight, position: 'relative' }}>
                  {visibleInvestigations.map(({ item, index, style }) => (
                    <div key={item.id} style={style}>
                      <InvestigationCard
                        investigation={item}
                        onClick={handleInvestigationSelect}
                        isSelected={selectedInvestigation?.id === item.id}
                      />
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
          
          {/* Investigation details */}
          <div className="investigation-details flex-1 bg-white">
            {selectedInvestigation ? (
              <div className="p-6">
                <Suspense fallback={<div className="p-4">Loading charts...</div>}>
                  <InvestigationChart investigation={selectedInvestigation} />
                </Suspense>
                
                <Suspense fallback={<div className="p-4">Loading risk analysis...</div>}>
                  <RiskAnalysisPanel investigation={selectedInvestigation} />
                </Suspense>
                
                <Suspense fallback={<div className="p-4">Loading agent logs...</div>}>
                  <AgentExecutionLogs investigation={selectedInvestigation} />
                </Suspense>
              </div>
            ) : (
              <div className="flex items-center justify-center h-full text-gray-500">
                Select an investigation to view details
              </div>
            )}
          </div>
        </div>
        
        {/* Performance monitor (development only) */}
        <PerformanceMonitor onAlert={handlePerformanceAlert} />
      </div>
    );
  })
);

OptimizedInvestigationDashboard.displayName = 'OptimizedInvestigationDashboard';

export default OptimizedInvestigationDashboard;