/**
 * Tests for Profile Controls Page (Web)
 *
 * Tests the web UI for managing profile-aware family controls.
 */

import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { BrowserRouter, MemoryRouter, Route, Routes } from 'react-router-dom';
import ProfileControlsPage from '../ProfileControlsPage';
import { useProfileControlsStore } from '../../../../shared/stores/profileControlsStore';
import { useFamilyControlsStore } from '../../../../shared/stores/familyControlsStore';
import { setApiClient as setProfileControlsApiClient } from '../../../../shared/services/profileControlsApi';

// Mock the stores
jest.mock('../../../../shared/stores/profileControlsStore');
jest.mock('../../../../shared/stores/familyControlsStore');

// Mock i18next
jest.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key: string, defaultValue?: string) => defaultValue || key,
  }),
}));

// Mock lucide-react icons
jest.mock('lucide-react', () => ({
  ArrowLeft: () => <div data-testid="arrow-left-icon" />,
  Shield: () => <div data-testid="shield-icon" />,
  Home: () => <div data-testid="home-icon" />,
}));

// Mock API client
const mockApiClient = {
  get: jest.fn(),
  post: jest.fn(),
};

describe('ProfileControlsPage', () => {
  const mockNavigate = jest.fn();
  const mockLoadEffectiveControls = jest.fn();
  const mockSetCustomControls = jest.fn();
  const mockInheritHouseholdControls = jest.fn();
  const mockGetControlsSource = jest.fn();
  const mockClearProfileControlsError = jest.fn();
  const mockLoadControls = jest.fn();
  const mockClearFamilyControlsError = jest.fn();

  beforeEach(() => {
    // Initialize API client
    setProfileControlsApiClient(mockApiClient);

    // Reset mocks
    jest.clearAllMocks();

    // Mock useNavigate
    jest.spyOn(require('react-router-dom'), 'useNavigate').mockReturnValue(mockNavigate);

    // Default mock implementations
    (useProfileControlsStore as unknown as jest.Mock).mockReturnValue({
      effectiveControls: null,
      controlsSource: null,
      isLoading: false,
      error: null,
      loadEffectiveControls: mockLoadEffectiveControls,
      setCustomControls: mockSetCustomControls,
      inheritHouseholdControls: mockInheritHouseholdControls,
      getControlsSource: mockGetControlsSource,
      clearError: mockClearProfileControlsError,
    });

    (useFamilyControlsStore as unknown as jest.Mock).mockReturnValue({
      controls: [],
      loading: false,
      error: null,
      loadControls: mockLoadControls,
      clearError: mockClearFamilyControlsError,
    });
  });

  const renderWithRouter = (profileId = 'profile-123') => {
    return render(
      <MemoryRouter initialEntries={[`/profiles/${profileId}/controls`]}>
        <Routes>
          <Route path="/profiles/:profileId/controls" element={<ProfileControlsPage />} />
        </Routes>
      </MemoryRouter>
    );
  };

  describe('Initialization', () => {
    it('should render the page with correct title', () => {
      renderWithRouter();

      expect(screen.getByText('Profile Family Controls')).toBeInTheDocument();
    });

    it('should load profile controls and source on mount', () => {
      renderWithRouter('profile-123');

      expect(mockLoadEffectiveControls).toHaveBeenCalledWith('profile-123');
      expect(mockGetControlsSource).toHaveBeenCalledWith('profile-123');
      expect(mockLoadControls).toHaveBeenCalled();
    });

    it('should navigate back if no profileId provided', () => {
      render(
        <MemoryRouter initialEntries={['/profiles//controls']}>
          <Routes>
            <Route path="/profiles/:profileId/controls" element={<ProfileControlsPage />} />
          </Routes>
        </MemoryRouter>
      );

      expect(mockNavigate).toHaveBeenCalledWith('/profiles');
    });
  });

  describe('Controls Source Toggle', () => {
    it('should display household inheritance option selected by default', () => {
      (useProfileControlsStore as unknown as jest.Mock).mockReturnValue({
        effectiveControls: null,
        controlsSource: {
          source: 'household',
          controls_id: null,
          inherit_household_controls: true,
        },
        isLoading: false,
        error: null,
        loadEffectiveControls: mockLoadEffectiveControls,
        setCustomControls: mockSetCustomControls,
        inheritHouseholdControls: mockInheritHouseholdControls,
        getControlsSource: mockGetControlsSource,
        clearError: mockClearProfileControlsError,
      });

      renderWithRouter();

      const householdRadio = screen.getByLabelText(/Inherit from Household/i);
      expect(householdRadio).toBeChecked();
    });

    it('should display custom controls option when selected', () => {
      (useProfileControlsStore as unknown as jest.Mock).mockReturnValue({
        effectiveControls: null,
        controlsSource: {
          source: 'custom',
          controls_id: 'controls-456',
          inherit_household_controls: false,
        },
        isLoading: false,
        error: null,
        loadEffectiveControls: mockLoadEffectiveControls,
        setCustomControls: mockSetCustomControls,
        inheritHouseholdControls: mockInheritHouseholdControls,
        getControlsSource: mockGetControlsSource,
        clearError: mockClearProfileControlsError,
      });

      renderWithRouter();

      const customRadio = screen.getByLabelText(/Custom Controls/i);
      expect(customRadio).toBeChecked();
    });

    it('should switch from household to custom controls', async () => {
      const mockControls = [
        {
          id: 'controls-456',
          kids_age_limit: 8,
          youngsters_age_limit: 13,
          max_content_rating: 'PG-13',
        },
      ];

      (useFamilyControlsStore as unknown as jest.Mock).mockReturnValue({
        controls: mockControls,
        loading: false,
        error: null,
        loadControls: mockLoadControls,
        clearError: mockClearFamilyControlsError,
      });

      renderWithRouter();

      const customRadio = screen.getByLabelText(/Custom Controls/i);
      fireEvent.click(customRadio);

      await waitFor(() => {
        expect(mockSetCustomControls).toHaveBeenCalledWith('profile-123', 'controls-456');
      });
    });

    it('should switch from custom to household controls', async () => {
      (useProfileControlsStore as unknown as jest.Mock).mockReturnValue({
        effectiveControls: null,
        controlsSource: {
          source: 'custom',
          controls_id: 'controls-456',
          inherit_household_controls: false,
        },
        isLoading: false,
        error: null,
        loadEffectiveControls: mockLoadEffectiveControls,
        setCustomControls: mockSetCustomControls,
        inheritHouseholdControls: mockInheritHouseholdControls,
        getControlsSource: mockGetControlsSource,
        clearError: mockClearProfileControlsError,
      });

      renderWithRouter();

      const householdRadio = screen.getByLabelText(/Inherit from Household/i);
      fireEvent.click(householdRadio);

      await waitFor(() => {
        expect(mockInheritHouseholdControls).toHaveBeenCalledWith('profile-123');
      });
    });

    it('should show alert if no controls available when switching to custom', async () => {
      global.alert = jest.fn();

      (useFamilyControlsStore as unknown as jest.Mock).mockReturnValue({
        controls: [],
        loading: false,
        error: null,
        loadControls: mockLoadControls,
        clearError: mockClearFamilyControlsError,
      });

      renderWithRouter();

      const customRadio = screen.getByLabelText(/Custom Controls/i);
      fireEvent.click(customRadio);

      await waitFor(() => {
        expect(global.alert).toHaveBeenCalledWith(
          expect.stringContaining('No family controls available')
        );
      });

      expect(mockSetCustomControls).not.toHaveBeenCalled();
    });
  });

  describe('Custom Controls Selection', () => {
    it('should display custom controls selection when not inheriting', () => {
      const mockControls = [
        {
          id: 'controls-456',
          kids_age_limit: 8,
          youngsters_age_limit: 13,
          max_content_rating: 'PG-13',
        },
        {
          id: 'controls-789',
          kids_age_limit: 10,
          youngsters_age_limit: 15,
          max_content_rating: 'PG',
        },
      ];

      (useProfileControlsStore as unknown as jest.Mock).mockReturnValue({
        effectiveControls: null,
        controlsSource: {
          source: 'custom',
          controls_id: 'controls-456',
          inherit_household_controls: false,
        },
        isLoading: false,
        error: null,
        loadEffectiveControls: mockLoadEffectiveControls,
        setCustomControls: mockSetCustomControls,
        inheritHouseholdControls: mockInheritHouseholdControls,
        getControlsSource: mockGetControlsSource,
        clearError: mockClearProfileControlsError,
      });

      (useFamilyControlsStore as unknown as jest.Mock).mockReturnValue({
        controls: mockControls,
        loading: false,
        error: null,
        loadControls: mockLoadControls,
        clearError: mockClearFamilyControlsError,
      });

      renderWithRouter();

      expect(screen.getByText('Select Controls')).toBeInTheDocument();
      expect(screen.getByText(/Family Controls controls-4/)).toBeInTheDocument();
      expect(screen.getByText(/Family Controls controls-7/)).toBeInTheDocument();
    });

    it('should select custom controls when clicked', async () => {
      const mockControls = [
        {
          id: 'controls-456',
          kids_age_limit: 8,
          youngsters_age_limit: 13,
          max_content_rating: 'PG-13',
        },
        {
          id: 'controls-789',
          kids_age_limit: 10,
          youngsters_age_limit: 15,
          max_content_rating: 'PG',
        },
      ];

      (useProfileControlsStore as unknown as jest.Mock).mockReturnValue({
        effectiveControls: null,
        controlsSource: {
          source: 'custom',
          controls_id: 'controls-456',
          inherit_household_controls: false,
        },
        isLoading: false,
        error: null,
        loadEffectiveControls: mockLoadEffectiveControls,
        setCustomControls: mockSetCustomControls,
        inheritHouseholdControls: mockInheritHouseholdControls,
        getControlsSource: mockGetControlsSource,
        clearError: mockClearProfileControlsError,
      });

      (useFamilyControlsStore as unknown as jest.Mock).mockReturnValue({
        controls: mockControls,
        loading: false,
        error: null,
        loadControls: mockLoadControls,
        clearError: mockClearFamilyControlsError,
      });

      renderWithRouter();

      const secondControlsRadio = screen.getByLabelText(/Family Controls controls-7/i);
      fireEvent.click(secondControlsRadio);

      await waitFor(() => {
        expect(mockSetCustomControls).toHaveBeenCalledWith('profile-123', 'controls-789');
      });
    });

    it('should display no controls message when no controls available', () => {
      (useProfileControlsStore as unknown as jest.Mock).mockReturnValue({
        effectiveControls: null,
        controlsSource: {
          source: 'custom',
          controls_id: null,
          inherit_household_controls: false,
        },
        isLoading: false,
        error: null,
        loadEffectiveControls: mockLoadEffectiveControls,
        setCustomControls: mockSetCustomControls,
        inheritHouseholdControls: mockInheritHouseholdControls,
        getControlsSource: mockGetControlsSource,
        clearError: mockClearProfileControlsError,
      });

      (useFamilyControlsStore as unknown as jest.Mock).mockReturnValue({
        controls: [],
        loading: false,
        error: null,
        loadControls: mockLoadControls,
        clearError: mockClearFamilyControlsError,
      });

      renderWithRouter();

      expect(
        screen.getByText(/No family controls available. Create controls in Family Controls settings./i)
      ).toBeInTheDocument();
    });
  });

  describe('Effective Controls Display', () => {
    it('should display effective controls when loaded', () => {
      const mockEffectiveControls = {
        id: 'controls-123',
        user_id: 'user-123',
        kids_enabled: true,
        kids_age_limit: 8,
        youngsters_enabled: true,
        youngsters_age_limit: 13,
        max_content_rating: 'PG-13',
        viewing_hours_enabled: true,
        viewing_start_hour: 8,
        viewing_end_hour: 20,
        has_family_pin: true,
        created_at: '2024-01-01T00:00:00Z',
        updated_at: '2024-01-01T00:00:00Z',
      };

      (useProfileControlsStore as unknown as jest.Mock).mockReturnValue({
        effectiveControls: mockEffectiveControls,
        controlsSource: null,
        isLoading: false,
        error: null,
        loadEffectiveControls: mockLoadEffectiveControls,
        setCustomControls: mockSetCustomControls,
        inheritHouseholdControls: mockInheritHouseholdControls,
        getControlsSource: mockGetControlsSource,
        clearError: mockClearProfileControlsError,
      });

      renderWithRouter();

      expect(screen.getByText('Active Controls')).toBeInTheDocument();
      expect(screen.getByText('Kids Content')).toBeInTheDocument();
      expect(screen.getByText('Enabled')).toBeInTheDocument();
      expect(screen.getByText(/Age limit: 8/i)).toBeInTheDocument();
      expect(screen.getByText('Youngsters Content')).toBeInTheDocument();
      expect(screen.getByText(/Age limit: 13/i)).toBeInTheDocument();
      expect(screen.getByText('PG-13')).toBeInTheDocument();
      expect(screen.getByText(/8:00 - 20:00/i)).toBeInTheDocument();
    });

    it('should display disabled state for kids content', () => {
      const mockEffectiveControls = {
        id: 'controls-123',
        user_id: 'user-123',
        kids_enabled: false,
        kids_age_limit: 0,
        youngsters_enabled: true,
        youngsters_age_limit: 13,
        max_content_rating: 'PG',
        viewing_hours_enabled: false,
        viewing_start_hour: 0,
        viewing_end_hour: 24,
        has_family_pin: false,
        created_at: '2024-01-01T00:00:00Z',
        updated_at: '2024-01-01T00:00:00Z',
      };

      (useProfileControlsStore as unknown as jest.Mock).mockReturnValue({
        effectiveControls: mockEffectiveControls,
        controlsSource: null,
        isLoading: false,
        error: null,
        loadEffectiveControls: mockLoadEffectiveControls,
        setCustomControls: mockSetCustomControls,
        inheritHouseholdControls: mockInheritHouseholdControls,
        getControlsSource: mockGetControlsSource,
        clearError: mockClearProfileControlsError,
      });

      renderWithRouter();

      const disabledTexts = screen.getAllByText('Disabled');
      expect(disabledTexts.length).toBeGreaterThan(0);
      expect(screen.getByText('No restriction')).toBeInTheDocument();
    });

    it('should display no controls message when no effective controls', () => {
      renderWithRouter();

      expect(
        screen.getByText('No family controls active for this profile')
      ).toBeInTheDocument();
    });
  });

  describe('Error Handling', () => {
    it('should display profile controls error', () => {
      (useProfileControlsStore as unknown as jest.Mock).mockReturnValue({
        effectiveControls: null,
        controlsSource: null,
        isLoading: false,
        error: 'Failed to load profile controls',
        loadEffectiveControls: mockLoadEffectiveControls,
        setCustomControls: mockSetCustomControls,
        inheritHouseholdControls: mockInheritHouseholdControls,
        getControlsSource: mockGetControlsSource,
        clearError: mockClearProfileControlsError,
      });

      renderWithRouter();

      expect(screen.getByText('Failed to load profile controls')).toBeInTheDocument();
    });

    it('should display family controls error', () => {
      (useFamilyControlsStore as unknown as jest.Mock).mockReturnValue({
        controls: [],
        loading: false,
        error: 'Failed to load family controls',
        loadControls: mockLoadControls,
        clearError: mockClearFamilyControlsError,
      });

      renderWithRouter();

      expect(screen.getByText('Failed to load family controls')).toBeInTheDocument();
    });

    it('should clear errors when dismiss button clicked', () => {
      (useProfileControlsStore as unknown as jest.Mock).mockReturnValue({
        effectiveControls: null,
        controlsSource: null,
        isLoading: false,
        error: 'Test error',
        loadEffectiveControls: mockLoadEffectiveControls,
        setCustomControls: mockSetCustomControls,
        inheritHouseholdControls: mockInheritHouseholdControls,
        getControlsSource: mockGetControlsSource,
        clearError: mockClearProfileControlsError,
      });

      renderWithRouter();

      const dismissButton = screen.getByText('Dismiss');
      fireEvent.click(dismissButton);

      expect(mockClearProfileControlsError).toHaveBeenCalled();
      expect(mockClearFamilyControlsError).toHaveBeenCalled();
    });
  });

  describe('Navigation', () => {
    it('should navigate back to profiles page when back button clicked', () => {
      renderWithRouter();

      const backButton = screen.getByTestId('arrow-left-icon').parentElement;
      fireEvent.click(backButton!);

      expect(mockNavigate).toHaveBeenCalledWith('/profiles');
    });
  });

  describe('Loading State', () => {
    it('should disable controls during loading', () => {
      (useProfileControlsStore as unknown as jest.Mock).mockReturnValue({
        effectiveControls: null,
        controlsSource: null,
        isLoading: true,
        error: null,
        loadEffectiveControls: mockLoadEffectiveControls,
        setCustomControls: mockSetCustomControls,
        inheritHouseholdControls: mockInheritHouseholdControls,
        getControlsSource: mockGetControlsSource,
        clearError: mockClearProfileControlsError,
      });

      renderWithRouter();

      const householdRadio = screen.getByLabelText(/Inherit from Household/i);
      const customRadio = screen.getByLabelText(/Custom Controls/i);

      expect(householdRadio).toBeDisabled();
      expect(customRadio).toBeDisabled();
    });
  });
});
