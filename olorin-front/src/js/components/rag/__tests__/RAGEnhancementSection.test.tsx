import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import RAGEnhancementSection from '../RAGEnhancementSection';

// Mock the hooks
jest.mock('../../../hooks/useRAGStatus', () => ({
  __esModule: true,
  default: () => ({
    status: {
      isEnabled: true,
      processingState: 'idle',
      currentOperation: '',
      confidence: 0.85,
      lastUpdate: new Date().toISOString(),
    },
    updateStatus: jest.fn(),
    isProcessing: false,
  }),
}));

jest.mock('../../../hooks/useRAGMetrics', () => ({
  __esModule: true,
  default: () => ({
    metrics: {
      total_queries: 5,
      avg_retrieval_time: 195,
      knowledge_hit_rate: 0.87,
      enhancement_success_rate: 0.94,
      total_knowledge_chunks: 15,
      active_sources: ['fraud_patterns.md', 'risk_indicators.json'],
    },
    addOperation: jest.fn(),
    updateMetrics: jest.fn(),
  }),
}));

jest.mock('../../../hooks/useRAGInsights', () => ({
  __esModule: true,
  default: () => ({
    insights: [],
    addInsight: jest.fn(),
    clearInsights: jest.fn(),
    getInsightsByAgent: jest.fn(() => []),
  }),
}));

describe('RAGEnhancementSection', () => {
  it('renders RAG enhancement section when enabled', async () => {
    render(
      <RAGEnhancementSection investigationId="test-investigation-123" />
    );
    
    expect(screen.getByText('RAG Enhancement')).toBeInTheDocument();
    
    // Wait for components to load
    await waitFor(() => {
      expect(screen.getByText('RAG Enhanced')).toBeInTheDocument();
    });
    
    // Check performance metrics
    expect(screen.getByText('195ms')).toBeInTheDocument();
    expect(screen.getByText('87.0%')).toBeInTheDocument();
  });

  it('shows knowledge sources', async () => {
    render(
      <RAGEnhancementSection investigationId="test-investigation-123" />
    );
    
    await waitFor(() => {
      expect(screen.getByText('fraud_patterns.md')).toBeInTheDocument();
      expect(screen.getByText('risk_indicators.json')).toBeInTheDocument();
    });
  });

  it('can be collapsed and expanded', async () => {
    render(
      <RAGEnhancementSection investigationId="test-investigation-123" />
    );
    
    const collapseButton = screen.getByLabelText('Collapse RAG section');
    expect(collapseButton).toBeInTheDocument();
  });
});
