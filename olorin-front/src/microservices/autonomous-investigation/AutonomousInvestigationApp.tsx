import React, { useState, useEffect } from 'react';
import { Routes, Route, useNavigate, useLocation } from 'react-router-dom';
import { useEventBus } from '../shared/services/EventBus';
import { useWebSocket } from '../shared/services/WebSocketService';
import { InvestigationDashboard } from './components/InvestigationDashboard';
import { CreateInvestigation } from './components/CreateInvestigation';
import { InvestigationDetails } from './components/InvestigationDetails';
import { InvestigationList } from './components/InvestigationList';
import { AgentConfiguration } from './components/AgentConfiguration';
import { LoadingSpinner } from '../core-ui/components/LoadingSpinner';
import { Investigation, InvestigationStatus, AIAgent } from './types/investigation';

export const AutonomousInvestigationApp: React.FC = () => {
  const [investigations, setInvestigations] = useState<Investigation[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const navigate = useNavigate();
  const location = useLocation();
  const eventBus = useEventBus();
  const { send: sendWebSocketMessage } = useWebSocket();

  // Load investigations on mount
  useEffect(() => {
    loadInvestigations();
  }, []);

  // Listen for real-time investigation updates
  useEffect(() => {
    const handleInvestigationUpdate = (event: any) => {
      setInvestigations(prev =>
        prev.map(inv =>
          inv.id === event.id ? { ...inv, ...event.data } : inv
        )
      );
    };

    const handleInvestigationCreated = (event: any) => {
      if (event.type === 'autonomous') {
        loadInvestigations(); // Refresh list
      }
    };

    const handleInvestigationCompleted = (event: any) => {
      setInvestigations(prev =>
        prev.map(inv =>
          inv.id === event.id
            ? { ...inv, status: 'completed', results: event.results, completedAt: new Date().toISOString() }
            : inv
        )
      );

      // Show notification
      eventBus.emit('system:notification', {
        type: 'success',
        message: `Autonomous investigation ${event.id} completed successfully`,
        duration: 5000,
      });
    };

    const handleInvestigationError = (event: any) => {
      setInvestigations(prev =>
        prev.map(inv =>
          inv.id === event.id
            ? { ...inv, status: 'failed', error: event.error }
            : inv
        )
      );

      // Show error notification
      eventBus.emit('system:notification', {
        type: 'error',
        message: `Investigation ${event.id} failed: ${event.error}`,
        persistent: true,
      });
    };

    eventBus.on('investigation:updated', handleInvestigationUpdate);
    eventBus.on('investigation:created', handleInvestigationCreated);
    eventBus.on('investigation:completed', handleInvestigationCompleted);
    eventBus.on('investigation:error', handleInvestigationError);

    return () => {
      eventBus.off('investigation:updated', handleInvestigationUpdate);
      eventBus.off('investigation:created', handleInvestigationCreated);
      eventBus.off('investigation:completed', handleInvestigationCompleted);
      eventBus.off('investigation:error', handleInvestigationError);
    };
  }, [eventBus]);

  const loadInvestigations = async () => {
    try {
      setIsLoading(true);
      setError(null);

      // TODO: Replace with actual API call
      const mockInvestigations: Investigation[] = [
        {
          id: 'inv-001',
          title: 'Suspicious Transaction Analysis',
          description: 'Analyzing unusual transaction patterns from user account 12345',
          type: 'autonomous',
          status: 'running',
          priority: 'high',
          createdAt: '2024-01-15T10:00:00Z',
          updatedAt: '2024-01-15T10:30:00Z',
          createdBy: 'system',
          assignedAgents: ['device-analyzer', 'network-analyzer'],
          configuration: {
            agents: [
              { id: 'device-analyzer', enabled: true, config: { sensitivity: 'high' } },
              { id: 'network-analyzer', enabled: true, config: { depth: 'full' } },
            ],
            parameters: {
              timeRange: '7d',
              threshold: 0.8,
              includeHistorical: true,
            },
          },
          progress: {
            overall: 65,
            agents: [
              { agentId: 'device-analyzer', progress: 80, status: 'running', message: 'Analyzing device fingerprints' },
              { agentId: 'network-analyzer', progress: 50, status: 'running', message: 'Scanning network patterns' },
            ],
          },
          metadata: {
            accountId: '12345',
            transactionCount: 156,
            riskScore: 0.72,
          },
        },
        {
          id: 'inv-002',
          title: 'Account Takeover Detection',
          description: 'Investigating potential account takeover for premium user',
          type: 'autonomous',
          status: 'completed',
          priority: 'critical',
          createdAt: '2024-01-14T14:00:00Z',
          updatedAt: '2024-01-14T16:45:00Z',
          completedAt: '2024-01-14T16:45:00Z',
          createdBy: 'system',
          assignedAgents: ['device-analyzer', 'location-analyzer', 'behavior-analyzer'],
          configuration: {
            agents: [
              { id: 'device-analyzer', enabled: true, config: { sensitivity: 'medium' } },
              { id: 'location-analyzer', enabled: true, config: { radiusKm: 50 } },
              { id: 'behavior-analyzer', enabled: true, config: { lookbackDays: 30 } },
            ],
            parameters: {
              timeRange: '24h',
              threshold: 0.9,
              includeHistorical: false,
            },
          },
          progress: {
            overall: 100,
            agents: [
              { agentId: 'device-analyzer', progress: 100, status: 'completed', message: 'Device analysis complete' },
              { agentId: 'location-analyzer', progress: 100, status: 'completed', message: 'Location analysis complete' },
              { agentId: 'behavior-analyzer', progress: 100, status: 'completed', message: 'Behavior analysis complete' },
            ],
          },
          results: {
            summary: 'High-risk account takeover detected',
            riskScore: 0.95,
            confidence: 0.88,
            findings: [
              'Device fingerprint mismatch (95% confidence)',
              'Location anomaly detected (80% confidence)',
              'Behavioral pattern deviation (70% confidence)',
            ],
            recommendations: [
              'Immediately suspend account access',
              'Require multi-factor authentication',
              'Contact user for verification',
            ],
          },
          metadata: {
            accountId: '67890',
            userId: 'premium-user-456',
            riskScore: 0.95,
          },
        },
      ];

      // Simulate API delay
      await new Promise(resolve => setTimeout(resolve, 1000));

      setInvestigations(mockInvestigations);
    } catch (err) {
      setError('Failed to load investigations');
      console.error('Error loading investigations:', err);
    } finally {
      setIsLoading(false);
    }
  };

  const createInvestigation = async (investigationData: Partial<Investigation>) => {
    try {
      const newInvestigation: Investigation = {
        id: `inv-${Date.now()}`,
        title: investigationData.title || 'New Investigation',
        description: investigationData.description || '',
        type: 'autonomous',
        status: 'pending',
        priority: investigationData.priority || 'medium',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        createdBy: 'user', // TODO: Get from auth context
        assignedAgents: investigationData.assignedAgents || [],
        configuration: investigationData.configuration || {
          agents: [],
          parameters: {},
        },
        progress: {
          overall: 0,
          agents: [],
        },
        metadata: investigationData.metadata || {},
      };

      // TODO: Replace with actual API call
      setInvestigations(prev => [newInvestigation, ...prev]);

      // Emit event for notification
      eventBus.emit('investigation:created', {
        id: newInvestigation.id,
        type: 'autonomous',
      });

      // Send WebSocket message to start investigation
      sendWebSocketMessage({
        type: 'investigation:start',
        payload: {
          investigationId: newInvestigation.id,
          configuration: newInvestigation.configuration,
        },
        timestamp: new Date().toISOString(),
      });

      return newInvestigation;
    } catch (err) {
      throw new Error('Failed to create investigation');
    }
  };

  const updateInvestigation = async (id: string, updates: Partial<Investigation>) => {
    try {
      // TODO: Replace with actual API call
      setInvestigations(prev =>
        prev.map(inv =>
          inv.id === id
            ? { ...inv, ...updates, updatedAt: new Date().toISOString() }
            : inv
        )
      );

      // Emit update event
      eventBus.emit('investigation:updated', {
        id,
        status: updates.status,
        data: updates,
      });
    } catch (err) {
      throw new Error('Failed to update investigation');
    }
  };

  const deleteInvestigation = async (id: string) => {
    try {
      // TODO: Replace with actual API call
      setInvestigations(prev => prev.filter(inv => inv.id !== id));

      // Send WebSocket message to stop investigation if running
      sendWebSocketMessage({
        type: 'investigation:stop',
        payload: { investigationId: id },
        timestamp: new Date().toISOString(),
      });
    } catch (err) {
      throw new Error('Failed to delete investigation');
    }
  };

  const startInvestigation = async (id: string) => {
    await updateInvestigation(id, { status: 'running' });

    sendWebSocketMessage({
      type: 'investigation:start',
      payload: { investigationId: id },
      timestamp: new Date().toISOString(),
    });
  };

  const stopInvestigation = async (id: string) => {
    await updateInvestigation(id, { status: 'stopped' });

    sendWebSocketMessage({
      type: 'investigation:stop',
      payload: { investigationId: id },
      timestamp: new Date().toISOString(),
    });
  };

  if (error) {
    return (
      <div className="p-6">
        <div className="bg-red-50 border border-red-200 rounded-md p-4">
          <div className="text-red-800">
            <h3 className="font-medium">Error</h3>
            <p className="mt-1 text-sm">{error}</p>
            <button
              onClick={loadInvestigations}
              className="mt-3 text-sm bg-red-100 hover:bg-red-200 px-3 py-1 rounded"
            >
              Retry
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="h-full bg-gray-50">
      <Routes>
        <Route
          path="/"
          element={
            <InvestigationDashboard
              investigations={investigations}
              isLoading={isLoading}
              onRefresh={loadInvestigations}
              onCreateInvestigation={() => navigate('/autonomous/create')}
              onViewInvestigation={(id) => navigate(`/autonomous/${id}`)}
            />
          }
        />
        <Route
          path="/list"
          element={
            <InvestigationList
              investigations={investigations}
              isLoading={isLoading}
              onRefresh={loadInvestigations}
              onCreateInvestigation={() => navigate('/autonomous/create')}
              onViewInvestigation={(id) => navigate(`/autonomous/${id}`)}
              onDeleteInvestigation={deleteInvestigation}
            />
          }
        />
        <Route
          path="/create"
          element={
            <CreateInvestigation
              onCreateInvestigation={createInvestigation}
              onCancel={() => navigate('/autonomous')}
            />
          }
        />
        <Route
          path="/agents"
          element={
            <AgentConfiguration
              onSave={() => navigate('/autonomous')}
              onCancel={() => navigate('/autonomous')}
            />
          }
        />
        <Route
          path="/:id"
          element={
            <InvestigationDetails
              investigations={investigations}
              onUpdateInvestigation={updateInvestigation}
              onStartInvestigation={startInvestigation}
              onStopInvestigation={stopInvestigation}
              onDeleteInvestigation={deleteInvestigation}
              onBack={() => navigate('/autonomous')}
            />
          }
        />
      </Routes>
    </div>
  );
};

export default AutonomousInvestigationApp;