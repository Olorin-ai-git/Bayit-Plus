/**
 * Checkout Page Component
 * 
 * Integrates device fingerprint SDK for fraud detection during checkout.
 */

import React, { useEffect, useState, useRef } from 'react';
import deviceFingerprintService, { DeviceSignal } from '../../services/deviceFingerprintService';

interface CheckoutPageProps {
  transactionId?: string;
  userId?: string;
  onCheckoutComplete?: (result: any) => void;
}

export const CheckoutPage: React.FC<CheckoutPageProps> = ({
  transactionId,
  userId,
  onCheckoutComplete,
}) => {
  const [deviceId, setDeviceId] = useState<string | null>(null);
  const [fingerprintLoaded, setFingerprintLoaded] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const fingerprintRef = useRef<any>(null);

  useEffect(() => {
    initializeFingerprintSDK();
    return () => {
      cleanupFingerprintSDK();
    };
  }, []);

  const initializeFingerprintSDK = async () => {
    try {
      // Determine SDK provider from tenant config (default to Fingerprint Pro)
      // In production, this would come from tenant configuration API
      const sdkProvider = 'fingerprint_pro'; // TODO: Get from tenant config
      
      if (sdkProvider === 'fingerprint_pro') {
        await initializeFingerprintPro();
      } else if (sdkProvider === 'seon') {
        await initializeSEON();
      } else if (sdkProvider === 'ipqs') {
        await initializeIPQS();
      }
    } catch (err: any) {
      console.error('Failed to initialize fingerprint SDK:', err);
      setError(`SDK initialization failed: ${err.message}`);
      // Fallback to User-Agent based fingerprinting
      handleSDKFailure();
    }
  };

  const initializeFingerprintPro = async () => {
    try {
      // Dynamic import of Fingerprint Pro SDK
      const FingerprintJS = await import('@fingerprintjs/fingerprintjs-pro');
      
      // Initialize with API key (should come from config)
      const fpPromise = FingerprintJS.load({
        apiKey: process.env.REACT_APP_FINGERPRINT_PRO_API_KEY || '',
      });
      
      const fp = await fpPromise;
      
      // Get visitor ID
      const result = await fp.get();
      const visitorId = result.visitorId;
      
      setDeviceId(visitorId);
      setFingerprintLoaded(true);
      fingerprintRef.current = fp;
      
      console.log('Fingerprint Pro initialized:', visitorId);
    } catch (err: any) {
      console.error('Fingerprint Pro initialization failed:', err);
      throw err;
    }
  };

  const initializeSEON = async () => {
    // TODO: Implement SEON SDK initialization
    console.warn('SEON SDK not yet implemented');
    throw new Error('SEON SDK not implemented');
  };

  const initializeIPQS = async () => {
    // TODO: Implement IPQS SDK initialization
    console.warn('IPQS SDK not yet implemented');
    throw new Error('IPQS SDK not implemented');
  };

  const cleanupFingerprintSDK = () => {
    // Cleanup if needed
    fingerprintRef.current = null;
  };

  const handleSDKFailure = async () => {
    // Fallback: Use User-Agent based fingerprinting
    if (transactionId) {
      try {
        const userAgent = navigator.userAgent;
        await deviceFingerprintService.sendFallbackSignal(
          transactionId,
          userId,
          userAgent
        );
        console.log('Fallback device signal sent');
      } catch (err: any) {
        console.error('Failed to send fallback signal:', err);
      }
    }
  };

  const captureDeviceSignal = async (): Promise<DeviceSignal | null> => {
    if (!deviceId || !fingerprintLoaded) {
      console.warn('Device fingerprint not ready');
      return null;
    }

    try {
      // Get additional fingerprint data
      let browserFingerprint: Record<string, any> = {};
      let behavioralSignals: Record<string, any> = {};

      if (fingerprintRef.current) {
        const result = await fingerprintRef.current.get();
        browserFingerprint = {
          visitorId: result.visitorId,
          confidence: result.confidence?.score,
          incognito: result.incognito,
          browserName: result.browserName,
          browserVersion: result.browserVersion,
          os: result.os,
          osVersion: result.osVersion,
          device: result.device,
        };
      }

      const signal: DeviceSignal = {
        device_id: deviceId,
        transaction_id: transactionId,
        user_id: userId,
        confidence_score: browserFingerprint.confidence || 0.9,
        browser_fingerprint: browserFingerprint,
        behavioral_signals: behavioralSignals,
        sdk_provider: 'fingerprint_pro',
      };

      // Send to backend
      const response = await deviceFingerprintService.sendDeviceSignal(signal);
      console.log('Device signal sent:', response);

      return signal;
    } catch (err: any) {
      console.error('Failed to capture device signal:', err);
      setError(`Failed to capture device signal: ${err.message}`);
      return null;
    }
  };

  const handleCheckout = async () => {
    // Capture device signal before checkout
    await captureDeviceSignal();
    
    // Proceed with checkout logic
    if (onCheckoutComplete) {
      onCheckoutComplete({ deviceId, transactionId });
    }
  };

  return (
    <div className="checkout-page p-6 max-w-2xl mx-auto">
      <h2 className="text-2xl font-bold mb-6">Checkout</h2>

      {error && (
        <div className="mb-4 p-3 bg-yellow-50 border border-yellow-200 rounded-md">
          <p className="text-sm text-yellow-800">{error}</p>
          <p className="text-xs text-yellow-600 mt-1">
            Checkout will continue with basic device identification.
          </p>
        </div>
      )}

      {fingerprintLoaded && deviceId && (
        <div className="mb-4 p-3 bg-green-50 border border-green-200 rounded-md">
          <p className="text-sm text-green-800">
            Device fingerprinting active (ID: {deviceId.slice(0, 8)}...)
          </p>
        </div>
      )}

      <div className="space-y-4">
        {/* Checkout form would go here */}
        <div className="p-4 border border-gray-200 rounded-md">
          <p className="text-gray-600">Checkout form placeholder</p>
          <p className="text-sm text-gray-500 mt-2">
            Transaction ID: {transactionId || 'Not set'}
          </p>
        </div>

        <button
          onClick={handleCheckout}
          className="w-full px-4 py-2 bg-blue-500 text-white rounded-md hover:bg-blue-600 font-medium"
        >
          Complete Checkout
        </button>
      </div>
    </div>
  );
};

export default CheckoutPage;

