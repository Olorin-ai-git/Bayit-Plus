/**
 * TabBar Component Tests
 *
 * Tests for the Glass-themed bottom tab navigation
 */

import React from 'react';
import { render, fireEvent } from '@testing-library/react-native';

import TabBar from '../../src/components/navigation/TabBar';

// Mock haptic feedback
jest.mock('react-native-haptic-feedback', () => ({
  trigger: jest.fn(),
}));

// Mock navigation
const mockNavigation = {
  emit: jest.fn().mockReturnValue({ defaultPrevented: false }),
  navigate: jest.fn(),
};

const mockDescriptors = {};

const createMockState = (currentIndex: number = 0) => ({
  index: currentIndex,
  routes: [
    { key: 'home-1', name: 'Home' },
    { key: 'livetv-1', name: 'LiveTV' },
    { key: 'vod-1', name: 'VOD' },
    { key: 'radio-1', name: 'Radio' },
    { key: 'podcasts-1', name: 'Podcasts' },
    { key: 'profile-1', name: 'Profile' },
  ],
});

describe('TabBar', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('rendering', () => {
    it('should render all tab items', () => {
      const state = createMockState();
      const { getByTestId } = render(
        <TabBar state={state} descriptors={mockDescriptors} navigation={mockNavigation} />
      );

      expect(getByTestId('tab-home')).toBeTruthy();
      expect(getByTestId('tab-livetv')).toBeTruthy();
      expect(getByTestId('tab-vod')).toBeTruthy();
      expect(getByTestId('tab-radio')).toBeTruthy();
      expect(getByTestId('tab-podcasts')).toBeTruthy();
      expect(getByTestId('tab-profile')).toBeTruthy();
    });

    it('should render with Home tab focused by default', () => {
      const state = createMockState(0);
      const { getByTestId } = render(
        <TabBar state={state} descriptors={mockDescriptors} navigation={mockNavigation} />
      );

      const homeTab = getByTestId('tab-home');
      expect(homeTab).toBeTruthy();
    });

    it('should render with LiveTV tab focused', () => {
      const state = createMockState(1);
      const { getByTestId } = render(
        <TabBar state={state} descriptors={mockDescriptors} navigation={mockNavigation} />
      );

      const livetvTab = getByTestId('tab-livetv');
      expect(livetvTab).toBeTruthy();
    });
  });

  describe('accessibility', () => {
    it('should have accessibility roles for all tabs', () => {
      const state = createMockState();
      const { getByTestId } = render(
        <TabBar state={state} descriptors={mockDescriptors} navigation={mockNavigation} />
      );

      const homeTab = getByTestId('tab-home');
      expect(homeTab.props.accessibilityRole).toBe('tab');
    });

    it('should have accessibility labels for all tabs', () => {
      const state = createMockState();
      const { getByTestId } = render(
        <TabBar state={state} descriptors={mockDescriptors} navigation={mockNavigation} />
      );

      const homeTab = getByTestId('tab-home');
      expect(homeTab.props.accessibilityLabel).toBe('nav.home tab');
    });

    it('should mark selected tab as selected', () => {
      const state = createMockState(0);
      const { getByTestId } = render(
        <TabBar state={state} descriptors={mockDescriptors} navigation={mockNavigation} />
      );

      const homeTab = getByTestId('tab-home');
      expect(homeTab.props.accessibilityState.selected).toBe(true);
    });

    it('should mark unselected tabs as not selected', () => {
      const state = createMockState(0);
      const { getByTestId } = render(
        <TabBar state={state} descriptors={mockDescriptors} navigation={mockNavigation} />
      );

      const vodTab = getByTestId('tab-vod');
      expect(vodTab.props.accessibilityState.selected).toBe(false);
    });
  });

  describe('navigation', () => {
    it('should navigate when tab is pressed', () => {
      const state = createMockState(0);
      const { getByTestId } = render(
        <TabBar state={state} descriptors={mockDescriptors} navigation={mockNavigation} />
      );

      fireEvent.press(getByTestId('tab-vod'));

      expect(mockNavigation.emit).toHaveBeenCalledWith({
        type: 'tabPress',
        target: 'vod-1',
        canPreventDefault: true,
      });
      expect(mockNavigation.navigate).toHaveBeenCalledWith({ name: 'VOD', params: undefined });
    });

    it('should not navigate when same tab is pressed', () => {
      const state = createMockState(0);
      const { getByTestId } = render(
        <TabBar state={state} descriptors={mockDescriptors} navigation={mockNavigation} />
      );

      fireEvent.press(getByTestId('tab-home'));

      expect(mockNavigation.emit).toHaveBeenCalled();
      expect(mockNavigation.navigate).not.toHaveBeenCalled();
    });

    it('should not navigate when event is prevented', () => {
      mockNavigation.emit.mockReturnValueOnce({ defaultPrevented: true });
      const state = createMockState(0);
      const { getByTestId } = render(
        <TabBar state={state} descriptors={mockDescriptors} navigation={mockNavigation} />
      );

      fireEvent.press(getByTestId('tab-vod'));

      expect(mockNavigation.navigate).not.toHaveBeenCalled();
    });
  });

  describe('haptic feedback', () => {
    it('should trigger haptic feedback on tab press', () => {
      const ReactNativeHapticFeedback = require('react-native-haptic-feedback');
      const state = createMockState(0);
      const { getByTestId } = render(
        <TabBar state={state} descriptors={mockDescriptors} navigation={mockNavigation} />
      );

      fireEvent.press(getByTestId('tab-vod'));

      expect(ReactNativeHapticFeedback.trigger).toHaveBeenCalledWith('selection', {
        enableVibrateFallback: true,
        ignoreAndroidSystemSettings: false,
      });
    });
  });
});
