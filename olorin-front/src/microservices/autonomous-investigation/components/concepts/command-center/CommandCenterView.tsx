/**
 * Command Center Concept View
 *
 * Mission control interface designed for investigation managers and team leads.
 * Features Kanban-style workflow management with system monitoring and team coordination.
 *
 * Target Users: Investigation managers, team leads
 * Visual Metaphor: NASA Mission Control
 *
 * @author Gil Klainert
 * @created 2025-01-22
 */

import React, { useCallback, useEffect, useState } from 'react';
import {
  Command,
  Monitor,
  Activity,
  AlertCircle,
  Users,
  Filter,
  Download,
  Plus,
  Clock,
  Target,
  TrendingUp,
  AlertTriangle,
  CheckCircle,
  XCircle,
  MoreVertical,
  Eye,
  Edit,
  Archive
} from 'lucide-react';

// Shared components
import { StatusBadge } from '../../shared/StatusBadge';
import { LoadingSpinner } from '../../shared/LoadingSpinner';
import { ErrorAlert } from '../../shared/ErrorAlert';

// Hooks and stores
import { useInvestigationQueries } from '../../../hooks/useInvestigationQueries';
import { useConceptStore } from '../../../stores/conceptStore';
import { useWebSocket } from '../../../hooks/useWebSocket';

// Types
import type { Investigation } from '../../../types';

interface InvestigationCard {
  id: string;
  entity: string;
  riskLevel: 'low' | 'medium' | 'high';
  riskScore?: number;
  assignee: string;
  status: 'initiation' | 'analysis' | 'review' | 'complete';
  updated: string;
  slaRisk?: boolean;
  priority: 'low' | 'medium' | 'high' | 'critical';
  duration: string;
  evidenceCount: number;
}

interface TeamMember {
  id: string;
  name: string;
  avatar: string;
  role: string;
  status: 'online' | 'away' | 'busy' | 'offline';
  activeInvestigations: number;
}

interface SystemMetrics {
  cpuUsage: number;
  memoryUsage: number;
  networkThroughput: number;
  activeConnections: number;
  investigationQueue: number;
  systemHealth: 'excellent' | 'good' | 'warning' | 'critical';
}

export const CommandCenterView: React.FC = () => {
  // Store hooks
  const { getActiveConfiguration } = useConceptStore();

  // Data hooks
  const {
    investigations,
    isLoading,
    error
  } = useInvestigationQueries();

  // WebSocket for real-time updates
  const { isConnected, lastMessage } = useWebSocket({
    url: 'ws://localhost:8090/ws/command-center',
    enabled: true
  });

  // Local state
  const [selectedFilter, setSelectedFilter] = useState<string>('all');
  const [draggedCard, setDraggedCard] = useState<string | null>(null);
  const [teamMembers] = useState<TeamMember[]>([
    { id: 'alice', name: 'Alice Johnson', avatar: 'AJ', role: 'Senior Analyst', status: 'online', activeInvestigations: 3 },
    { id: 'bob', name: 'Bob Smith', avatar: 'BS', role: 'Analyst', status: 'online', activeInvestigations: 2 },
    { id: 'carol', name: 'Carol Davis', avatar: 'CD', role: 'Lead Investigator', status: 'away', activeInvestigations: 1 },
  ]);

  const [systemMetrics] = useState<SystemMetrics>({
    cpuUsage: 23,
    memoryUsage: 67,
    networkThroughput: 1.2,
    activeConnections: 47,
    investigationQueue: 12,
    systemHealth: 'good'
  });

  // Mock investigation cards
  const [investigationCards] = useState<InvestigationCard[]>([
    {
      id: 'INV-125',
      entity: '95.2.1.1',
      riskLevel: 'high',
      assignee: 'alice',
      status: 'initiation',
      updated: '5m ago',
      priority: 'high',
      duration: '5m',
      evidenceCount: 0
    },
    {
      id: 'INV-123',
      entity: '95.2.1.146',
      riskLevel: 'high',
      riskScore: 0.85,
      assignee: 'bob',
      status: 'analysis',
      updated: '2h running',
      priority: 'critical',
      duration: '2h 15m',
      evidenceCount: 7
    },
    {
      id: 'INV-121',
      entity: '10.0.0.1',
      riskLevel: 'medium',
      riskScore: 0.65,
      assignee: 'carol',
      status: 'review',
      updated: 'Review due',
      slaRisk: true,
      priority: 'medium',
      duration: '4h 30m',
      evidenceCount: 12
    },
    {
      id: 'INV-119',
      entity: 'user@evil.com',
      riskLevel: 'low',
      riskScore: 0.95,
      assignee: 'alice',
      status: 'complete',
      updated: 'Exported',
      priority: 'low',
      duration: '6h 45m',
      evidenceCount: 15
    }
  ]);

  // Get concept configuration
  const config = getActiveConfiguration();

  // Kanban columns configuration
  const columns = [
    { key: 'initiation', title: 'INITIATION', color: 'blue', count: investigationCards.filter(c => c.status === 'initiation').length },
    { key: 'analysis', title: 'ANALYSIS', color: 'yellow', count: investigationCards.filter(c => c.status === 'analysis').length },
    { key: 'review', title: 'REVIEW', color: 'orange', count: investigationCards.filter(c => c.status === 'review').length },
    { key: 'complete', title: 'COMPLETE', color: 'green', count: investigationCards.filter(c => c.status === 'complete').length }
  ];

  // Calculate status counts
  const getStatusCounts = () => ({
    active: investigationCards.filter(c => c.status !== 'complete').length,
    slaRisk: investigationCards.filter(c => c.slaRisk).length,
    completed: investigationCards.filter(c => c.status === 'complete').length,
    blocked: investigationCards.filter(c => c.updated.includes('fail')).length
  });

  const statusCounts = getStatusCounts();

  // Handle card drag and drop
  const handleDragStart = useCallback((cardId: string) => {
    setDraggedCard(cardId);
  }, []);

  const handleDragEnd = useCallback(() => {
    setDraggedCard(null);
  }, []);

  const handleDrop = useCallback((newStatus: string) => {
    if (draggedCard) {
      // Update card status logic would go here
      console.log(`Moving card ${draggedCard} to ${newStatus}`);
      setDraggedCard(null);
    }
  }, [draggedCard]);

  // Render error state
  if (error) {
    return (
      <div className="p-6">
        <ErrorAlert
          title="Command Center Error"
          message={error.message}
          onRetry={() => window.location.reload()}
        />
      </div>
    );
  }

  return (
    <div className="flex flex-col h-screen bg-gray-50">
      {/* Command Center Header */}
      <header className="bg-white border-b border-gray-200 px-6 py-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <Command className="h-8 w-8 text-green-600" />
            <div>
              <h1 className="text-2xl font-bold text-gray-900">
                Olorin Investigation Command Center
              </h1>
              <p className="text-gray-600">
                Mission control for investigation management • Status: {isConnected ? 'Connected' : 'Disconnected'}
              </p>
            </div>
          </div>

          <div className="flex items-center space-x-4">
            {/* System Health Indicator */}
            <div className="flex items-center space-x-2 text-sm">
              <div className={`w-2 h-2 rounded-full ${
                systemMetrics.systemHealth === 'excellent' ? 'bg-green-500' :
                systemMetrics.systemHealth === 'good' ? 'bg-green-400' :
                systemMetrics.systemHealth === 'warning' ? 'bg-yellow-500' : 'bg-red-500'
              }`} />
              <span className="text-gray-600">System: {systemMetrics.systemHealth}</span>
            </div>

            {/* Action Buttons */}
            <button className="px-3 py-2 text-sm bg-gray-100 hover:bg-gray-200 rounded-md flex items-center space-x-2">
              <Filter className="h-4 w-4" />
              <span>Filter</span>
            </button>

            <button className="px-3 py-2 text-sm bg-gray-100 hover:bg-gray-200 rounded-md flex items-center space-x-2">
              <Users className="h-4 w-4" />
              <span>Team</span>
            </button>

            <button className="px-3 py-2 text-sm bg-gray-100 hover:bg-gray-200 rounded-md flex items-center space-x-2">
              <Download className="h-4 w-4" />
              <span>Export</span>
            </button>
          </div>
        </div>

        {/* KPI Dashboard */}
        <div className="mt-4 grid grid-cols-4 gap-6">
          <div className="flex items-center space-x-3">
            <div className="p-2 bg-blue-100 rounded-lg">
              <Activity className="h-5 w-5 text-blue-600" />
            </div>
            <div>
              <div className="text-lg font-semibold text-gray-900">{statusCounts.active}</div>
              <div className="text-sm text-gray-600">Active Investigations</div>
            </div>
          </div>

          <div className="flex items-center space-x-3">
            <div className="p-2 bg-yellow-100 rounded-lg">
              <Clock className="h-5 w-5 text-yellow-600" />
            </div>
            <div>
              <div className="text-lg font-semibold text-orange-600">{statusCounts.slaRisk}</div>
              <div className="text-sm text-gray-600">SLA Risk</div>
            </div>
          </div>

          <div className="flex items-center space-x-3">
            <div className="p-2 bg-green-100 rounded-lg">
              <Target className="h-5 w-5 text-green-600" />
            </div>
            <div>
              <div className="text-lg font-semibold text-green-600">{statusCounts.completed}</div>
              <div className="text-sm text-gray-600">Completed</div>
            </div>
          </div>

          <div className="flex items-center space-x-3">
            <div className="p-2 bg-red-100 rounded-lg">
              <AlertTriangle className="h-5 w-5 text-red-600" />
            </div>
            <div>
              <div className="text-lg font-semibold text-red-600">{statusCounts.blocked}</div>
              <div className="text-sm text-gray-600">Blocked</div>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <div className="flex-1 flex">
        {/* Kanban Board */}
        <main className="flex-1 p-6">
          <div className="grid grid-cols-4 gap-6 h-full">
            {columns.map((column) => (
              <KanbanColumn
                key={column.key}
                title={column.title}
                count={column.count}
                color={column.color}
                investigations={investigationCards.filter(c => c.status === column.key)}
                teamMembers={teamMembers}
                onCardDragStart={handleDragStart}
                onCardDragEnd={handleDragEnd}
                onDrop={() => handleDrop(column.key)}
              />
            ))}
          </div>
        </main>

        {/* Command Control Panel */}
        <aside className="w-80 bg-white border-l border-gray-200 overflow-y-auto">
          <div className="p-6">
            {/* System Status */}
            <div className="mb-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
                <Monitor className="h-5 w-5 mr-2 text-green-600" />
                System Status
              </h3>

              <div className="space-y-4">
                <div className="bg-gray-50 rounded-lg p-4">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm font-medium text-gray-700">CPU Usage</span>
                    <span className="text-sm text-gray-900">{systemMetrics.cpuUsage}%</span>
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-2">
                    <div
                      className="bg-blue-500 h-2 rounded-full transition-all duration-300"
                      style={{ width: `${systemMetrics.cpuUsage}%` }}
                    />
                  </div>
                </div>

                <div className="bg-gray-50 rounded-lg p-4">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm font-medium text-gray-700">Memory</span>
                    <span className="text-sm text-gray-900">{systemMetrics.memoryUsage}%</span>
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-2">
                    <div
                      className={`h-2 rounded-full transition-all duration-300 ${
                        systemMetrics.memoryUsage > 80 ? 'bg-red-500' :
                        systemMetrics.memoryUsage > 60 ? 'bg-yellow-500' : 'bg-green-500'
                      }`}
                      style={{ width: `${systemMetrics.memoryUsage}%` }}
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3 text-sm">
                  <div>
                    <div className="text-gray-600">Network</div>
                    <div className="font-medium">{systemMetrics.networkThroughput} Gbps</div>
                  </div>
                  <div>
                    <div className="text-gray-600">Connections</div>
                    <div className="font-medium">{systemMetrics.activeConnections}</div>
                  </div>
                </div>
              </div>
            </div>

            {/* Team Status */}
            <div className="mb-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
                <Users className="h-5 w-5 mr-2 text-green-600" />
                Team Status
              </h3>

              <div className="space-y-3">
                {teamMembers.map((member) => (
                  <div key={member.id} className="flex items-center space-x-3 p-3 bg-gray-50 rounded-lg">
                    <div className="relative">
                      <div className="w-8 h-8 bg-blue-500 rounded-full flex items-center justify-center text-white text-sm font-medium">
                        {member.avatar}
                      </div>
                      <div className={`absolute -bottom-1 -right-1 w-3 h-3 rounded-full border-2 border-white ${
                        member.status === 'online' ? 'bg-green-500' :
                        member.status === 'away' ? 'bg-yellow-500' :
                        member.status === 'busy' ? 'bg-red-500' : 'bg-gray-500'
                      }`} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="text-sm font-medium text-gray-900 truncate">{member.name}</div>
                      <div className="text-xs text-gray-600">{member.activeInvestigations} active</div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Quick Actions */}
            <div>
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Quick Actions</h3>
              <div className="space-y-3">
                <button className="w-full px-4 py-3 bg-green-600 hover:bg-green-700 text-white rounded-lg flex items-center justify-center space-x-2">
                  <Plus className="h-4 w-4" />
                  <span>New Investigation</span>
                </button>
                <button className="w-full px-4 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-lg flex items-center justify-center space-x-2">
                  <TrendingUp className="h-4 w-4" />
                  <span>Generate Report</span>
                </button>
                <button className="w-full px-4 py-3 bg-gray-600 hover:bg-gray-700 text-white rounded-lg flex items-center justify-center space-x-2">
                  <Monitor className="h-4 w-4" />
                  <span>System Diagnostics</span>
                </button>
              </div>
            </div>
          </div>
        </aside>
      </div>
    </div>
  );
};

// Kanban Column Component
interface KanbanColumnProps {
  title: string;
  count: number;
  color: string;
  investigations: InvestigationCard[];
  teamMembers: TeamMember[];
  onCardDragStart: (cardId: string) => void;
  onCardDragEnd: () => void;
  onDrop: () => void;
}

const KanbanColumn: React.FC<KanbanColumnProps> = ({
  title,
  count,
  color,
  investigations,
  teamMembers,
  onCardDragStart,
  onCardDragEnd,
  onDrop
}) => {
  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    onDrop();
  };

  return (
    <div
      className="bg-white rounded-lg shadow-sm border border-gray-200 h-full flex flex-col"
      onDragOver={handleDragOver}
      onDrop={handleDrop}
    >
      {/* Column Header */}
      <div className="p-4 border-b border-gray-200">
        <div className="flex items-center justify-between">
          <h3 className="font-semibold text-gray-700">{title}</h3>
          <span className={`px-2 py-1 text-xs rounded-full bg-${color}-100 text-${color}-800`}>
            {count}
          </span>
        </div>
      </div>

      {/* Column Content */}
      <div className="flex-1 p-4 space-y-3 overflow-y-auto">
        {investigations.length > 0 ? (
          investigations.map((investigation) => (
            <InvestigationCard
              key={investigation.id}
              investigation={investigation}
              teamMembers={teamMembers}
              onDragStart={() => onCardDragStart(investigation.id)}
              onDragEnd={onCardDragEnd}
            />
          ))
        ) : (
          <div className="text-center py-8 text-gray-400">
            <div className="text-sm">No investigations</div>
            <button className="mt-2 text-blue-600 hover:text-blue-800 text-sm flex items-center justify-center space-x-1">
              <Plus className="h-3 w-3" />
              <span>Add Investigation</span>
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

// Investigation Card Component
interface InvestigationCardProps {
  investigation: InvestigationCard;
  teamMembers: TeamMember[];
  onDragStart: () => void;
  onDragEnd: () => void;
}

const InvestigationCard: React.FC<InvestigationCardProps> = ({
  investigation,
  teamMembers,
  onDragStart,
  onDragEnd
}) => {
  const assignedMember = teamMembers.find(m => m.id === investigation.assignee);

  const getRiskColor = (level: string) => {
    switch (level) {
      case 'high': return 'text-red-600 bg-red-50 border-red-200';
      case 'medium': return 'text-yellow-600 bg-yellow-50 border-yellow-200';
      case 'low': return 'text-green-600 bg-green-50 border-green-200';
      default: return 'text-gray-600 bg-gray-50 border-gray-200';
    }
  };

  const getPriorityIcon = (priority: string) => {
    switch (priority) {
      case 'critical': return '🔴';
      case 'high': return '🟠';
      case 'medium': return '🟡';
      case 'low': return '🟢';
      default: return '⚪';
    }
  };

  return (
    <div
      className="p-3 bg-white border border-gray-200 rounded-lg shadow-sm hover:shadow-md transition-shadow cursor-move"
      draggable
      onDragStart={onDragStart}
      onDragEnd={onDragEnd}
    >
      <div className="space-y-3">
        {/* Header */}
        <div className="flex items-start justify-between">
          <div className="flex items-center space-x-2">
            <span className="text-sm font-medium text-gray-900">{investigation.id}</span>
            {investigation.slaRisk && (
              <AlertTriangle className="h-4 w-4 text-orange-500" />
            )}
          </div>
          <button className="text-gray-400 hover:text-gray-600">
            <MoreVertical className="h-4 w-4" />
          </button>
        </div>

        {/* Entity */}
        <div className="text-sm text-gray-600 truncate">
          {investigation.entity}
        </div>

        {/* Risk and Priority */}
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <span className="text-sm">{getPriorityIcon(investigation.priority)}</span>
            {investigation.riskScore ? (
              <span className={`px-2 py-1 text-xs rounded-full border ${getRiskColor(investigation.riskLevel)}`}>
                {investigation.riskScore.toFixed(2)}
              </span>
            ) : (
              <span className={`px-2 py-1 text-xs rounded-full border ${getRiskColor(investigation.riskLevel)}`}>
                {investigation.riskLevel}
              </span>
            )}
          </div>

          <div className="text-xs text-gray-500">
            {investigation.evidenceCount} evidence
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between pt-2 border-t border-gray-100">
          <div className="flex items-center space-x-2">
            {assignedMember && (
              <div className="w-6 h-6 bg-blue-500 rounded-full flex items-center justify-center text-white text-xs">
                {assignedMember.avatar}
              </div>
            )}
            <span className="text-xs text-gray-500">@{investigation.assignee}</span>
          </div>
          <div className="text-xs text-gray-400">
            {investigation.duration}
          </div>
        </div>
      </div>
    </div>
  );
};
