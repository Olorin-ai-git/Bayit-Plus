import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { CreateInvestigationModal } from './CreateInvestigationModal';
import { InvestigationStats } from './InvestigationStats';
import { SimpleInvestigationStatusBadge } from './SimpleInvestigationStatusBadge';
import { SimpleInvestigationPriorityBadge } from './SimpleInvestigationPriorityBadge';
import { RiskScoreDisplay } from './RiskScoreDisplay';

interface Investigation {
  id: string;
  title: string;
  status: 'active' | 'completed' | 'paused';
  priority: 'low' | 'medium' | 'high';
  created_at: string;
  description: string;
  riskScore?: number;
}

interface SimpleInvestigationDashboardProps {
  className?: string;
}

export const SimpleInvestigationDashboard: React.FC<SimpleInvestigationDashboardProps> = ({
  className = ''
}) => {
  const navigate = useNavigate();
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);

  // Mock data for demonstration
  const [investigations, setInvestigations] = useState<Investigation[]>([
    {
      id: '1',
      title: 'Suspicious Transaction Pattern',
      status: 'active',
      priority: 'high',
      created_at: '2024-01-22T10:30:00Z',
      description: 'Multiple high-value transactions from unusual locations',
      riskScore: 87
    },
    {
      id: '2',
      title: 'Account Takeover Attempt',
      status: 'active',
      priority: 'medium',
      created_at: '2024-01-22T09:15:00Z',
      description: 'Failed login attempts followed by password reset requests',
      riskScore: 64
    },
    {
      id: '3',
      title: 'Identity Verification Fraud',
      status: 'completed',
      priority: 'low',
      created_at: '2024-01-21T14:45:00Z',
      description: 'Fraudulent documents submitted during KYC process',
      riskScore: 32
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

  const totalInvestigations = investigations.length;
  const activeInvestigations = investigations.filter(inv => inv.status === 'active').length;
  const completedInvestigations = investigations.filter(inv => inv.status === 'completed').length;

  // Calculate avg resolution time (mock calculation for now)
  const avgResolutionTime = 48; // 48 hours as default

  // Calculate success rate (completed vs total)
  const successRate = totalInvestigations > 0 ? completedInvestigations / totalInvestigations : 0;

  return (
    <div className={`bg-white rounded-xl shadow-sm border border-gray-200 p-6 ${className}`}>
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-2xl font-bold text-gray-900">Active Investigations</h2>
        <button
          onClick={() => setIsCreateModalOpen(true)}
          className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
        >
          New Investigation
        </button>
      </div>

      {/* Investigation Statistics */}
      <InvestigationStats
        totalInvestigations={totalInvestigations}
        activeInvestigations={activeInvestigations}
        completedInvestigations={completedInvestigations}
        avgResolutionTime={avgResolutionTime}
        successRate={successRate}
        className="mb-6"
      />

      <div className="space-y-4">
        {investigations.map((investigation) => (
          <div
            key={investigation.id}
            className="border border-gray-200 rounded-lg p-4 hover:shadow-md transition-shadow cursor-pointer"
          >
            <div className="flex items-start justify-between">
              <div className="flex-1">
                <div className="flex items-center gap-3 mb-2">
                  <h3 className="text-lg font-semibold text-gray-900">
                    {investigation.title}
                  </h3>
                  <SimpleInvestigationStatusBadge status={investigation.status} />
                  <SimpleInvestigationPriorityBadge priority={investigation.priority} />
                </div>
                <p className="text-gray-600 text-sm mb-2">
                  {investigation.description}
                </p>
                <p className="text-xs text-gray-500">
                  Created: {new Date(investigation.created_at).toLocaleDateString()}
                </p>
              </div>

              {/* Risk Score Display */}
              {investigation.riskScore && (
                <div className="ml-4">
                  <RiskScoreDisplay
                    score={investigation.riskScore}
                    size="sm"
                    showLabel={false}
                    className="flex-shrink-0"
                  />
                </div>
              )}
              <div className="flex gap-2 ml-4">
                <button
                  onClick={() => navigate(`/investigations/detail/${investigation.id}`)}
                  className="px-3 py-1 text-sm bg-gray-100 text-gray-700 rounded hover:bg-gray-200 transition-colors"
                >
                  View
                </button>
                <button
                  onClick={() => navigate(`/investigations/edit/${investigation.id}`)}
                  className="px-3 py-1 text-sm bg-blue-100 text-blue-700 rounded hover:bg-blue-200 transition-colors"
                >
                  Edit
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>

      {investigations.length === 0 && (
        <div className="text-center py-12">
          <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
            🔍
          </div>
          <h3 className="text-lg font-medium text-gray-900 mb-2">No investigations yet</h3>
          <p className="text-gray-500 mb-4">Start your first investigation to begin detecting fraud.</p>
          <button
            onClick={() => setIsCreateModalOpen(true)}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
          >
            Create Investigation
          </button>
        </div>
      )}

      {/* Create Investigation Modal */}
      <CreateInvestigationModal
        isOpen={isCreateModalOpen}
        onClose={() => setIsCreateModalOpen(false)}
        onCreateInvestigation={handleCreateInvestigation}
      />
    </div>
  );
};

export default SimpleInvestigationDashboard;