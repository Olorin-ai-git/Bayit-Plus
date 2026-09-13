import {
  React,
  act,
  renderHook,
  I18nManager,
  GlassButton,
  useGlassTheme,
  useNotifications,
  useRadarAnimation,
  useSpringAnimation,
  useTVFocus,
  useNotificationStore,
  AlertCompat,
  Notifications,
  getActionHint,
  getLevelLabel,
  getLiveRegionPriority,
  announceToScreenReader,
  isScreenReaderEnabled,
  useSwipeAnimation,
  useToastAnimation,
  getContainerWidth,
  getSwipeThreshold,
  arcPath,
  polarToCartesian,
  valueToAngle,
  formatLatency,
  getSizeConfig,
  getStatusColor,
  calculateScanAngle,
  isAnomalyInScanningRange,
  radarPolarToCartesian,
  performanceMonitor,
  clearTTSQueue,
  webExports,
  hookExports,
  storeExports,
  contextExports,
  compatExports,
  colors,
} from './public-contract-support';

describe("public utility and integration contracts", () => {
  beforeEach(() => {
      useNotificationStore.getState().clear();
      performanceMonitor.clear();
      clearTTSQueue();
      jest.useRealTimers();
    });
  
  it('covers theme and focus hook states', () => {
      const theme = renderHook(() => useGlassTheme()).result.current;
      expect(theme.colors).toBeDefined();
  
      for (const styleType of ['card', 'button', 'input', 'outline', 'none'] as const) {
        const callbacks = { onFocus: jest.fn(), onBlur: jest.fn() };
        const hook = renderHook(() => useTVFocus({ styleType, ...callbacks }));
        act(() => hook.result.current.handleFocus());
        expect(hook.result.current.isFocused).toBe(true);
        act(() => hook.result.current.handleBlur());
        expect(callbacks.onFocus).toHaveBeenCalled();
        expect(callbacks.onBlur).toHaveBeenCalled();
        hook.unmount();
      }
      expect(renderHook(() => useTVFocus({ tvOnly: true, animated: false })).result.current.isFocused).toBe(false);
    });
  
  it('loads every public package entry point', () => {
      expect(webExports.GlassButton).toBe(GlassButton);
      expect(hookExports.useGlassTheme).toBe(useGlassTheme);
      expect(storeExports.useNotificationStore).toBe(useNotificationStore);
      expect(contextExports.NotificationProvider).toBeDefined();
      expect(compatExports.AlertCompat).toBe(AlertCompat);
    });
  
  it('covers notification hook sanitization and imperative methods', () => {
      const hook = renderHook(() => useNotifications());
      act(() => {
        hook.result.current.showWithI18n({ level: 'info', message: '<b>Hello</b>', title: 'Title' });
        hook.result.current.showWithI18n({ level: 'warning' });
        hook.result.current.dismiss('missing');
        hook.result.current.clearByLevel('warning');
        Notifications.showDebug('Debug');
        Notifications.showInfo('Info');
        Notifications.showWarning('Warning');
        Notifications.showSuccess('Success');
        Notifications.showError('Error');
        Notifications.dismiss('missing');
        Notifications.clearByLevel('debug');
        Notifications.clear();
      });
    });
  
  it('advances radar and spring animation hooks', () => {
      let frameCallback: FrameRequestCallback | undefined;
      const request = jest.spyOn(global, 'requestAnimationFrame').mockImplementation((callback) => {
        frameCallback = callback;
        return 1;
      });
      const cancel = jest.spyOn(global, 'cancelAnimationFrame').mockImplementation();
      const now = jest.spyOn(Date, 'now').mockReturnValue(1000);
      const radar = renderHook(() => useRadarAnimation({ isScanning: true, scanDuration: 1000 }));
      now.mockReturnValue(1001);
      act(() => frameCallback?.(1001));
      now.mockReturnValue(1100);
      act(() => frameCallback?.(1100));
      expect(radar.result.current.isAnimating).toBe(true);
      expect(radar.result.current.isAnomalyGlowing(radar.result.current.scanAngle)).toBe(true);
      radar.unmount();
  
      const spring = renderHook(({ target }) => useSpringAnimation(target, { stiffness: 100, damping: 10, mass: 1 }), { initialProps: { target: 10 } });
      act(() => frameCallback?.(1116));
      spring.rerender({ target: 20 });
      spring.unmount();
      request.mockRestore();
      cancel.mockRestore();
      now.mockRestore();
    });
  
  it('covers visualization utility boundaries', () => {
      expect(valueToAngle(-1, 100, -120, 120)).toBe(-120);
      expect(valueToAngle(200, 100, -120, 120)).toBe(120);
      expect(valueToAngle(50, 0, -120, 120)).toBe(-120);
      expect(polarToCartesian(10, 10, 5, 0)).toEqual({ x: 10, y: 5 });
      expect(arcPath(10, 10, 5, 0, 180)).toContain('A 5 5');
      expect(getStatusColor('offline')).toBeTruthy();
      expect(getStatusColor('unknown' as never)).toBeTruthy();
      expect(getSizeConfig('sm').dotSize).toBe(8);
      expect(getSizeConfig('lg').dotSize).toBe(16);
      expect(getSizeConfig('unknown' as never).dotSize).toBe(12);
      expect(formatLatency(0)).toBe('<1ms');
      expect(radarPolarToCartesian(100, 100, 50, Math.PI / 2).x).toBeCloseTo(100);
      expect(calculateScanAngle(500, 1000)).toBeCloseTo(Math.PI);
      expect(isAnomalyInScanningRange(0.1, 0, 0.2)).toBe(true);
      expect(isAnomalyInScanningRange(1, 0, 0.2)).toBe(false);
    });
  
  it('covers toast accessibility and animation helpers', async () => {
      jest.useFakeTimers();
      expect(getLevelLabel('error')).toBe('Error');
      expect(getLiveRegionPriority('warning')).toBe('assertive');
      expect(getLiveRegionPriority('info')).toBe('polite');
      expect(getActionHint('retry')).toBe('Double tap to retry');
      announceToScreenReader('Message', 'Title', 'success');
      expect(document.body.querySelector('[aria-live="polite"]')).toBeTruthy();
      act(() => jest.runAllTimers());
      expect(await isScreenReaderEnabled()).toBe(false);
      expect(getContainerWidth()).toBe(400);
      expect(getContainerWidth(true)).toBe(500);
      expect(getSwipeThreshold()).toBe(80);
  
      const dismiss = jest.fn();
      const toastHook = renderHook(({ visible }) => useToastAnimation(visible, dismiss), { initialProps: { visible: true } });
      toastHook.rerender({ visible: false });
      const swipe = renderHook(() => useSwipeAnimation(toastHook.result.current.slideAnim, toastHook.result.current.opacityAnim, 20));
      act(() => {
        swipe.result.current.onSwipeUpdate(10);
        swipe.result.current.onSwipeUpdate(-10);
        swipe.result.current.onSwipeEnd(30, 0, dismiss);
        swipe.result.current.onSwipeEnd(0, 0, dismiss);
      });
  
      const originalRTL = I18nManager.isRTL;
      I18nManager.isRTL = true;
      try {
        const reduced = renderHook(({ visible }) => useToastAnimation(visible, dismiss, true), { initialProps: { visible: true } });
        reduced.rerender({ visible: false });
        const rtlSwipe = renderHook(() => useSwipeAnimation(reduced.result.current.slideAnim, reduced.result.current.opacityAnim));
        act(() => {
          rtlSwipe.result.current.onSwipeUpdate(-25);
          rtlSwipe.result.current.onSwipeUpdate(25);
          rtlSwipe.result.current.onSwipeEnd(-1, -600, dismiss);
        });
      } finally {
        I18nManager.isRTL = originalRTL;
      }
    });
});
