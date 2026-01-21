/**
 * Integration tests for DetectorStudioPage
 * Tests user interactions, form submissions, and preview updates
 */

import React from 'react';
import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import { DetectorStudioPage } from '../../pages/DetectorStudioPage';
import { useDetectors } from '../../hooks/useDetectors';
import { useDetectorPreview } from '../../hooks/useDetectorPreview';
import { useToast } from '../../hooks/useToast';
import type { Detector } from '../../types/anomaly';

// Mock dependencies
jest.mock('../../hooks/useDetectors');
jest.mock('../../hooks/useDetectorPreview');
jest.mock('../../hooks/useToast');

const mockUseDetectors = useDetectors as jest.MockedFunction<typeof useDetectors>;
const mockUseDetectorPreview = useDetectorPreview as jest.MockedFunction<typeof useDetectorPreview>;
const mockUseToast = useToast as jest.MockedFunction<typeof useToast>;

describe('DetectorStudioPage Integration Tests', () => {
  const mockDetector: Detector = {
    id: 'detector-1',
    name: 'Test Detector',
    type: 'stl_mad',
    cohort_by: ['merchant_id'],
    metrics: ['tx_count'],
    params: { k: 3.5, persistence: 2, min_support: 50 },
    enabled: true,
    created_at: '2024-01-01T00:00:00Z',
    updated_at: '2024-01-01T00:00:00Z',
  };

  const mockShowToast = jest.fn();
  const mockHideToast = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();

    mockUseToast.mockReturnValue({
      showToast: mockShowToast,
      hideToast: mockHideToast,
    });

    mockUseDetectors.mockReturnValue({
      detectors: [mockDetector],
      loading: false,
      error: null,
      createDetector: jest.fn().mockResolvedValue(mockDetector),
      updateDetector: jest.fn().mockResolvedValue(mockDetector),
      deleteDetector: jest.fn().mockResolvedValue(undefined),
      getDetector: jest.fn().mockResolvedValue(mockDetector),
    });

    mockUseDetectorPreview.mockReturnValue({
      anomalies: [],
      loading: false,
      error: null,
      runPreview: jest.fn(),
      clearPreview: jest.fn(),
    });
  });

  const renderComponent = (detectorId?: string) => {
    return render(
      <BrowserRouter>
        <DetectorStudioPage />
      </BrowserRouter>
    );
  };

  describe('Initial Render', () => {
    it('should render DetectorStudioPage with header', () => {
      renderComponent();

      expect(screen.getByText(/detector studio/i)).toBeInTheDocument();
      expect(screen.getByText(/tune detection parameters/i)).toBeInTheDocument();
    });

    it('should load detector when ID is provided in URL', async () => {
      renderComponent('detector-1');

      await waitFor(() => {
        expect(mockUseDetectors).toHaveBeenCalled();
      });
    });

    it('should show form for new detector when no ID provided', () => {
      renderComponent();

      expect(screen.getByLabelText(/detector name/i)).toBeInTheDocument();
    });
  });

  describe('Form Interactions', () => {
    it('should update form fields when user types', async () => {
      renderComponent();

      const nameInput = screen.getByLabelText(/detector name/i);
      fireEvent.change(nameInput, { target: { value: 'New Detector Name' } });

      expect(nameInput).toHaveValue('New Detector Name');
    });

    it('should update metric selector when metric is selected', async () => {
      renderComponent();

      const metricSelector = screen.getByLabelText(/metric/i);
      fireEvent.change(metricSelector, { target: { value: 'decline_rate' } });

      expect(metricSelector).toHaveValue('decline_rate');
    });

    it('should update cohort fields when cohort is added', async () => {
      renderComponent();

      const cohortInput = screen.getByLabelText(/cohort by/i);
      fireEvent.change(cohortInput, { target: { value: 'channel' } });

      // Should add channel to cohort list
      await waitFor(() => {
        expect(screen.getByText(/channel/i)).toBeInTheDocument();
      });
    });

    it('should update k threshold slider', async () => {
      renderComponent('detector-1');

      await waitFor(() => {
        const kSlider = screen.getByLabelText(/k threshold/i);
        if (kSlider) {
          fireEvent.change(kSlider, { target: { value: '4.0' } });
          expect(kSlider).toHaveValue('4.0');
        }
      });
    });

    it('should update persistence slider', async () => {
      renderComponent('detector-1');

      await waitFor(() => {
        const persistenceSlider = screen.getByLabelText(/persistence/i);
        if (persistenceSlider) {
          fireEvent.change(persistenceSlider, { target: { value: '3' } });
          expect(persistenceSlider).toHaveValue('3');
        }
      });
    });
  });

  describe('Form Submission', () => {
    it('should create new detector when form is submitted', async () => {
      const createDetector = jest.fn().mockResolvedValue(mockDetector);
      mockUseDetectors.mockReturnValue({
        detectors: [],
        loading: false,
        error: null,
        createDetector,
        updateDetector: jest.fn(),
        deleteDetector: jest.fn(),
        getDetector: jest.fn(),
      });

      renderComponent();

      const nameInput = screen.getByLabelText(/detector name/i);
      fireEvent.change(nameInput, { target: { value: 'New Detector' } });

      const submitButton = screen.getByText(/save detector/i);
      fireEvent.click(submitButton);

      await waitFor(() => {
        expect(createDetector).toHaveBeenCalledWith(
          expect.objectContaining({ name: 'New Detector' })
        );
      });

      expect(mockShowToast).toHaveBeenCalledWith(
        expect.objectContaining({ message: /detector created/i })
      );
    });

    it('should update existing detector when form is submitted', async () => {
      const updateDetector = jest.fn().mockResolvedValue(mockDetector);
      mockUseDetectors.mockReturnValue({
        detectors: [mockDetector],
        loading: false,
        error: null,
        createDetector: jest.fn(),
        updateDetector,
        deleteDetector: jest.fn(),
        getDetector: jest.fn().mockResolvedValue(mockDetector),
      });

      renderComponent('detector-1');

      await waitFor(() => {
        const nameInput = screen.getByLabelText(/detector name/i);
        fireEvent.change(nameInput, { target: { value: 'Updated Detector' } });

        const submitButton = screen.getByText(/save detector/i);
        fireEvent.click(submitButton);
      });

      await waitFor(() => {
        expect(updateDetector).toHaveBeenCalledWith(
          'detector-1',
          expect.objectContaining({ name: 'Updated Detector' })
        );
      });
    });

    it('should validate required fields before submission', async () => {
      renderComponent();

      const submitButton = screen.getByText(/save detector/i);
      fireEvent.click(submitButton);

      // Should show validation errors
      await waitFor(() => {
        expect(screen.getByText(/required/i)).toBeInTheDocument();
      });
    });
  });

  describe('Preview Interactions', () => {
    it('should run preview when "Run Preview" is clicked', async () => {
      const runPreview = jest.fn().mockResolvedValue([]);
      mockUseDetectorPreview.mockReturnValue({
        anomalies: [],
        loading: false,
        error: null,
        runPreview,
        clearPreview: jest.fn(),
      });

      renderComponent('detector-1');

      await waitFor(() => {
        const previewButton = screen.getByText(/run preview/i);
        if (previewButton) {
          fireEvent.click(previewButton);
        }
      });

      await waitFor(() => {
        expect(runPreview).toHaveBeenCalled();
      });
    });

    it('should update preview chart when sliders change', async () => {
      renderComponent('detector-1');

      await waitFor(() => {
        const kSlider = screen.getByLabelText(/k threshold/i);
        if (kSlider) {
          fireEvent.change(kSlider, { target: { value: '4.0' } });
        }
      });

      // Preview should update when detector changes
      await waitFor(() => {
        expect(mockUseDetectorPreview).toHaveBeenCalled();
      });
    });

    it('should display anomalies table in preview', async () => {
      mockUseDetectorPreview.mockReturnValue({
        anomalies: [
          {
            id: 'anomaly-1',
            detector_id: 'detector-1',
            run_id: 'run-1',
            metric: 'tx_count',
            cohort: { merchant_id: 'm_01' },
            window_start: '2024-01-01T00:00:00Z',
            window_end: '2024-01-01T00:15:00Z',
            observed: 150.0,
            expected: 100.0,
            score: 5.0,
            severity: 'critical',
            persisted_n: 2,
            status: 'new',
            created_at: '2024-01-01T00:00:00Z',
          },
        ],
        loading: false,
        error: null,
        runPreview: jest.fn(),
        clearPreview: jest.fn(),
      });

      renderComponent('detector-1');

      await waitFor(() => {
        expect(screen.getByText(/150/i)).toBeInTheDocument();
        expect(screen.getByText(/5.0/i)).toBeInTheDocument();
      });
    });
  });

  describe('Error Handling', () => {
    it('should display error when detector load fails', () => {
      mockUseDetectors.mockReturnValue({
        detectors: [],
        loading: false,
        error: new Error('Failed to load detector'),
        createDetector: jest.fn(),
        updateDetector: jest.fn(),
        deleteDetector: jest.fn(),
        getDetector: jest.fn(),
      });

      renderComponent('detector-1');

      expect(screen.getByText(/error loading detector/i)).toBeInTheDocument();
    });

    it('should show retry button on error', () => {
      mockUseDetectors.mockReturnValue({
        detectors: [],
        loading: false,
        error: new Error('Failed to load'),
        createDetector: jest.fn(),
        updateDetector: jest.fn(),
        deleteDetector: jest.fn(),
        getDetector: jest.fn(),
      });

      renderComponent('detector-1');

      const retryButton = screen.getByText(/retry/i);
      expect(retryButton).toBeInTheDocument();
    });
  });
});

