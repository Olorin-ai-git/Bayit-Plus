import {
  React,
  act,
  fireEvent,
  render,
  AccessibilityInfo,
  Platform,
  Text,
  GlassToast,
  GlassToastContainer,
  useNotificationStore,
  alertCompat,
  AlertCompat,
  GlassModalCompat,
  Notifications,
  isScreenReaderEnabled,
  performanceMonitor,
  withPerformanceTracking,
  announceNotification,
  clearTTSQueue,
  initNotificationTTS,
  ttsAnnouncementQueue,
} from './public-contract-support';
import type { Notification } from './public-contract-support';

describe("public utility and integration contracts", () => {
  beforeEach(() => {
      useNotificationStore.getState().clear();
      performanceMonitor.clear();
      clearTTSQueue();
      jest.useRealTimers();
    });
  
  it('covers toast rendering and notification containers', () => {
      const dismiss = jest.fn();
      const base: Notification = { id: 'toast', level: 'warning', title: 'Warning', message: 'Message', createdAt: 1, priority: 2, dismissable: true, action: { label: 'Retry', type: 'action', onPress: jest.fn() } };
      const toast = render(<GlassToast notification={base} onDismiss={dismiss} />);
      fireEvent.press(toast.getByText('Retry'));
      for (const button of toast.container.querySelectorAll('touchableopacity')) fireEvent.press(button);
  
      useNotificationStore.getState().add({ level: 'info', message: 'First' });
      useNotificationStore.getState().add({ level: 'error', message: 'Second' });
      render(<GlassToastContainer position="top" maxVisible={1} />);
      render(<GlassToastContainer position="bottom" maxVisible={2} />);
      render(<GlassToast notification={{ ...base, id: 'plain', level: 'info', title: undefined, action: undefined, dismissable: false }} onDismiss={dismiss} />);
      jest.useFakeTimers();
      render(<GlassToast notification={{ ...base, id: 'timed', level: 'success', duration: 10 }} onDismiss={dismiss} />);
      act(() => jest.advanceTimersByTime(10));
  
      const globalState = global as typeof globalThis & { __mockSafeAreaInsets?: { top: number; bottom: number; left: number; right: number } };
      const originalOS = Platform.OS;
      Platform.OS = 'ios';
      globalState.__mockSafeAreaInsets = { top: 60, bottom: 20, left: 0, right: 0 };
      try {
        render(<GlassToastContainer position="top" />);
      } finally {
        Platform.OS = originalOS;
        delete globalState.__mockSafeAreaInsets;
      }
    });
  
  it('covers compatibility APIs', () => {
      const show = jest.spyOn(Notifications, 'show');
      const onPress = jest.fn();
      alertCompat('Error', 'Failed', [{ text: 'Retry', onPress }], { cancelable: false });
      AlertCompat.alert('Warning', 'Caution');
      alertCompat('Success complete');
      alertCompat('Information');
      expect(show).toHaveBeenCalledTimes(4);
      show.mockRestore();
  
      jest.useFakeTimers();
      render(<GlassModalCompat visible type="error" title="Error" message="Failure" onClose={onPress} />);
      render(<GlassModalCompat visible type="success" message="Complete" />);
      render(<GlassModalCompat visible={false} message="Hidden" />);
      act(() => jest.runAllTimers());
      expect(onPress).toHaveBeenCalled();
    });
  
  it('records performance metrics and tracked component lifecycles', () => {
      const now = jest.spyOn(performance, 'now').mockReturnValueOnce(0).mockReturnValueOnce(20).mockReturnValueOnce(25).mockReturnValueOnce(30);
      const end = performanceMonitor.startMeasure('Direct');
      end();
      expect(performanceMonitor.getMetrics()).toHaveLength(1);
      expect(performanceMonitor.getAverageRenderTime('Direct')).toBe(20);
      expect(performanceMonitor.getMaxRenderTime('Direct')).toBe(20);
      expect(performanceMonitor.getAverageRenderTime('Missing')).toBe(0);
      expect(performanceMonitor.getMaxRenderTime('Missing')).toBe(0);
      for (let index = 0; index < 101; index += 1) performanceMonitor.startMeasure('Trimmed')();
      expect(performanceMonitor.getMetrics('Trimmed')).toHaveLength(100);
      const Tracked = withPerformanceTracking(({ name }: { name: string }) => <Text>{name}</Text>, 'Tracked');
      expect(Tracked.displayName).toBe('withPerformanceTracking(Tracked)');
      render(<Tracked name="Component" />).unmount();
      now.mockRestore();
    });
  
  it('announces notifications through configured TTS services', async () => {
      jest.useFakeTimers();
      const service = { speak: jest.fn().mockResolvedValue(undefined) };
      const ducking = { duck: jest.fn().mockResolvedValue(undefined), restore: jest.fn().mockResolvedValue(undefined) };
      initNotificationTTS(service, ducking);
      await announceNotification({ id: 'tts', level: 'error', title: 'Error', message: '<b>Failure</b>', createdAt: 1, priority: 3 });
      expect(service.speak).toHaveBeenCalledWith('Error. Failure', { priority: 'high', interruptible: false });
      expect(ducking.duck).toHaveBeenCalled();
      expect(ducking.restore).toHaveBeenCalled();
      await announceNotification({ id: 'debug', level: 'debug', message: 'Hidden', createdAt: 2, priority: 0 });
      ttsAnnouncementQueue.clearById('missing');
      act(() => jest.runOnlyPendingTimers());
      initNotificationTTS(null);
      clearTTSQueue();
    });
  
  it('handles TTS failures and screen-reader query failures', async () => {
      const error = jest.spyOn(console, 'error').mockImplementation();
      const service = { speak: jest.fn().mockRejectedValue(new Error('speak failed')) };
      initNotificationTTS(service);
      await announceNotification({ id: 'failed-tts', level: 'info', message: 'Failure', createdAt: 1, priority: 1 });
      expect(error).toHaveBeenCalled();
      error.mockRestore();
  
      const originalOS = Platform.OS;
      Platform.OS = 'ios';
      (AccessibilityInfo.isScreenReaderEnabled as jest.Mock).mockRejectedValueOnce(new Error('query failed'));
      try {
        expect(await isScreenReaderEnabled()).toBe(false);
      } finally {
        Platform.OS = originalOS;
      }
    });
});
