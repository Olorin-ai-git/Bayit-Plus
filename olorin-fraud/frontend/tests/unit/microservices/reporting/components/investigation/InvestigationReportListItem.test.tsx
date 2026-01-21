/**
 * Unit Tests for InvestigationReportListItem Component
 * Feature: 001-extensive-investigation-report
 * Task: T079
 *
 * Tests the InvestigationReportListItem component which displays investigation report cards
 * with metadata including risk score, entity information, timestamps, and file size.
 */

import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import '@testing-library/jest-dom';
import InvestigationReportListItem from '../../../../../../src/microservices/reporting/components/investigation/InvestigationReportListItem';
import { InvestigationReportListItem as ReportItem } from '../../../../../../src/microservices/reporting/types/reports';

// Helper function to create test report data
const createTestReport = (overrides: Partial<ReportItem> = {}): ReportItem => ({
  investigation_id: 'test-inv-123',
  report_id: 'test-report-456',
  title: 'Test Investigation Report',
  overall_risk_score: 75,
  entity_id: 'user@example.com',
  entity_type: 'email',
  generated_at: '2025-01-15T10:00:00Z',
  file_size_bytes: 1024000,
  status: 'completed',
  owner: 'john.doe@company.com',
  ...overrides
});

describe('InvestigationReportListItem', () => {
  let mockOnView: jest.Mock;

  beforeEach(() => {
    mockOnView = jest.fn();
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('Rendering and Display', () => {
    it('should render report with title', () => {
      const report = createTestReport();
      render(<InvestigationReportListItem report={report} onView={mockOnView} />);

      expect(screen.getByText('Test Investigation Report')).toBeInTheDocument();
      expect(screen.getByText('test-inv-123')).toBeInTheDocument();
    });

    it('should render investigation ID as title when title is missing', () => {
      const report = createTestReport({ title: null as any });
      render(<InvestigationReportListItem report={report} onView={mockOnView} />);

      expect(screen.getByText(/Investigation test-inv/)).toBeInTheDocument();
    });

    it('should display risk score badge', () => {
      const report = createTestReport({ overall_risk_score: 85 });
      render(<InvestigationReportListItem report={report} onView={mockOnView} />);

      expect(screen.getByLabelText(/Critical Risk: 85.0/)).toBeInTheDocument();
    });

    it('should display entity information when available', () => {
      const report = createTestReport();
      render(<InvestigationReportListItem report={report} onView={mockOnView} />);

      expect(screen.getByText('Entity:')).toBeInTheDocument();
      expect(screen.getByText('user@example.com')).toBeInTheDocument();
      expect(screen.getByText('email')).toBeInTheDocument();
    });

    it('should not display entity section when entity_id is null', () => {
      const report = createTestReport({ entity_id: null as any, entity_type: null as any });
      render(<InvestigationReportListItem report={report} onView={mockOnView} />);

      expect(screen.queryByText('Entity:')).not.toBeInTheDocument();
    });

    it('should display entity ID without entity type badge', () => {
      const report = createTestReport({ entity_type: null as any });
      render(<InvestigationReportListItem report={report} onView={mockOnView} />);

      expect(screen.getByText('user@example.com')).toBeInTheDocument();
      expect(screen.queryByText('email')).not.toBeInTheDocument();
    });
  });

  describe('DateTime Formatting', () => {
    beforeEach(() => {
      jest.useFakeTimers();
      jest.setSystemTime(new Date('2025-01-15T12:00:00Z'));
    });

    afterEach(() => {
      jest.useRealTimers();
    });

    it('should display "Just now" for reports generated within the hour', () => {
      const report = createTestReport({ generated_at: '2025-01-15T11:30:00Z' });
      render(<InvestigationReportListItem report={report} onView={mockOnView} />);

      expect(screen.getByText('Just now')).toBeInTheDocument();
    });

    it('should display hours ago for reports generated today', () => {
      const report = createTestReport({ generated_at: '2025-01-15T08:00:00Z' });
      render(<InvestigationReportListItem report={report} onView={mockOnView} />);

      expect(screen.getByText('4h ago')).toBeInTheDocument();
    });

    it('should display days ago for reports generated within a week', () => {
      const report = createTestReport({ generated_at: '2025-01-12T12:00:00Z' });
      render(<InvestigationReportListItem report={report} onView={mockOnView} />);

      expect(screen.getByText('3d ago')).toBeInTheDocument();
    });

    it('should display full date for reports older than a week', () => {
      const report = createTestReport({ generated_at: '2025-01-01T12:00:00Z' });
      render(<InvestigationReportListItem report={report} onView={mockOnView} />);

      expect(screen.getByText('Jan 1, 2025')).toBeInTheDocument();
    });
  });

  describe('File Size Formatting', () => {
    it('should display bytes for small files', () => {
      const report = createTestReport({ file_size_bytes: 512 });
      render(<InvestigationReportListItem report={report} onView={mockOnView} />);

      expect(screen.getByText('512 B')).toBeInTheDocument();
    });

    it('should display kilobytes for medium files', () => {
      const report = createTestReport({ file_size_bytes: 2048 });
      render(<InvestigationReportListItem report={report} onView={mockOnView} />);

      expect(screen.getByText('2.0 KB')).toBeInTheDocument();
    });

    it('should display megabytes for large files', () => {
      const report = createTestReport({ file_size_bytes: 2097152 });
      render(<InvestigationReportListItem report={report} onView={mockOnView} />);

      expect(screen.getByText('2.00 MB')).toBeInTheDocument();
    });

    it('should round file sizes appropriately', () => {
      const report = createTestReport({ file_size_bytes: 1536 });
      render(<InvestigationReportListItem report={report} onView={mockOnView} />);

      expect(screen.getByText('1.5 KB')).toBeInTheDocument();
    });
  });

  describe('Text Truncation', () => {
    it('should truncate long entity IDs', () => {
      const longEntityId = 'a'.repeat(50);
      const report = createTestReport({ entity_id: longEntityId });
      render(<InvestigationReportListItem report={report} onView={mockOnView} />);

      const truncatedText = screen.getByText(/a{40}\.\.\./);
      expect(truncatedText).toBeInTheDocument();
    });

    it('should truncate long owner names', () => {
      const longOwner = 'very.long.owner.name@company.com';
      const report = createTestReport({ owner: longOwner });
      render(<InvestigationReportListItem report={report} onView={mockOnView} />);

      expect(screen.getByText(/by very\.long\.owner\.n\.\.\./)).toBeInTheDocument();
    });

    it('should display "N/A" for null entity ID', () => {
      const report = createTestReport({ entity_id: null as any, entity_type: 'email' });
      render(<InvestigationReportListItem report={report} onView={mockOnView} />);

      expect(screen.getByText('N/A')).toBeInTheDocument();
    });
  });

  describe('Status and Owner Display', () => {
    it('should display status badge when status is provided', () => {
      const report = createTestReport({ status: 'completed' });
      render(<InvestigationReportListItem report={report} onView={mockOnView} />);

      expect(screen.getByText('completed')).toBeInTheDocument();
    });

    it('should display owner information when provided', () => {
      const report = createTestReport({ owner: 'jane.smith@company.com' });
      render(<InvestigationReportListItem report={report} onView={mockOnView} />);

      expect(screen.getByText(/by jane\.smith@company\.com/)).toBeInTheDocument();
    });

    it('should not display status badge when status is null', () => {
      const report = createTestReport({ status: null as any });
      const { container } = render(<InvestigationReportListItem report={report} onView={mockOnView} />);

      const statusBadges = container.querySelectorAll('.bg-green-100');
      expect(statusBadges.length).toBe(0);
    });

    it('should not display owner when owner is null', () => {
      const report = createTestReport({ owner: null as any });
      render(<InvestigationReportListItem report={report} onView={mockOnView} />);

      expect(screen.queryByText(/by /)).not.toBeInTheDocument();
    });
  });

  describe('Click Interactions', () => {
    it('should call onView with investigation_id when clicked', () => {
      const report = createTestReport();
      render(<InvestigationReportListItem report={report} onView={mockOnView} />);

      const card = screen.getByRole('button');
      fireEvent.click(card);

      expect(mockOnView).toHaveBeenCalledTimes(1);
      expect(mockOnView).toHaveBeenCalledWith('test-inv-123');
    });

    it('should call onView when Enter key is pressed', () => {
      const report = createTestReport();
      render(<InvestigationReportListItem report={report} onView={mockOnView} />);

      const card = screen.getByRole('button');
      fireEvent.keyPress(card, { key: 'Enter', code: 'Enter' });

      expect(mockOnView).toHaveBeenCalledTimes(1);
      expect(mockOnView).toHaveBeenCalledWith('test-inv-123');
    });

    it('should call onView when Space key is pressed', () => {
      const report = createTestReport();
      render(<InvestigationReportListItem report={report} onView={mockOnView} />);

      const card = screen.getByRole('button');
      fireEvent.keyPress(card, { key: ' ', code: 'Space' });

      expect(mockOnView).toHaveBeenCalledTimes(1);
      expect(mockOnView).toHaveBeenCalledWith('test-inv-123');
    });

    it('should not call onView for other key presses', () => {
      const report = createTestReport();
      render(<InvestigationReportListItem report={report} onView={mockOnView} />);

      const card = screen.getByRole('button');
      fireEvent.keyPress(card, { key: 'a', code: 'KeyA' });

      expect(mockOnView).not.toHaveBeenCalled();
    });
  });

  describe('Accessibility', () => {
    it('should have proper role and tabIndex for keyboard navigation', () => {
      const report = createTestReport();
      render(<InvestigationReportListItem report={report} onView={mockOnView} />);

      const card = screen.getByRole('button');
      expect(card).toHaveAttribute('tabIndex', '0');
    });

    it('should have descriptive aria-label with report title', () => {
      const report = createTestReport();
      render(<InvestigationReportListItem report={report} onView={mockOnView} />);

      expect(screen.getByLabelText('View report for investigation Test Investigation Report')).toBeInTheDocument();
    });

    it('should have descriptive aria-label with investigation ID when title is missing', () => {
      const report = createTestReport({ title: null as any });
      render(<InvestigationReportListItem report={report} onView={mockOnView} />);

      expect(screen.getByLabelText('View report for investigation test-inv-123')).toBeInTheDocument();
    });

    it('should hide decorative SVG icons from screen readers', () => {
      const report = createTestReport();
      const { container } = render(<InvestigationReportListItem report={report} onView={mockOnView} />);

      const svgIcons = container.querySelectorAll('svg[aria-hidden="true"]');
      expect(svgIcons.length).toBeGreaterThan(0);
    });
  });

  describe('CSS Classes', () => {
    it('should apply card styling classes', () => {
      const report = createTestReport();
      const { container } = render(<InvestigationReportListItem report={report} onView={mockOnView} />);

      const card = container.querySelector('.bg-white');
      expect(card).toHaveClass('border', 'rounded-lg', 'p-4', 'cursor-pointer');
    });

    it('should apply hover effect classes', () => {
      const report = createTestReport();
      const { container } = render(<InvestigationReportListItem report={report} onView={mockOnView} />);

      const card = container.querySelector('.bg-white');
      expect(card).toHaveClass('hover:shadow-lg', 'hover:border-blue-500', 'transition-all');
    });

    it('should apply entity type badge styling', () => {
      const report = createTestReport();
      render(<InvestigationReportListItem report={report} onView={mockOnView} />);

      const badge = screen.getByText('email');
      expect(badge).toHaveClass('px-2', 'py-0.5', 'text-xs', 'font-medium', 'bg-blue-100', 'rounded');
    });
  });

  describe('Edge Cases', () => {
    it('should handle report with all optional fields null', () => {
      const minimalReport: ReportItem = {
        investigation_id: 'min-inv-001',
        report_id: 'min-report-001',
        title: null as any,
        overall_risk_score: null,
        entity_id: null as any,
        entity_type: null as any,
        generated_at: '2025-01-15T10:00:00Z',
        file_size_bytes: 1024,
        status: null as any,
        owner: null as any
      };

      render(<InvestigationReportListItem report={minimalReport} onView={mockOnView} />);

      expect(screen.getByText(/Investigation min-inv/)).toBeInTheDocument();
      expect(screen.getByText('Unknown')).toBeInTheDocument();
    });

    it('should handle very long investigation IDs', () => {
      const longId = 'a'.repeat(100);
      const report = createTestReport({ investigation_id: longId });
      render(<InvestigationReportListItem report={report} onView={mockOnView} />);

      expect(screen.getByText(longId)).toBeInTheDocument();
    });

    it('should handle zero file size', () => {
      const report = createTestReport({ file_size_bytes: 0 });
      render(<InvestigationReportListItem report={report} onView={mockOnView} />);

      expect(screen.getByText('0 B')).toBeInTheDocument();
    });

    it('should handle future timestamps', () => {
      const futureDate = new Date();
      futureDate.setDate(futureDate.getDate() + 5);
      const report = createTestReport({ generated_at: futureDate.toISOString() });

      render(<InvestigationReportListItem report={report} onView={mockOnView} />);

      expect(screen.getByText('Just now')).toBeInTheDocument();
    });
  });
});
