import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  PlusIcon,
  ArrowPathIcon,
  ChartBarIcon,
  ClockIcon,
  CheckCircleIcon,
  XCircleIcon,
  PauseCircleIcon,
  ArrowTrendingUpIcon,
  ArrowTrendingDownIcon,
  ChevronDownIcon,
} from '@heroicons/react/24/outline';
import { CreateInvestigationModal } from './CreateInvestigationModal';
import { EnhancedCreateInvestigationModal } from './EnhancedCreateInvestigationModal';
import { InvestigationStats } from './InvestigationStats';
import { SimpleInvestigationStatusBadge } from './SimpleInvestigationStatusBadge';
import { SimpleInvestigationPriorityBadge } from './SimpleInvestigationPriorityBadge';
import { RiskScoreDisplay } from './RiskScoreDisplay';
import { LiveMetricsDisplay } from './LiveMetricsDisplay';

interface Investigation {
  id: string;
  title: string;
  status: 'active' | 'completed' | 'paused';
  priority: 'low' | 'medium' | 'high';
  created_at: string;
  description: string;
  riskScore?: number;
  progress?: number;
  assignedAgents?: string[];
  updatedAt?: string;
}

interface StatusCardProps {
  status: 'active' | 'completed' | 'paused';
  count: number;
  total: number;
}

const StatusCard: React.FC<StatusCardProps> = ({ status, count, total }) => {
  const getStatusConfig = () => {
    switch (status) {
      case 'active':
        return {
          title: 'Active',
          icon: ArrowPathIcon,
          bg: 'bg-blue-50',
          text: 'text-blue-700',
          border: 'border-blue-200',
          iconColor: 'text-blue-500',
        };
      case 'completed':
        return {
          title: 'Completed',
          icon: CheckCircleIcon,
          bg: 'bg-green-50',
          text: 'text-green-700',
          border: 'border-green-200',
          iconColor: 'text-green-500',
        };
      case 'paused':
        return {
          title: 'Paused',
          icon: PauseCircleIcon,
          bg: 'bg-yellow-50',
          text: 'text-yellow-700',
          border: 'border-yellow-200',
          iconColor: 'text-yellow-500',
        };
      default:
        return {
          title: status.charAt(0).toUpperCase() + status.slice(1),
          icon: ChartBarIcon,
          bg: 'bg-gray-50',
          text: 'text-gray-700',
          border: 'border-gray-200',
          iconColor: 'text-gray-500',
        };
    }
  };

  const config = getStatusConfig();
  const percentage = total > 0 ? Math.round((count / total) * 100) : 0;

  return (
    <div className={`${config.bg} ${config.border} border rounded-lg p-4`}>
      <div className="flex items-center justify-between">
        <div>
          <p className={`text-sm font-medium ${config.text}`}>{config.title}</p>
          <p className="text-2xl font-semibold text-gray-900">{count}</p>
          <p className="text-xs text-gray-500">{percentage}% of total</p>
        </div>
        <config.icon className={`h-8 w-8 ${config.iconColor}`} />
      </div>
    </div>
  );
};

interface SimpleInvestigationDashboardProps {
  className?: string;
}

export const SimpleInvestigationDashboard: React.FC<SimpleInvestigationDashboardProps> = ({
  className = ''
}) => {
  const navigate = useNavigate();
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [isEnhancedModalOpen, setIsEnhancedModalOpen] = useState(false);
  const [isCreateDropdownOpen, setIsCreateDropdownOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsCreateDropdownOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);
  const [isLoading, setIsLoading] = useState(false);
  const [lastUpdate, setLastUpdate] = useState<Date>(new Date());

  const handleRefresh = () => {
    setIsLoading(true);
    // Simulate refresh delay
    setTimeout(() => {
      setLastUpdate(new Date());
      setIsLoading(false);
    }, 1000);
  };

  // Mock data for demonstration
  const [investigations, setInvestigations] = useState<Investigation[]>([
    {
      id: '1',
      title: 'Suspicious Transaction Pattern',
      status: 'active',
      priority: 'high',
      created_at: '2024-01-22T10:30:00Z',
      description: 'Multiple high-value transactions from unusual locations',
      riskScore: 87,
      progress: 65,
      assignedAgents: ['device-analyzer', 'location-analyzer'],
      updatedAt: '2024-01-22T11:15:00Z'
    },
    {
      id: '2',
      title: 'Account Takeover Attempt',
      status: 'active',
      priority: 'medium',
      created_at: '2024-01-22T09:15:00Z',
      description: 'Failed login attempts followed by password reset requests',
      riskScore: 64,
      progress: 80,
      assignedAgents: ['behavior-analyzer', 'network-analyzer'],
      updatedAt: '2024-01-22T10:45:00Z'
    },
    {
      id: '3',
      title: 'Identity Verification Fraud',
      status: 'completed',
      priority: 'low',
      created_at: '2024-01-21T14:45:00Z',
      description: 'Fraudulent documents submitted during KYC process',
      riskScore: 32,
      progress: 100,
      assignedAgents: ['document-analyzer'],
      updatedAt: '2024-01-21T16:30:00Z'
    }
  ]);


  const handleCreateInvestigation = (investigationData: any) => {
    console.log('Creating investigation with data:', investigationData);

    const newInvestigation: Investigation = {
      id: String(investigations.length + 1),
      title: investigationData.title || investigationData.name || 'Untitled Investigation',
      status: 'active',
      priority: investigationData.priority || 'medium',
      created_at: new Date().toISOString(),
      description: investigationData.description || '',
      riskScore: Math.floor(Math.random() * 100) + 1 // Generate random risk score between 1-100
    };

    console.log('New investigation created:', newInvestigation);

    setInvestigations(prev => [newInvestigation, ...prev]);
    setIsCreateModalOpen(false);

    // Show success notification
    if (typeof window !== 'undefined' && (window as any).addNotification) {
      (window as any).addNotification({
        type: 'success',
        title: 'Investigation Created',
        message: `Successfully created "${newInvestigation.title}" with ${newInvestigation.priority} priority`,
        autoClose: true,
        duration: 4000
      });
    }
  };

  const handleEnhancedCreateInvestigation = (investigationData: any) => {
    console.log('Creating enhanced investigation with data:', investigationData);

    const newInvestigation: Investigation = {
      id: String(investigations.length + 1),
      title: investigationData.title || investigationData.name || 'Untitled Investigation',
      status: 'active',
      priority: investigationData.priority || 'medium',
      created_at: new Date().toISOString(),
      description: investigationData.description || '',
      riskScore: Math.floor(Math.random() * 100) + 1,
      assignedAgents: investigationData.assignedAgents || []
    };

    console.log('New enhanced investigation created:', newInvestigation);

    setInvestigations(prev => [newInvestigation, ...prev]);
    setIsEnhancedModalOpen(false);

    // Show success notification
    if (typeof window !== 'undefined' && (window as any).addNotification) {
      (window as any).addNotification({
        type: 'success',
        title: 'Investigation Created',
        message: `Successfully created "${newInvestigation.title}" with ${newInvestigation.priority} priority and ${investigationData.assignedAgents?.length || 0} assigned agents`,
        autoClose: true,
        duration: 4000
      });
    }
  };

  const getStatusCounts = () => {
    const counts = {
      active: 0,
      completed: 0,
      paused: 0,
    };

    investigations.forEach(inv => {
      counts[inv.status] = (counts[inv.status] || 0) + 1;
    });

    return counts;
  };

  const getRecentInvestigations = () => {
    return investigations
      .sort((a, b) => new Date(b.updatedAt || b.created_at).getTime() - new Date(a.updatedAt || a.created_at).getTime())
      .slice(0, 6);
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diff = now.getTime() - date.getTime();

    if (diff < 60000) return 'Just now';
    if (diff < 3600000) return `${Math.floor(diff / 60000)}m ago`;
    if (diff < 86400000) return `${Math.floor(diff / 3600000)}h ago`;
    return date.toLocaleDateString();
  };

  const totalInvestigations = investigations.length;
  const activeInvestigations = investigations.filter(inv => inv.status === 'active').length;
  const completedInvestigations = investigations.filter(inv => inv.status === 'completed').length;
  const statusCounts = getStatusCounts();
  const recentInvestigations = getRecentInvestigations();

  // Calculate avg resolution time (mock calculation for now)
  const avgResolutionTime = 48; // 48 hours as default

  // Calculate success rate (completed vs total)
  const successRate = totalInvestigations > 0 ? completedInvestigations / totalInvestigations : 0;

  return (
    <div className={`p-6 space-y-6 ${className}`}>
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Manual Investigations</h1>
          <p className="text-gray-600">Human-guided fraud detection and analysis</p>
        </div>
        <div className="flex items-center space-x-3">
          <button
            onClick={handleRefresh}
            disabled={isLoading}
            className="inline-flex items-center px-3 py-2 border border-gray-300 shadow-sm text-sm leading-4 font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50"
          >
            <ArrowPathIcon className={`h-4 w-4 mr-2 ${isLoading ? 'animate-spin' : ''}`} />
            Refresh
          </button>
          <div className="relative" ref={dropdownRef}>
            <button
              onClick={() => setIsCreateDropdownOpen(!isCreateDropdownOpen)}
              className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
            >
              <PlusIcon className="h-4 w-4 mr-2" />
              New Investigation
              <ChevronDownIcon className="h-4 w-4 ml-2" />
            </button>

            {isCreateDropdownOpen && (
              <div className="absolute right-0 mt-2 w-56 rounded-md shadow-lg bg-white ring-1 ring-black ring-opacity-5 z-50">
                <div className="py-1" role="menu">
                  <button
                    onClick={() => {
                      setIsCreateModalOpen(true);
                      setIsCreateDropdownOpen(false);
                    }}
                    className="flex items-center w-full px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
                    role="menuitem"
                  >
                    <PlusIcon className="h-4 w-4 mr-3 text-blue-500" />
                    <div className="text-left">
                      <div className="font-medium">Quick Create</div>
                      <div className="text-xs text-gray-500">Simple investigation setup</div>
                    </div>
                  </button>
                  <button
                    onClick={() => {
                      setIsEnhancedModalOpen(true);
                      setIsCreateDropdownOpen(false);
                    }}
                    className="flex items-center w-full px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
                    role="menuitem"
                  >
                    <ChartBarIcon className="h-4 w-4 mr-3 text-green-500" />
                    <div className="text-left">
                      <div className="font-medium">Detailed Setup</div>
                      <div className="text-xs text-gray-500">Advanced configuration wizard</div>
                    </div>
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {isLoading ? (
        <div className="flex items-center justify-center py-12">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
          <p className="ml-3 text-sm text-gray-600">Loading investigations...</p>
        </div>
      ) : (
        <>
          {/* Status Overview */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <StatusCard status="active" count={statusCounts.active} total={investigations.length} />
            <StatusCard status="completed" count={statusCounts.completed} total={investigations.length} />
            <StatusCard status="paused" count={statusCounts.paused} total={investigations.length} />
          </div>

          {/* Quick Stats */}
          <div className="bg-white rounded-lg border border-gray-200 p-6">
            <h2 className="text-lg font-medium text-gray-900 mb-4">Quick Stats</h2>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div>
                <p className="text-sm font-medium text-gray-600">Total Investigations</p>
                <p className="text-2xl font-semibold text-gray-900">{investigations.length}</p>
              </div>
              <div>
                <p className="text-sm font-medium text-gray-600">Active Investigations</p>
                <p className="text-2xl font-semibold text-blue-600">{activeInvestigations}</p>
              </div>
              <div>
                <p className="text-sm font-medium text-gray-600">Success Rate</p>
                <p className="text-2xl font-semibold text-green-600">
                  {investigations.length > 0
                    ? Math.round((statusCounts.completed / investigations.length) * 100)
                    : 0}%
                </p>
              </div>
            </div>
          </div>

          {/* Live Metrics */}
          <div className="bg-white rounded-lg border border-gray-200 p-6">
            <LiveMetricsDisplay investigations={investigations} />
          </div>

          {/* Investigation Statistics */}
          <InvestigationStats
            totalInvestigations={totalInvestigations}
            activeInvestigations={activeInvestigations}
            completedInvestigations={completedInvestigations}
            avgResolutionTime={avgResolutionTime}
            successRate={successRate}
            className="bg-white rounded-lg border border-gray-200 p-6"
          />

          {/* Recent Investigations */}
          <div className="bg-white rounded-lg border border-gray-200 p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-medium text-gray-900">Recent Investigations</h2>
              <div className="flex items-center space-x-4">
                <span className="text-xs text-gray-500">
                  Updated {lastUpdate.toLocaleTimeString()}
                </span>
                <button
                  onClick={() => navigate('/investigations/list')}
                  className="text-sm text-blue-600 hover:text-blue-800"
                >
                  View all →
                </button>
              </div>
            </div>

            {recentInvestigations.length > 0 ? (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {recentInvestigations.map((investigation) => (
                  <div
                    key={investigation.id}
                    className="bg-white border border-gray-200 rounded-lg p-4 hover:border-blue-300 hover:shadow-sm transition-all duration-150 cursor-pointer"
                    onClick={() => navigate(`/investigations/detail/${investigation.id}`)}
                  >
                    <div className="flex items-start justify-between mb-2">
                      <div className="flex-1 min-w-0">
                        <h4 className="font-medium text-gray-900 truncate">{investigation.title}</h4>
                        <p className="text-sm text-gray-600 line-clamp-2 mt-1">{investigation.description}</p>
                      </div>
                      <div className="ml-4 flex flex-col items-end space-y-1">
                        <SimpleInvestigationStatusBadge status={investigation.status} />
                        <SimpleInvestigationPriorityBadge priority={investigation.priority} />
                      </div>
                    </div>

                    <div className="flex items-center justify-between text-xs text-gray-500 mb-3">
                      <div className="flex items-center space-x-4">
                        <span>ID: {investigation.id}</span>
                        <span>{investigation.assignedAgents?.length || 0} agents</span>
                        {investigation.progress && (
                          <span>{investigation.progress}% complete</span>
                        )}
                      </div>
                      <span>{formatDate(investigation.updatedAt || investigation.created_at)}</span>
                    </div>

                    {/* Risk Score Display */}
                    {investigation.riskScore && (
                      <div className="flex items-center justify-between mb-3">
                        <span className="text-sm font-medium text-gray-700">Risk Score</span>
                        <RiskScoreDisplay
                          score={investigation.riskScore}
                          size="sm"
                          showLabel={false}
                          className="flex-shrink-0"
                        />
                      </div>
                    )}

                    {investigation.status === 'active' && investigation.progress && (
                      <div className="mt-3">
                        <div className="flex items-center justify-between text-xs text-gray-600 mb-1">
                          <span>Progress</span>
                          <span>{investigation.progress}%</span>
                        </div>
                        <div className="w-full bg-gray-200 rounded-full h-2">
                          <div
                            className="bg-blue-600 h-2 rounded-full transition-all duration-300"
                            style={{ width: `${investigation.progress}%` }}
                          />
                        </div>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-6">
                <ChartBarIcon className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                <h3 className="text-lg font-medium text-gray-900 mb-2">No investigations yet</h3>
                <p className="text-gray-600 mb-4">Create your first manual investigation to get started.</p>
                <div className="flex space-x-3">
                  <button
                    onClick={() => setIsCreateModalOpen(true)}
                    className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-blue-600 hover:bg-blue-700"
                  >
                    <PlusIcon className="h-4 w-4 mr-2" />
                    Quick Create
                  </button>
                  <button
                    onClick={() => setIsEnhancedModalOpen(true)}
                    className="inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md shadow-sm text-gray-700 bg-white hover:bg-gray-50"
                  >
                    <ChartBarIcon className="h-4 w-4 mr-2" />
                    Detailed Setup
                  </button>
                </div>
              </div>
            )}
          </div>
        </>
      )}


      {/* Create Investigation Modal */}
      <CreateInvestigationModal
        isOpen={isCreateModalOpen}
        onClose={() => setIsCreateModalOpen(false)}
        onCreateInvestigation={handleCreateInvestigation}
      />

      {/* Enhanced Create Investigation Modal */}
      <EnhancedCreateInvestigationModal
        isOpen={isEnhancedModalOpen}
        onClose={() => setIsEnhancedModalOpen(false)}
        onCreateInvestigation={handleEnhancedCreateInvestigation}
      />
    </div>
  );
};

export default SimpleInvestigationDashboard;