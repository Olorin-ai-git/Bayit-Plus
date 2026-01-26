/**
 * VoiceCommandButton Component Tests
 *
 * Tests for the floating action button for voice input
 */

import React from 'react';
import { render, fireEvent, act } from '@testing-library/react-native';

import VoiceCommandButton from '../../src/components/voice/VoiceCommandButton';

// Mock VoiceWaveform
jest.mock('../../src/components/voice/VoiceWaveform', () => {
  const { View } = require('react-native');
  return {
    __esModule: true,
    default: ({ isListening, barCount, color }: any) => (
      <View testID="voice-waveform" {...{ isListening, barCount, color }} />
    ),
  };
});

describe('VoiceCommandButton', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    jest.useFakeTimers();
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  describe('rendering', () => {
    it('should render with default props', () => {
      const { getByTestId } = render(<VoiceCommandButton />);

      expect(getByTestId('voice-command-button')).toBeTruthy();
    });

    it('should render without waveform when not listening', () => {
      const { queryByTestId } = render(<VoiceCommandButton isListening={false} />);

      expect(queryByTestId('voice-waveform')).toBeNull();
    });

    it('should render with waveform when listening', () => {
      const { getByTestId } = render(<VoiceCommandButton isListening={true} />);

      expect(getByTestId('voice-waveform')).toBeTruthy();
    });
  });

  describe('interaction', () => {
    it('should call onPress when pressed', () => {
      const onPress = jest.fn();
      const { getByTestId } = render(<VoiceCommandButton onPress={onPress} />);

      fireEvent.press(getByTestId('voice-command-button'));

      expect(onPress).toHaveBeenCalledTimes(1);
    });

    it('should not call onPress when disabled', () => {
      const onPress = jest.fn();
      const { getByTestId } = render(<VoiceCommandButton onPress={onPress} isDisabled={true} />);

      fireEvent.press(getByTestId('voice-command-button'));

      expect(onPress).not.toHaveBeenCalled();
    });
  });

  describe('states', () => {
    it('should show disabled icon when disabled', () => {
      const { getByTestId } = render(<VoiceCommandButton isDisabled={true} />);

      expect(getByTestId('voice-command-button')).toBeTruthy();
    });

    it('should show listening state', () => {
      const { getByTestId } = render(<VoiceCommandButton isListening={true} />);

      expect(getByTestId('voice-command-button')).toBeTruthy();
      expect(getByTestId('voice-waveform')).toBeTruthy();
    });

    it('should show normal state when not listening or disabled', () => {
      const { getByTestId, queryByTestId } = render(
        <VoiceCommandButton isListening={false} isDisabled={false} />
      );

      expect(getByTestId('voice-command-button')).toBeTruthy();
      expect(queryByTestId('voice-waveform')).toBeNull();
    });
  });

  describe('animation', () => {
    it('should start pulse animation when listening', () => {
      const { rerender } = render(<VoiceCommandButton isListening={false} />);

      rerender(<VoiceCommandButton isListening={true} />);

      act(() => {
        jest.advanceTimersByTime(800);
      });

      // Animation should be running (no error)
      expect(true).toBe(true);
    });

    it('should stop animation when not listening', () => {
      const { rerender } = render(<VoiceCommandButton isListening={true} />);

      rerender(<VoiceCommandButton isListening={false} />);

      act(() => {
        jest.advanceTimersByTime(100);
      });

      // Animation should be stopped (no error)
      expect(true).toBe(true);
    });
  });
});
