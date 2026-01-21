import React from 'react';
import { render, fireEvent, waitFor, act } from '@testing-library/react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { QualitySelector, useQualityPreference } from '../QualitySelector';
import { renderHook } from '@testing-library/react-hooks';

// Mock AsyncStorage
jest.mock('@react-native-async-storage/async-storage', () => ({
  getItem: jest.fn(),
  setItem: jest.fn(),
  removeItem: jest.fn(),
}));

// Mock Platform
jest.mock('react-native/Libraries/Utilities/Platform', () => ({
  OS: 'web',
  select: jest.fn((obj) => obj.web),
  isTV: false,
}));

// Mock i18next
jest.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key: string, defaultValue: string) => defaultValue,
  }),
}));

describe('QualitySelector', () => {
  const mockOnClose = jest.fn();
  const mockOnQualityChange = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
    (AsyncStorage.getItem as jest.Mock).mockResolvedValue(null);
  });

  describe('Rendering', () => {
    it('should not render when visible is false', () => {
      const { queryByText } = render(
        <QualitySelector
          visible={false}
          onClose={mockOnClose}
          onQualityChange={mockOnQualityChange}
        />
      );

      expect(queryByText('Select Video Quality')).toBeNull();
    });

    it('should render when visible is true', () => {
      const { getByText } = render(
        <QualitySelector
          visible={true}
          onClose={mockOnClose}
          onQualityChange={mockOnQualityChange}
        />
      );

      expect(getByText('Select Video Quality')).toBeTruthy();
    });

    it('should render all quality options', () => {
      const { getByText } = render(
        <QualitySelector
          visible={true}
          onClose={mockOnClose}
          onQualityChange={mockOnQualityChange}
        />
      );

      expect(getByText('Auto')).toBeTruthy();
      expect(getByText('1080p')).toBeTruthy();
      expect(getByText('720p')).toBeTruthy();
      expect(getByText('480p')).toBeTruthy();
      expect(getByText('360p')).toBeTruthy();
    });

    it('should render quality descriptions', () => {
      const { getByText } = render(
        <QualitySelector
          visible={true}
          onClose={mockOnClose}
          onQualityChange={mockOnQualityChange}
        />
      );

      expect(getByText('Automatic quality based on connection')).toBeTruthy();
      expect(getByText('Full HD')).toBeTruthy();
      expect(getByText('HD')).toBeTruthy();
      expect(getByText('SD')).toBeTruthy();
      expect(getByText('Mobile')).toBeTruthy();
    });
  });

  describe('Quality Selection', () => {
    it('should show current quality as selected', () => {
      const { getByTestId } = render(
        <QualitySelector
          visible={true}
          currentQuality="720p"
          onClose={mockOnClose}
          onQualityChange={mockOnQualityChange}
        />
      );

      // The quality item with 720p should have the checkmark
      const quality720 = getByTestId('quality-item-720p');
      expect(quality720).toBeTruthy();
      // Check for checkmark in the text content
      const textContent = quality720.props.children
        .map((child: any) => child?.props?.children)
        .join('');
      expect(textContent).toContain('✓');
    });

    it('should call onQualityChange when quality is selected', () => {
      const { getByText } = render(
        <QualitySelector
          visible={true}
          currentQuality="auto"
          onClose={mockOnClose}
          onQualityChange={mockOnQualityChange}
        />
      );

      const quality1080 = getByText('1080p');
      fireEvent.press(quality1080);

      expect(mockOnQualityChange).toHaveBeenCalledWith('1080p');
    });

    it('should save quality preference to AsyncStorage when selected', async () => {
      const { getByText } = render(
        <QualitySelector
          visible={true}
          currentQuality="auto"
          onClose={mockOnClose}
          onQualityChange={mockOnQualityChange}
        />
      );

      const quality720 = getByText('720p');
      fireEvent.press(quality720);

      await waitFor(() => {
        expect(AsyncStorage.setItem).toHaveBeenCalledWith(
          'bayit_video_quality_preference',
          '720p'
        );
      });
    });

    it('should close modal after quality selection', async () => {
      const { getByText } = render(
        <QualitySelector
          visible={true}
          currentQuality="auto"
          onClose={mockOnClose}
          onQualityChange={mockOnQualityChange}
        />
      );

      const quality480 = getByText('480p');
      fireEvent.press(quality480);

      // Modal should close after a brief delay (300ms in component)
      await waitFor(
        () => {
          expect(mockOnClose).toHaveBeenCalled();
        },
        { timeout: 500 }
      );
    });
  });

  describe('Modal Behavior', () => {
    it('should call onClose when close button is pressed', () => {
      const { getByTestId } = render(
        <QualitySelector
          visible={true}
          onClose={mockOnClose}
          onQualityChange={mockOnQualityChange}
        />
      );

      const closeButton = getByTestId('close-button');
      fireEvent.press(closeButton);

      expect(mockOnClose).toHaveBeenCalled();
    });

    it('should call onClose when modal backdrop is pressed (onRequestClose)', () => {
      const { getByTestId } = render(
        <QualitySelector
          visible={true}
          onClose={mockOnClose}
          onQualityChange={mockOnQualityChange}
        />
      );

      // Simulate Android back button / modal request close
      const modal = getByTestId('quality-selector-modal');
      const onRequestClose = modal.props.onRequestClose;
      onRequestClose();

      expect(mockOnClose).toHaveBeenCalled();
    });
  });

  describe('Accessibility', () => {
    it('should have proper accessibility labels', () => {
      const { getByTestId } = render(
        <QualitySelector
          visible={true}
          onClose={mockOnClose}
          onQualityChange={mockOnQualityChange}
        />
      );

      const closeButton = getByTestId('close-button');
      expect(closeButton.props.accessibilityLabel).toBe('Close quality selector');
    });

    it('should have proper accessibility roles', () => {
      const { getAllByRole } = render(
        <QualitySelector
          visible={true}
          onClose={mockOnClose}
          onQualityChange={mockOnQualityChange}
        />
      );

      const buttons = getAllByRole('button');
      // Should have 6 buttons: 5 quality options + 1 close button
      expect(buttons.length).toBe(6);
    });
  });

  describe('useQualityPreference Hook', () => {
    it('should return default quality "auto" initially', () => {
      const { result } = renderHook(() => useQualityPreference());

      expect(result.current.quality).toBe('auto');
    });

    it('should load saved quality from AsyncStorage', async () => {
      (AsyncStorage.getItem as jest.Mock).mockResolvedValue('1080p');

      const { result, waitForNextUpdate } = renderHook(() => useQualityPreference());

      await waitForNextUpdate();

      expect(result.current.quality).toBe('1080p');
      expect(AsyncStorage.getItem).toHaveBeenCalledWith('bayit_video_quality_preference');
    });

    it('should update quality when setQuality is called', async () => {
      const { result } = renderHook(() => useQualityPreference());

      act(() => {
        result.current.setQuality('720p');
      });

      await waitFor(() => {
        expect(result.current.quality).toBe('720p');
        expect(AsyncStorage.setItem).toHaveBeenCalledWith(
          'bayit_video_quality_preference',
          '720p'
        );
      });
    });

    it('should handle AsyncStorage errors gracefully', async () => {
      const consoleError = jest.spyOn(console, 'error').mockImplementation();
      (AsyncStorage.getItem as jest.Mock).mockRejectedValue(
        new Error('Storage error')
      );

      const { result } = renderHook(() => useQualityPreference());

      // Should still work with default value
      expect(result.current.quality).toBe('auto');

      // Should log error
      await waitFor(() => {
        expect(consoleError).toHaveBeenCalledWith(
          'Failed to load video quality preference:',
          expect.any(Error)
        );
      });

      consoleError.mockRestore();
    });

    it('should handle invalid stored quality values', async () => {
      (AsyncStorage.getItem as jest.Mock).mockResolvedValue('invalid-quality');

      const { result, waitForNextUpdate } = renderHook(() => useQualityPreference());

      await waitForNextUpdate();

      // Should accept the value (component validates it)
      expect(result.current.quality).toBe('invalid-quality');
    });

    it('should persist multiple quality changes', async () => {
      const { result } = renderHook(() => useQualityPreference());

      act(() => {
        result.current.setQuality('1080p');
      });

      await waitFor(() => {
        expect(AsyncStorage.setItem).toHaveBeenCalledWith(
          'bayit_video_quality_preference',
          '1080p'
        );
      });

      act(() => {
        result.current.setQuality('480p');
      });

      await waitFor(() => {
        expect(AsyncStorage.setItem).toHaveBeenCalledWith(
          'bayit_video_quality_preference',
          '480p'
        );
      });

      expect(result.current.quality).toBe('480p');
    });
  });

  describe('Quality Labels', () => {
    it('should display correct quality labels', () => {
      const { getByText } = render(
        <QualitySelector
          visible={true}
          onClose={mockOnClose}
          onQualityChange={mockOnQualityChange}
        />
      );

      // Check that all quality levels are labeled correctly
      const qualities = ['Auto', '1080p', '720p', '480p', '360p'];
      qualities.forEach((quality) => {
        expect(getByText(quality)).toBeTruthy();
      });
    });

    it('should display correct descriptions for each quality', () => {
      const { getByText } = render(
        <QualitySelector
          visible={true}
          onClose={mockOnClose}
          onQualityChange={mockOnQualityChange}
        />
      );

      const descriptions = [
        'Automatic quality based on connection',
        'Full HD',
        'HD',
        'SD',
        'Mobile',
      ];

      descriptions.forEach((desc) => {
        expect(getByText(desc)).toBeTruthy();
      });
    });
  });

  describe('Focus Management (tvOS)', () => {
    beforeEach(() => {
      // Mock isTV as true
      jest.resetModules();
      jest.doMock('../../../utils/platform', () => ({
        isTV: true,
        isWeb: false,
      }));
    });

    afterEach(() => {
      jest.dontMock('../../../utils/platform');
    });

    it('should have hasTVPreferredFocus on first quality option for tvOS', () => {
      const { getByTestId } = render(
        <QualitySelector
          visible={true}
          currentQuality="auto"
          onClose={mockOnClose}
          onQualityChange={mockOnQualityChange}
        />
      );

      const firstQuality = getByTestId('quality-item-auto');
      // In tvOS mode, the first item should have preferred focus
      expect(firstQuality.props.hasTVPreferredFocus).toBeDefined();
    });
  });

  describe('Edge Cases', () => {
    it('should handle undefined currentQuality', () => {
      const { getByText } = render(
        <QualitySelector
          visible={true}
          currentQuality={undefined}
          onClose={mockOnClose}
          onQualityChange={mockOnQualityChange}
        />
      );

      // Should still render without errors
      expect(getByText('Select Video Quality')).toBeTruthy();
    });

    it('should handle rapid quality changes', async () => {
      const { getByText } = render(
        <QualitySelector
          visible={true}
          currentQuality="auto"
          onClose={mockOnClose}
          onQualityChange={mockOnQualityChange}
        />
      );

      // Rapidly select multiple qualities
      fireEvent.press(getByText('1080p'));
      fireEvent.press(getByText('720p'));
      fireEvent.press(getByText('480p'));

      await waitFor(() => {
        expect(mockOnQualityChange).toHaveBeenCalledTimes(3);
      });

      // Should have called with the last selected quality
      expect(mockOnQualityChange).toHaveBeenLastCalledWith('480p');
    });
  });
});
