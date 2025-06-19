import React, { useState, useEffect } from 'react';
import { LogLevel } from '../types/RiskAssessment';

interface AutonomousInvestigationPanelProps {
  entityId: string;
  entityType: string;
  onLog: (message: string, level?: LogLevel) => void;
  onComplete: (results: any) => void;
  onPhaseUpdate: (phase: string, progress: number, message: string) => void;
}

export const AutonomousInvestigationPanel: React.FC<AutonomousInvestigationPanelProps> = ({
  entityId,
  entityType,
  onLog,
  onComplete,
  onPhaseUpdate,
}) => {
  const [isRunning, setIsRunning] = useState(false);
  const [currentPhase, setCurrentPhase] = useState('');
  const [progress, setProgress] = useState(0);

  const phases = [
    'network_analysis',
    'device_analysis', 
    'log_analysis',
    'location_analysis',
    'risk_assessment'
  ];

  const startAutonomousInvestigation = async () => {
    setIsRunning(true);
    setProgress(0);
    setCurrentPhase('');

    // Simulate autonomous investigation
    for (let i = 0; i < phases.length; i++) {
      const phase = phases[i];
      setCurrentPhase(phase);
      
      // Simulate progress through each phase
      for (let p = 0; p <= 100; p += 10) {
        setProgress(p);
        onPhaseUpdate(phase, p / 100, `Processing ${phase.replace('_', ' ')}...`);
        await new Promise(resolve => setTimeout(resolve, 100));
      }
    }

    // Simulate completion with mock results
    const mockResults = {
      network_analysis: {
        risk_level: 0.3,
        risk_factors: ['Suspicious IP patterns'],
        confidence: 0.8
      },
      device_analysis: {
        risk_level: 0.2,
        risk_factors: ['Device fingerprint changes'],
        confidence: 0.7
      },
      log_analysis: {
        risk_level: 0.4,
        risk_factors: ['Unusual login patterns'],
        confidence: 0.9
      },
      location_analysis: {
        risk_level: 0.1,
        risk_factors: ['Location consistency'],
        confidence: 0.6
      },
      risk_assessment: {
        overall_risk_score: 0.25,
        accumulated_llm_thoughts: 'Overall assessment indicates moderate risk level'
      }
    };

    setIsRunning(false);
    setProgress(100);
    onComplete(mockResults);
  };

  return (
    <div className="bg-white border border-gray-200 rounded-lg p-6 mb-6">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold text-gray-900">
          Autonomous Investigation
        </h3>
        <button
          onClick={startAutonomousInvestigation}
          disabled={isRunning}
          className={`px-4 py-2 rounded-md text-white font-medium ${
            isRunning 
              ? 'bg-gray-400 cursor-not-allowed' 
              : 'bg-blue-600 hover:bg-blue-700'
          }`}
        >
          {isRunning ? 'Running...' : 'Start Autonomous Investigation'}
        </button>
      </div>

      {isRunning && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium text-gray-700">
              Current Phase: {currentPhase.replace('_', ' ').toUpperCase()}
            </span>
            <span className="text-sm text-gray-500">{progress}%</span>
          </div>
          <div className="w-full bg-gray-200 rounded-full h-2">
            <div 
              className="bg-blue-600 h-2 rounded-full transition-all duration-300"
              style={{ width: `${progress}%` }}
            />
          </div>
        </div>
      )}

      <div className="mt-4 text-sm text-gray-600">
        <p>Entity ID: {entityId}</p>
        <p>Entity Type: {entityType}</p>
      </div>
    </div>
  );
}; 