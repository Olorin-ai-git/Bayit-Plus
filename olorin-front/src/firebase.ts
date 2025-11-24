// Import the functions you need from the SDKs you need
import { initializeApp } from 'firebase/app';
import { getAnalytics, Analytics } from 'firebase/analytics';
import { enableAnalytics } from './config/environment';
import { getConfig } from './shared/config/env.config';

const env = getConfig();

// Your web app's Firebase configuration
// For Firebase JS SDK v7.20.0 and later, measurementId is optional
const firebaseConfig = {
  apiKey: env.firebase?.apiKey || '',
  authDomain: env.firebase?.authDomain || '',
  projectId: env.firebase?.projectId || '',
  storageBucket: env.firebase?.storageBucket || '',
  messagingSenderId: env.firebase?.messagingSenderId || '',
  appId: env.firebase?.appId || '',
  measurementId: env.firebase?.measurementId || '',
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);

// Initialize Analytics with error handling and environment check
let analytics: Analytics | null = null;
try {
  // Only initialize analytics in the browser environment and when enabled
  if (typeof window !== 'undefined' && enableAnalytics) {
    analytics = getAnalytics(app);
    console.log('🔥 Firebase Analytics initialized successfully');
  } else if (!enableAnalytics) {
    console.log('📊 Firebase Analytics disabled by environment configuration');
  }
} catch (error) {
  console.warn('Firebase Analytics initialization failed:', error);
}

export { app, analytics };
