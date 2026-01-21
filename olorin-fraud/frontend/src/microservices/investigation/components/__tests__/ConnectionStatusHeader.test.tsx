/**
 * ConnectionStatusHeader Component Tests
 * Feature: 007-progress-wizard-page
 *
 * Tests status display, connection indicators, control buttons, and event handlers.
 */

import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { ConnectionStatusHeader } from '../ConnectionStatusHeader';
import { ConnectionStatusHeaderProps } from '../../services/componentAdapters';

const defaultProps: ConnectionStatusHeaderProps = {
  investigationStatus: 'running',
  isConnected: true,
  toolsPerSec: 2.5,
  isProcessing: true,
  onPause: jest.fn(),
  onCancel: jest.fn(),
  onResume: jest.fn(),
};

describe('ConnectionStatusHeader', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should render without crashing', () => {
    render(<ConnectionStatusHeader {...defaultProps} />);
    expect(screen.getByText(/connected/i)).toBeInTheDocument();
  });

  it('should display running status badge', () => {
    render(<ConnectionStatusHeader {...defaultProps} investigationStatus="running" />);
    expect(screen.getByText('Running')).toBeInTheDocument();
  });

  it('should display completed status badge', () => {
    render(<ConnectionStatusHeader {...defaultProps} investigationStatus="completed" />);
    expect(screen.getByText('Completed')).toBeInTheDocument();
  });

  it('should display failed status badge', () => {
    render(<ConnectionStatusHeader {...defaultProps} investigationStatus="failed" />);
    expect(screen.getByText('Failed')).toBeInTheDocument();
  });

  it('should display paused status badge', () => {
    render(<ConnectionStatusHeader {...defaultProps} investigationStatus="paused" />);
    expect(screen.getByText('Paused')).toBeInTheDocument();
  });

  it('should display pending status badge', () => {
    render(<ConnectionStatusHeader {...defaultProps} investigationStatus="pending" />);
    expect(screen.getByText('Pending')).toBeInTheDocument();
  });

  it('should display connected indicator', () => {
    render(<ConnectionStatusHeader {...defaultProps} isConnected={true} />);
    expect(screen.getByText('Connected')).toBeInTheDocument();
  });

  it('should display disconnected indicator', () => {
    render(<ConnectionStatusHeader {...defaultProps} isConnected={false} />);
    expect(screen.getByText('Disconnected')).toBeInTheDocument();
  });

  it('should display tools per second metric', () => {
    render(<ConnectionStatusHeader {...defaultProps} toolsPerSec={3.75} />);
    expect(screen.getByText('3.75 tools/sec')).toBeInTheDocument();
  });

  it('should display processing indicator when processing', () => {
    render(<ConnectionStatusHeader {...defaultProps} isProcessing={true} />);
    expect(screen.getByText('Processing')).toBeInTheDocument();
  });

  it('should not display processing indicator when not processing', () => {
    render(<ConnectionStatusHeader {...defaultProps} isProcessing={false} />);
    expect(screen.queryByText('Processing')).not.toBeInTheDocument();
  });

  it('should show pause button when running and connected', () => {
    render(
      <ConnectionStatusHeader
        {...defaultProps}
        investigationStatus="running"
        isConnected={true}
      />
    );
    expect(screen.getByLabelText('Pause investigation')).toBeInTheDocument();
  });

  it('should not show pause button when not running', () => {
    render(
      <ConnectionStatusHeader
        {...defaultProps}
        investigationStatus="completed"
        isConnected={true}
      />
    );
    expect(screen.queryByLabelText('Pause investigation')).not.toBeInTheDocument();
  });

  it('should not show pause button when disconnected', () => {
    render(
      <ConnectionStatusHeader
        {...defaultProps}
        investigationStatus="running"
        isConnected={false}
      />
    );
    expect(screen.queryByLabelText('Pause investigation')).not.toBeInTheDocument();
  });

  it('should show resume button when paused and connected', () => {
    render(
      <ConnectionStatusHeader
        {...defaultProps}
        investigationStatus="paused"
        isConnected={true}
      />
    );
    expect(screen.getByLabelText('Resume investigation')).toBeInTheDocument();
  });

  it('should not show resume button when not paused', () => {
    render(
      <ConnectionStatusHeader
        {...defaultProps}
        investigationStatus="running"
        isConnected={true}
      />
    );
    expect(screen.queryByLabelText('Resume investigation')).not.toBeInTheDocument();
  });

  it('should show cancel button when running and connected', () => {
    render(
      <ConnectionStatusHeader
        {...defaultProps}
        investigationStatus="running"
        isConnected={true}
      />
    );
    expect(screen.getByLabelText('Cancel investigation')).toBeInTheDocument();
  });

  it('should show cancel button when paused and connected', () => {
    render(
      <ConnectionStatusHeader
        {...defaultProps}
        investigationStatus="paused"
        isConnected={true}
      />
    );
    expect(screen.getByLabelText('Cancel investigation')).toBeInTheDocument();
  });

  it('should show cancel button when submitted and connected', () => {
    render(
      <ConnectionStatusHeader
        {...defaultProps}
        investigationStatus="submitted"
        isConnected={true}
      />
    );
    expect(screen.getByLabelText('Cancel investigation')).toBeInTheDocument();
  });

  it('should not show cancel button when completed', () => {
    render(
      <ConnectionStatusHeader
        {...defaultProps}
        investigationStatus="completed"
        isConnected={true}
      />
    );
    expect(screen.queryByLabelText('Cancel investigation')).not.toBeInTheDocument();
  });

  it('should not show cancel button when disconnected', () => {
    render(
      <ConnectionStatusHeader
        {...defaultProps}
        investigationStatus="running"
        isConnected={false}
      />
    );
    expect(screen.queryByLabelText('Cancel investigation')).not.toBeInTheDocument();
  });

  it('should call onPause when pause button is clicked', () => {
    const mockOnPause = jest.fn();
    render(
      <ConnectionStatusHeader
        {...defaultProps}
        investigationStatus="running"
        isConnected={true}
        onPause={mockOnPause}
      />
    );

    fireEvent.click(screen.getByLabelText('Pause investigation'));
    expect(mockOnPause).toHaveBeenCalledTimes(1);
  });

  it('should call onResume when resume button is clicked', () => {
    const mockOnResume = jest.fn();
    render(
      <ConnectionStatusHeader
        {...defaultProps}
        investigationStatus="paused"
        isConnected={true}
        onResume={mockOnResume}
      />
    );

    fireEvent.click(screen.getByLabelText('Resume investigation'));
    expect(mockOnResume).toHaveBeenCalledTimes(1);
  });

  it('should call onCancel when cancel button is clicked', () => {
    const mockOnCancel = jest.fn();
    render(
      <ConnectionStatusHeader
        {...defaultProps}
        investigationStatus="running"
        isConnected={true}
        onCancel={mockOnCancel}
      />
    );

    fireEvent.click(screen.getByLabelText('Cancel investigation'));
    expect(mockOnCancel).toHaveBeenCalledTimes(1);
  });

  it('should handle zero tools per second', () => {
    render(<ConnectionStatusHeader {...defaultProps} toolsPerSec={0} />);
    expect(screen.getByText('0.00 tools/sec')).toBeInTheDocument();
  });

  it('should handle high tools per second', () => {
    render(<ConnectionStatusHeader {...defaultProps} toolsPerSec={15.5} />);
    expect(screen.getByText('15.50 tools/sec')).toBeInTheDocument();
  });

  it('should display all sections together', () => {
    render(
      <ConnectionStatusHeader
        {...defaultProps}
        investigationStatus="running"
        isConnected={true}
        toolsPerSec={2.5}
        isProcessing={true}
      />
    );

    // Status badge
    expect(screen.getByText('Running')).toBeInTheDocument();

    // Connection indicator
    expect(screen.getByText('Connected')).toBeInTheDocument();

    // Activity metrics
    expect(screen.getByText('2.50 tools/sec')).toBeInTheDocument();
    expect(screen.getByText('Processing')).toBeInTheDocument();

    // Control buttons
    expect(screen.getByLabelText('Pause investigation')).toBeInTheDocument();
    expect(screen.getByLabelText('Cancel investigation')).toBeInTheDocument();
  });
});
