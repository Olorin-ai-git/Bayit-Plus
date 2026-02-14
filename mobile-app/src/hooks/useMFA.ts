/**
 * Hook: useMFA
 *
 * Multi-factor authentication state management hook.
 * Handles the full MFA setup flow: method selection, TOTP/SMS configuration,
 * code verification, and backup code generation.
 */

import { useState, useCallback, useRef } from 'react';
import { securityService } from '@bayit/shared-services';
import logger from '@/utils/logger';

const moduleLogger = logger.scope('useMFA');

type MFAMethod = 'totp' | 'sms';

type MFAStep = 'select_method' | 'configure' | 'verify' | 'backup_codes' | 'complete';

interface MFASetupData {
  secret: string;
  qrCodeUri: string;
  backupCodes: string[];
}

interface UseMFAResult {
  step: MFAStep;
  method: MFAMethod | null;
  setupData: MFASetupData | null;
  isLoading: boolean;
  error: string | null;
  verificationAttempts: number;
  selectMethod: (method: MFAMethod) => void;
  initiateSetup: () => Promise<void>;
  verifyCode: (code: string) => Promise<boolean>;
  regenerateBackupCodes: () => Promise<void>;
  goToStep: (step: MFAStep) => void;
  reset: () => void;
}

const MAX_VERIFICATION_ATTEMPTS = 5;

export const useMFA = (): UseMFAResult => {
  const [step, setStep] = useState<MFAStep>('select_method');
  const [method, setMethod] = useState<MFAMethod | null>(null);
  const [setupData, setSetupData] = useState<MFASetupData | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [verificationAttempts, setVerificationAttempts] = useState(0);
  const setupDataRef = useRef<MFASetupData | null>(null);

  const selectMethod = useCallback((selectedMethod: MFAMethod) => {
    setMethod(selectedMethod);
    setError(null);
    setStep('configure');
  }, []);

  const initiateSetup = useCallback(async () => {
    if (!method) {
      setError('mfa.noMethodSelected');
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      const response = await securityService.enableTwoFactor();
      const data: MFASetupData = {
        secret: response.secret,
        qrCodeUri: response.qrCode,
        backupCodes: [],
      };
      setSetupData(data);
      setupDataRef.current = data;
      setStep('verify');
    } catch (err) {
      moduleLogger.error('MFA setup initiation failed', err);
      setError('mfa.setupFailed');
    } finally {
      setIsLoading(false);
    }
  }, [method]);

  const verifyCode = useCallback(async (code: string): Promise<boolean> => {
    if (verificationAttempts >= MAX_VERIFICATION_ATTEMPTS) {
      setError('mfa.maxAttemptsReached');
      return false;
    }

    setIsLoading(true);
    setError(null);

    try {
      const verified = await securityService.verifyTwoFactor(code);

      if (verified) {
        setStep('backup_codes');
        setVerificationAttempts(0);
        return true;
      }

      const newAttempts = verificationAttempts + 1;
      setVerificationAttempts(newAttempts);
      if (newAttempts >= MAX_VERIFICATION_ATTEMPTS) {
        setError('mfa.maxAttemptsReached');
      } else {
        setError('mfa.invalidCode');
      }
      return false;
    } catch (err) {
      moduleLogger.error('MFA verification failed', err);
      setError('mfa.verificationFailed');
      return false;
    } finally {
      setIsLoading(false);
    }
  }, [verificationAttempts]);

  const regenerateBackupCodes = useCallback(async () => {
    setIsLoading(true);
    setError(null);

    try {
      const response = await securityService.enableTwoFactor();
      const updatedData: MFASetupData = {
        secret: setupDataRef.current?.secret ?? response.secret,
        qrCodeUri: setupDataRef.current?.qrCodeUri ?? response.qrCode,
        backupCodes: [],
      };
      setSetupData(updatedData);
      setupDataRef.current = updatedData;
    } catch (err) {
      moduleLogger.error('Backup code regeneration failed', err);
      setError('mfa.regenerateFailed');
    } finally {
      setIsLoading(false);
    }
  }, []);

  const goToStep = useCallback((targetStep: MFAStep) => {
    setError(null);
    setStep(targetStep);
  }, []);

  const reset = useCallback(() => {
    setStep('select_method');
    setMethod(null);
    setSetupData(null);
    setIsLoading(false);
    setError(null);
    setVerificationAttempts(0);
    setupDataRef.current = null;
  }, []);

  return {
    step,
    method,
    setupData,
    isLoading,
    error,
    verificationAttempts,
    selectMethod,
    initiateSetup,
    verifyCode,
    regenerateBackupCodes,
    goToStep,
    reset,
  };
};
