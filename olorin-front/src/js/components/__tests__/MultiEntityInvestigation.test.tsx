import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';
import { ThemeProvider, createTheme } from '@mui/material/styles';

// Import components to test
import MultiEntityInvestigationStarter from '../MultiEntityInvestigationStarter';
import EntityRelationshipBuilder from '../EntityRelationshipBuilder';
import MultiEntityResults from '../MultiEntityResults';
import CrossEntityInsightsPanel from '../CrossEntityInsightsPanel';

// Import types
import {
  EntityType,
  EntityDefinition,
  EntityRelationship,
  RelationshipType,
  MultiEntityInvestigationRequest,
  MultiEntityInvestigationResult,
  CrossEntityAnalysis
} from '../../types/multiEntityInvestigation';

// Mock theme
const theme = createTheme();

// Test wrapper with theme
const TestWrapper: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <ThemeProvider theme={theme}>
    {children}
  </ThemeProvider>
);

// Mock data
const mockEntities: EntityDefinition[] = [
  {
    entity_id: 'user123',
    entity_type: EntityType.USER,
    display_name: 'Test User'
  },
  {
    entity_id: 'device456',
    entity_type: EntityType.DEVICE,
    display_name: 'Test Device'
  }
];

const mockRelationships: EntityRelationship[] = [
  {
    source_entity_id: 'user123',
    target_entity_id: 'device456',
    relationship_type: RelationshipType.USES,
    strength: 0.8,
    confidence: 0.9
  }
];

const mockCrossEntityAnalysis: CrossEntityAnalysis = {
  patterns_detected: [
    {
      pattern_id: 'pattern1',
      pattern_type: 'unusual_device_usage',
      description: 'User accessing device from unusual location',
      entities_involved: ['user123', 'device456'],
      confidence: 0.85,
      risk_level: 0.7,
      supporting_evidence: ['Multiple location changes', 'Unusual time patterns']
    }
  ],
  relationship_insights: [
    {
      insight_id: 'insight1',
      source_entity: 'user123',
      target_entity: 'device456',
      relationship_strength: 0.8,
      risk_impact: 0.6,
      description: 'Strong relationship with moderate risk impact',
      confidence: 0.75
    }
  ],
  risk_correlations: [
    {
      correlation_id: 'corr1',
      entities: ['user123', 'device456'],
      correlation_strength: 0.9,
      risk_amplification: 0.5,
      description: 'High correlation between user and device risks',
      evidence: ['Shared IP addresses', 'Synchronized activity patterns']
    }
  ],
  timeline_reconstruction: [
    {
      timestamp: '2024-01-09T10:00:00Z',
      event_type: 'login',
      entities_involved: ['user123', 'device456'],
      description: 'User logged in from device',
      risk_impact: 0.3
    }
  ],
  anomaly_summary: 'Detected unusual usage patterns between user and device',
  confidence_score: 0.82
};

const mockInvestigationResult: MultiEntityInvestigationResult = {
  investigation_id: 'test-investigation-123',
  status: 'completed',
  entities: mockEntities,
  entity_results: {
    'user123': {
      entity_id: 'user123',
      entity_type: EntityType.USER,
      investigation_result: {} as any,
      risk_assessment: {
        risk_level: 0.6,
        risk_factors: ['Unusual location'],
        confidence: 0.8,
        summary: 'Moderate risk detected',
        anomaly_details: ['Geographic anomaly'],
        timestamp: '2024-01-09T10:00:00Z'
      },
      agent_responses: {},
      status: 'completed'
    }
  },
  cross_entity_analysis: mockCrossEntityAnalysis,
  overall_risk_assessment: {
    overall_risk_score: 0.65,
    risk_distribution: { 'user123': 0.6, 'device456': 0.7 },
    high_risk_entities: ['device456'],
    risk_factors: ['Unusual device usage', 'Location anomalies'],
    confidence: 0.8,
    summary: 'Moderate overall risk with specific device concerns',
    recommendations: ['Monitor device usage', 'Verify user location']
  },
  investigation_timeline: [
    {
      timestamp: '2024-01-09T10:00:00Z',
      event_type: 'investigation_started',
      entities_involved: ['user123', 'device456'],
      description: 'Multi-entity investigation initiated',
      risk_impact: 0.1
    }
  ],
  started_at: '2024-01-09T10:00:00Z',
  completed_at: '2024-01-09T10:05:00Z',
  duration_ms: 300000
};

describe('MultiEntityInvestigationStarter', () => {
  it('renders the component correctly', () => {
    render(
      <TestWrapper>
        <MultiEntityInvestigationStarter
          onInvestigationStart={jest.fn()}
          availableEntityTypes={Object.values(EntityType)}
        />
      </TestWrapper>
    );

    expect(screen.getByText('Multi-Entity Investigation Starter')).toBeInTheDocument();
    expect(screen.getByText('Add Entities')).toBeInTheDocument();
  });

  it('allows adding entities', async () => {
    const onStart = jest.fn();
    render(
      <TestWrapper>
        <MultiEntityInvestigationStarter
          onInvestigationStart={onStart}
          availableEntityTypes={Object.values(EntityType)}
        />
      </TestWrapper>
    );

    // Add first entity
    const entityIdInput = screen.getByLabelText('Entity ID');
    fireEvent.change(entityIdInput, { target: { value: 'user123' } });
    
    const addButton = screen.getByRole('button', { name: /add/i });
    fireEvent.click(addButton);

    // Should show the added entity
    await waitFor(() => {
      expect(screen.getByText(/user123/)).toBeInTheDocument();
    });
  });

  it('validates minimum entity requirement', async () => {
    const onStart = jest.fn();
    render(
      <TestWrapper>
        <MultiEntityInvestigationStarter
          onInvestigationStart={onStart}
          availableEntityTypes={Object.values(EntityType)}
        />
      </TestWrapper>
    );

    const startButton = screen.getByRole('button', { name: /start investigation/i });
    expect(startButton).toBeDisabled();
  });
});

describe('EntityRelationshipBuilder', () => {
  it('renders with entities', () => {
    render(
      <TestWrapper>
        <EntityRelationshipBuilder
          entities={mockEntities}
          relationships={[]}
          onRelationshipsChange={jest.fn()}
        />
      </TestWrapper>
    );

    expect(screen.getByText('Entity Relationships (0)')).toBeInTheDocument();
    expect(screen.getByText('Add Relationship')).toBeInTheDocument();
  });

  it('shows message when insufficient entities', () => {
    render(
      <TestWrapper>
        <EntityRelationshipBuilder
          entities={[mockEntities[0]]} // Only one entity
          relationships={[]}
          onRelationshipsChange={jest.fn()}
        />
      </TestWrapper>
    );

    expect(screen.getByText('At least 2 entities are required to build relationships.')).toBeInTheDocument();
  });

  it('displays existing relationships', () => {
    render(
      <TestWrapper>
        <EntityRelationshipBuilder
          entities={mockEntities}
          relationships={mockRelationships}
          onRelationshipsChange={jest.fn()}
        />
      </TestWrapper>
    );

    expect(screen.getByText('Entity Relationships (1)')).toBeInTheDocument();
    expect(screen.getByText('Uses')).toBeInTheDocument();
  });
});

describe('MultiEntityResults', () => {
  it('renders investigation results', () => {
    render(
      <TestWrapper>
        <MultiEntityResults
          investigationResult={mockInvestigationResult}
          onEntityDrillDown={jest.fn()}
        />
      </TestWrapper>
    );

    expect(screen.getByText('Multi-Entity Investigation Results')).toBeInTheDocument();
    expect(screen.getByText('Overview')).toBeInTheDocument();
    expect(screen.getByText('Entities (2)')).toBeInTheDocument();
  });

  it('shows investigation summary stats', () => {
    render(
      <TestWrapper>
        <MultiEntityResults
          investigationResult={mockInvestigationResult}
          onEntityDrillDown={jest.fn()}
        />
      </TestWrapper>
    );

    // Check for summary cards
    expect(screen.getByText('Total Entities')).toBeInTheDocument();
    expect(screen.getByText('Completed')).toBeInTheDocument();
    expect(screen.getByText('High Risk')).toBeInTheDocument();
  });

  it('displays overall risk assessment', () => {
    render(
      <TestWrapper>
        <MultiEntityResults
          investigationResult={mockInvestigationResult}
          onEntityDrillDown={jest.fn()}
        />
      </TestWrapper>
    );

    expect(screen.getByText('Overall Risk Assessment')).toBeInTheDocument();
    expect(screen.getByText('Moderate overall risk with specific device concerns')).toBeInTheDocument();
  });
});

describe('CrossEntityInsightsPanel', () => {
  const mockOnPatternHighlight = jest.fn();

  it('renders insights panel', () => {
    render(
      <TestWrapper>
        <CrossEntityInsightsPanel
          insights={mockCrossEntityAnalysis}
          entities={mockEntities}
          relationships={mockRelationships}
          onPatternHighlight={mockOnPatternHighlight}
        />
      </TestWrapper>
    );

    expect(screen.getByText('Cross-Entity Insights')).toBeInTheDocument();
    expect(screen.getByText('Detected unusual usage patterns between user and device')).toBeInTheDocument();
  });

  it('shows detected patterns', () => {
    render(
      <TestWrapper>
        <CrossEntityInsightsPanel
          insights={mockCrossEntityAnalysis}
          entities={mockEntities}
          relationships={mockRelationships}
          onPatternHighlight={mockOnPatternHighlight}
        />
      </TestWrapper>
    );

    expect(screen.getByText('Detected Patterns (1)')).toBeInTheDocument();
    expect(screen.getByText('User accessing device from unusual location')).toBeInTheDocument();
  });

  it('displays risk correlations', () => {
    render(
      <TestWrapper>
        <CrossEntityInsightsPanel
          insights={mockCrossEntityAnalysis}
          entities={mockEntities}
          relationships={mockRelationships}
          onPatternHighlight={mockOnPatternHighlight}
        />
      </TestWrapper>
    );

    expect(screen.getByText('Risk Correlations (1)')).toBeInTheDocument();
    expect(screen.getByText('High correlation between user and device risks')).toBeInTheDocument();
  });

  it('shows confidence score', () => {
    render(
      <TestWrapper>
        <CrossEntityInsightsPanel
          insights={mockCrossEntityAnalysis}
          entities={mockEntities}
          relationships={mockRelationships}
          onPatternHighlight={mockOnPatternHighlight}
        />
      </TestWrapper>
    );

    expect(screen.getByText('Analysis Confidence: 82%')).toBeInTheDocument();
  });
});

describe('Integration Tests', () => {
  it('handles complete multi-entity investigation flow', async () => {
    const mockOnStart = jest.fn();
    
    // Test the starter component with a complete flow
    render(
      <TestWrapper>
        <MultiEntityInvestigationStarter
          onInvestigationStart={mockOnStart}
          availableEntityTypes={Object.values(EntityType)}
        />
      </TestWrapper>
    );

    // Add two entities
    const entityIdInput = screen.getByLabelText('Entity ID');
    
    // Add first entity
    fireEvent.change(entityIdInput, { target: { value: 'user123' } });
    fireEvent.click(screen.getByRole('button', { name: /add/i }));
    
    await waitFor(() => {
      expect(screen.getByText(/user123/)).toBeInTheDocument();
    });
    
    // Add second entity
    fireEvent.change(entityIdInput, { target: { value: 'device456' } });
    fireEvent.click(screen.getByRole('button', { name: /add/i }));
    
    await waitFor(() => {
      expect(screen.getByText(/device456/)).toBeInTheDocument();
    });

    // Start investigation should now be enabled
    const startButton = screen.getByRole('button', { name: /start investigation/i });
    expect(startButton).not.toBeDisabled();
    
    fireEvent.click(startButton);
    
    // Verify the callback was called with correct data
    await waitFor(() => {
      expect(mockOnStart).toHaveBeenCalledWith(
        expect.objectContaining({
          entities: expect.arrayContaining([
            expect.objectContaining({ entity_id: 'user123' }),
            expect.objectContaining({ entity_id: 'device456' })
          ]),
          boolean_logic: 'AND'
        })
      );
    });
  });
});