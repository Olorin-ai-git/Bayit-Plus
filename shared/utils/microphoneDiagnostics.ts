/**
 * Microphone Diagnostics Utility
 *
 * Provides comprehensive diagnostics for microphone access issues.
 * Run this to understand why microphone may not be working.
 */

import { logger } from './logger';

// Scoped logger for microphone diagnostics
const micLogger = logger.scope('MicrophoneDiagnostics');

// Diagnostic mode check (console output allowed for user-facing diagnostics)
const isDiagnosticMode = typeof process !== 'undefined' &&
  (process.env.NODE_ENV === 'development' || process.env.ENABLE_MIC_DIAGNOSTICS === 'true');

export interface MicrophoneDiagnostics {
  isSecureContext: boolean;
  hasNavigator: boolean;
  hasMediaDevices: boolean;
  hasGetUserMedia: boolean;
  hasEnumerateDevices: boolean;
  audioDevices: AudioDeviceInfo[];
  permissionStatus: 'granted' | 'denied' | 'prompt' | 'unknown';
  canAccessMicrophone: boolean;
  error?: string;
  recommendations: string[];
}

export interface AudioDeviceInfo {
  deviceId: string;
  label: string;
  groupId: string;
}

/**
 * Run comprehensive microphone diagnostics
 */
export async function runMicrophoneDiagnostics(): Promise<MicrophoneDiagnostics> {
  const diagnostics: MicrophoneDiagnostics = {
    isSecureContext: false,
    hasNavigator: false,
    hasMediaDevices: false,
    hasGetUserMedia: false,
    hasEnumerateDevices: false,
    audioDevices: [],
    permissionStatus: 'unknown',
    canAccessMicrophone: false,
    recommendations: [],
  };

  // Check secure context (HTTPS or localhost)
  diagnostics.isSecureContext = typeof window !== 'undefined' && window.isSecureContext;
  if (!diagnostics.isSecureContext) {
    diagnostics.recommendations.push(
      'Microphone requires HTTPS. Access the app at https:// or localhost.'
    );
  }

  // Check navigator
  diagnostics.hasNavigator = typeof navigator !== 'undefined';
  if (!diagnostics.hasNavigator) {
    diagnostics.error = 'Navigator API not available';
    diagnostics.recommendations.push('Your browser does not support the Navigator API.');
    return diagnostics;
  }

  // Check mediaDevices
  diagnostics.hasMediaDevices = !!navigator.mediaDevices;
  if (!diagnostics.hasMediaDevices) {
    diagnostics.error = 'MediaDevices API not available';
    diagnostics.recommendations.push(
      'Your browser does not support the MediaDevices API. Try Chrome, Firefox, Safari, or Edge.'
    );
    return diagnostics;
  }

  // Check getUserMedia
  diagnostics.hasGetUserMedia = !!navigator.mediaDevices.getUserMedia;
  if (!diagnostics.hasGetUserMedia) {
    diagnostics.error = 'getUserMedia not available';
    diagnostics.recommendations.push(
      'Your browser does not support getUserMedia. Try updating your browser.'
    );
    return diagnostics;
  }

  // Check enumerateDevices
  diagnostics.hasEnumerateDevices = !!navigator.mediaDevices.enumerateDevices;

  // Check permission status if available
  if (typeof navigator !== 'undefined' && 'permissions' in navigator) {
    try {
      const permissionStatus = await navigator.permissions.query({
        name: 'microphone' as PermissionName,
      });
      diagnostics.permissionStatus = permissionStatus.state as 'granted' | 'denied' | 'prompt';

      if (diagnostics.permissionStatus === 'denied') {
        diagnostics.recommendations.push(
          'Microphone permission is denied. Click the lock icon in the address bar and allow microphone access.'
        );
      }
    } catch {
      // Permissions API may not support microphone query in all browsers
      diagnostics.permissionStatus = 'unknown';
    }
  }

  // Enumerate audio devices
  if (diagnostics.hasEnumerateDevices) {
    try {
      const devices = await navigator.mediaDevices.enumerateDevices();
      diagnostics.audioDevices = devices
        .filter((d) => d.kind === 'audioinput')
        .map((d) => ({
          deviceId: d.deviceId ? `${d.deviceId.slice(0, 8)}...` : 'no-id',
          label: d.label || '(permission required to see device name)',
          groupId: d.groupId ? `${d.groupId.slice(0, 8)}...` : 'no-group',
        }));

      if (diagnostics.audioDevices.length === 0) {
        diagnostics.recommendations.push(
          'No audio input devices detected. Please:',
          '  1. Connect a microphone to your computer',
          '  2. Check your system audio settings',
          '  3. Ensure no other app is exclusively using the microphone',
          '  4. Try restarting your browser'
        );
      }
    } catch (err) {
      diagnostics.error = `Failed to enumerate devices: ${err instanceof Error ? err.message : 'Unknown error'}`;
    }
  }

  // Try to actually access the microphone
  try {
    const stream = await navigator.mediaDevices.getUserMedia({ audio: true });

    // Success! Get track info
    const tracks = stream.getAudioTracks();
    if (tracks.length > 0) {
      diagnostics.canAccessMicrophone = true;

      // Update device list with labels (now that we have permission)
      const devicesAfterPermission = await navigator.mediaDevices.enumerateDevices();
      diagnostics.audioDevices = devicesAfterPermission
        .filter((d) => d.kind === 'audioinput')
        .map((d) => ({
          deviceId: d.deviceId ? `${d.deviceId.slice(0, 8)}...` : 'no-id',
          label: d.label || 'Unknown device',
          groupId: d.groupId ? `${d.groupId.slice(0, 8)}...` : 'no-group',
        }));

      // Log active track info (system logging)
      micLogger.info('Active audio track detected', {
        label: tracks[0].label,
        enabled: tracks[0].enabled,
        muted: tracks[0].muted,
        readyState: tracks[0].readyState,
        trackCount: tracks.length,
      });
    }

    // Stop the stream after testing
    stream.getTracks().forEach((track) => track.stop());
  } catch (err: any) {
    diagnostics.canAccessMicrophone = false;
    const errorName = err?.name || '';
    const errorMessage = err?.message || '';

    if (errorName === 'NotFoundError' || errorMessage.includes('not found') || errorMessage.includes('Requested device')) {
      diagnostics.error = 'No microphone detected';
      diagnostics.recommendations.push(
        'No microphone was found. Please ensure:',
        '  1. A microphone is physically connected',
        '  2. The microphone is enabled in system settings',
        '  3. No other application is exclusively using the microphone',
        '  4. Your browser can access the microphone (try testing at https://webrtc.github.io/samples/src/content/devices/input-output/)'
      );
    } else if (errorName === 'NotAllowedError' || errorName === 'PermissionDeniedError') {
      diagnostics.error = 'Microphone permission denied';
      diagnostics.permissionStatus = 'denied';
      diagnostics.recommendations.push(
        'Microphone permission was denied. To fix:',
        '  1. Click the lock icon in the browser address bar',
        '  2. Find "Microphone" and change it to "Allow"',
        '  3. Refresh the page'
      );
    } else if (errorName === 'NotReadableError' || errorName === 'AbortError') {
      diagnostics.error = 'Microphone in use by another application';
      diagnostics.recommendations.push(
        'The microphone might be in use by another application. Please:',
        '  1. Close other apps that might be using the microphone (Zoom, Teams, etc.)',
        '  2. Try again after closing those apps'
      );
    } else {
      diagnostics.error = `${errorName}: ${errorMessage}`;
      diagnostics.recommendations.push(
        'An unexpected error occurred. Please try:',
        '  1. Refreshing the page',
        '  2. Restarting your browser',
        '  3. Checking your browser and system privacy settings'
      );
    }
  }

  return diagnostics;
}

/**
 * Print diagnostics to console in a readable format
 * System logging (always) + User-facing console output (diagnostic mode only)
 */
export async function printMicrophoneDiagnostics(): Promise<void> {
  const diagnostics = await runMicrophoneDiagnostics();

  // System logging (always active)
  micLogger.info('Microphone diagnostics completed', {
    canAccess: diagnostics.canAccessMicrophone,
    isSecureContext: diagnostics.isSecureContext,
    permissionStatus: diagnostics.permissionStatus,
    audioDeviceCount: diagnostics.audioDevices.length,
    hasError: !!diagnostics.error,
    error: diagnostics.error,
    recommendationCount: diagnostics.recommendations.length,
  });

  // User-facing console output (diagnostic mode only)
  if (isDiagnosticMode) {
    console.log('======================================');
    console.log('   MICROPHONE DIAGNOSTICS REPORT');
    console.log('======================================');

    console.log('\n📋 Environment:');
    console.log(`  • Secure context (HTTPS): ${diagnostics.isSecureContext ? '✅ Yes' : '❌ No'}`);
    console.log(`  • Navigator API: ${diagnostics.hasNavigator ? '✅ Available' : '❌ Missing'}`);
    console.log(`  • MediaDevices API: ${diagnostics.hasMediaDevices ? '✅ Available' : '❌ Missing'}`);
    console.log(`  • getUserMedia: ${diagnostics.hasGetUserMedia ? '✅ Available' : '❌ Missing'}`);

    console.log('\n🔐 Permission Status:', diagnostics.permissionStatus);

    console.log('\n🎤 Audio Devices Found:', diagnostics.audioDevices.length);
    diagnostics.audioDevices.forEach((device, i) => {
      console.log(`  ${i + 1}. ${device.label}`);
    });

    console.log('\n✅ Can Access Microphone:', diagnostics.canAccessMicrophone ? 'Yes' : 'No');

    if (diagnostics.error) {
      console.log('\n❌ Error:', diagnostics.error);
    }

    if (diagnostics.recommendations.length > 0) {
      console.log('\n💡 Recommendations:');
      diagnostics.recommendations.forEach((rec) => {
        console.log(`  ${rec}`);
      });
    }

    console.log('\n======================================');
    console.log('   END OF DIAGNOSTICS REPORT');
    console.log('======================================');
  }
}

/**
 * Expose to window for easy console access
 */
if (typeof window !== 'undefined') {
  (window as any).runMicDiagnostics = printMicrophoneDiagnostics;

  // System logging (always)
  micLogger.info('Microphone diagnostics module loaded', {
    isDiagnosticMode,
    windowFunctionExposed: 'window.runMicDiagnostics',
  });

  // User-facing output (diagnostic mode only)
  if (isDiagnosticMode) {
    console.log('[MicDiag] Microphone diagnostics loaded. Run window.runMicDiagnostics() to diagnose issues.');
  }
}

export default {
  runMicrophoneDiagnostics,
  printMicrophoneDiagnostics,
};
