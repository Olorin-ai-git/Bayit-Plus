import React from 'react';
import { render, screen } from '@testing-library/react';
import RAGStatusIndicator from '../RAGStatusIndicator';

describe('RAGStatusIndicator', () => {
  it('renders disabled state correctly', () => {
    render(
      <RAGStatusIndicator
        isRAGEnabled={false}
      />
    );
    
    expect(screen.getByText('RAG Disabled')).toBeInTheDocument();
    expect(screen.getByRole('status')).toHaveAttribute('aria-label', 'RAG Status: RAG Disabled');
  });

  it('renders enabled state correctly', () => {
    render(
      <RAGStatusIndicator
        isRAGEnabled={true}
        processingState="idle"
        confidence={0.85}
      />
    );
    
    expect(screen.getByText('RAG Enhanced')).toBeInTheDocument();
    expect(screen.getByText('85%')).toBeInTheDocument();
  });

  it('renders processing states correctly', () => {
    const { rerender } = render(
      <RAGStatusIndicator
        isRAGEnabled={true}
        processingState="retrieving"
        currentOperation="Fetching knowledge"
      />
    );
    
    expect(screen.getByText('Retrieving Knowledge')).toBeInTheDocument();
    expect(screen.getByText('Fetching knowledge')).toBeInTheDocument();

    rerender(
      <RAGStatusIndicator
        isRAGEnabled={true}
        processingState="augmenting"
        currentOperation="Enhancing context"
      />
    );
    
    expect(screen.getByText('Augmenting Context')).toBeInTheDocument();
    expect(screen.getByText('Enhancing context')).toBeInTheDocument();
  });

  it('shows insights toggle button when callback provided', () => {
    const mockToggle = jest.fn();
    render(
      <RAGStatusIndicator
        isRAGEnabled={true}
        onToggleInsights={mockToggle}
      />
    );
    
    expect(screen.getByLabelText('View RAG Insights')).toBeInTheDocument();
  });
});
