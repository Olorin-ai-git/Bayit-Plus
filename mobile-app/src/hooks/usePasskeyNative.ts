/**
 * Hook: usePasskeyNative
 *
 * Native passkey integration hook for iOS and Android.
 * Handles platform-specific passkey APIs for registration,
 * authentication, listing, and removal of passkeys.
 */

import { useState, useCallback, useEffect } from 'react';
import { Platform, NativeModules } from 'react-native';
import { securityService } from '@bayit/shared-services';
import logger from '@/utils/logger';

const moduleLogger = logger.scope('usePasskeyNative');
const { PasskeyModule } = NativeModules;

export interface Passkey {
  id: string;
  deviceName: string;
  createdAt: string;
  lastUsed: string;
  platform: string;
}

interface UsePasskeyNativeResult {
  passkeys: Passkey[];
  isLoading: boolean;
  isRegistering: boolean;
  isAuthenticating: boolean;
  error: string | null;
  isSupported: boolean;
  loadPasskeys: () => Promise<void>;
  registerPasskey: (displayName: string) => Promise<boolean>;
  authenticateWithPasskey: () => Promise<boolean>;
  removePasskey: (passkeyId: string) => Promise<boolean>;
}

const checkPlatformSupport = (): boolean => {
  if (Platform.OS === 'ios') return parseInt(String(Platform.Version), 10) >= 16;
  if (Platform.OS === 'android') return typeof Platform.Version === 'number' && Platform.Version >= 28;
  return false;
};

const RP_ID = Platform.select({ ios: 'bayit.tv', default: 'bayit.tv' });

export const usePasskeyNative = (): UsePasskeyNativeResult => {
  const [passkeys, setPasskeys] = useState<Passkey[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isRegistering, setIsRegistering] = useState(false);
  const [isAuthenticating, setIsAuthenticating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const isSupported = checkPlatformSupport();

  const loadPasskeys = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const devices = await securityService.getConnectedDevices();
      setPasskeys(
        devices
          .filter((d) => d.type === 'mobile' || d.type === 'tablet')
          .map((d) => ({
            id: d.id, deviceName: d.name, createdAt: d.lastActive,
            lastUsed: d.lastActive, platform: d.platform ?? Platform.OS,
          })),
      );
    } catch (err) {
      moduleLogger.error('Failed to load passkeys', err);
      setError('passkey.loadFailed');
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    if (isSupported) loadPasskeys();
  }, [isSupported, loadPasskeys]);

  const registerPasskey = useCallback(async (displayName: string): Promise<boolean> => {
    if (!isSupported) { setError('passkey.notSupported'); return false; }
    setIsRegistering(true);
    setError(null);
    try {
      const challenge = (await securityService.enableTwoFactor()).secret;
      if (!PasskeyModule?.createCredential) {
        moduleLogger.error('PasskeyModule.createCredential not available');
        setError('passkey.moduleUnavailable');
        return false;
      }
      const result = await PasskeyModule.createCredential({
        challenge, displayName, rpId: RP_ID, rpName: 'Bayit+',
      });
      await securityService.enableBiometric();
      moduleLogger.info('Passkey registered', { credentialId: result.credentialId });
      await loadPasskeys();
      return true;
    } catch (err) {
      moduleLogger.error('Passkey registration failed', err);
      setError('passkey.registrationFailed');
      return false;
    } finally {
      setIsRegistering(false);
    }
  }, [isSupported, loadPasskeys]);

  const authenticateWithPasskey = useCallback(async (): Promise<boolean> => {
    if (!isSupported) { setError('passkey.notSupported'); return false; }
    setIsAuthenticating(true);
    setError(null);
    try {
      if (!PasskeyModule?.getCredential) {
        moduleLogger.error('PasskeyModule.getCredential not available');
        setError('passkey.moduleUnavailable');
        return false;
      }
      const authResult = await PasskeyModule.getCredential({ rpId: RP_ID });
      const verified = await securityService.verifyTwoFactor(authResult.credentialId);
      if (verified) moduleLogger.info('Passkey authentication successful');
      return verified;
    } catch (err) {
      moduleLogger.error('Passkey authentication failed', err);
      setError('passkey.authenticationFailed');
      return false;
    } finally {
      setIsAuthenticating(false);
    }
  }, [isSupported]);

  const removePasskey = useCallback(async (passkeyId: string): Promise<boolean> => {
    setIsLoading(true);
    setError(null);
    try {
      await securityService.removeDevice(passkeyId);
      setPasskeys((prev) => prev.filter((p) => p.id !== passkeyId));
      moduleLogger.info('Passkey removed', { passkeyId });
      return true;
    } catch (err) {
      moduleLogger.error('Passkey removal failed', err);
      setError('passkey.removeFailed');
      return false;
    } finally {
      setIsLoading(false);
    }
  }, []);

  return {
    passkeys, isLoading, isRegistering, isAuthenticating,
    error, isSupported, loadPasskeys, registerPasskey,
    authenticateWithPasskey, removePasskey,
  };
};
