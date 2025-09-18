import React from 'react';
import { render, screen } from '@testing-library/react';
import '@testing-library/jest-dom';

// Import components to test they compile without errors
import InvestigationDashboard from '../components/InvestigationDashboard';
import AutonomousInvestigation from '../components/AutonomousInvestigation';
import EvidenceManager from '../components/EvidenceManager';
import InvestigationStepTracker from '../components/InvestigationStepTracker';
import CollaborationPanel from '../components/CollaborationPanel';
import ManualInvestigationDetails from '../components/ManualInvestigationDetails';
import InvestigationWizard from '../components/InvestigationWizard';

describe('Investigation Components', () => {
  test('InvestigationDashboard renders without crashing', () => {
    render(<InvestigationDashboard />);
    expect(screen.getByText('Investigation Dashboard')).toBeInTheDocument();
  });

  test('AutonomousInvestigation renders without crashing', () => {
    render(<AutonomousInvestigation />);
    expect(screen.getByText('Autonomous Investigation')).toBeInTheDocument();
  });

  test('EvidenceManager renders without crashing', () => {
    render(<EvidenceManager />);
    expect(screen.getByText('Evidence Manager')).toBeInTheDocument();
  });

  test('InvestigationStepTracker renders without crashing', () => {
    render(<InvestigationStepTracker />);
    expect(screen.getByText('Investigation Steps')).toBeInTheDocument();
  });

  test('CollaborationPanel renders without crashing', () => {
    render(<CollaborationPanel />);
    expect(screen.getByText('Collaboration')).toBeInTheDocument();
  });

  test('ManualInvestigationDetails renders without crashing', () => {
    render(<ManualInvestigationDetails />);
    expect(screen.getByText('Account Takeover Investigation')).toBeInTheDocument();
  });

  test('InvestigationWizard renders without crashing', () => {
    render(<InvestigationWizard />);
    expect(screen.getByText('New Investigation')).toBeInTheDocument();
  });
});