// Import the functions you need from the SDKs you need
import { initializeApp } from 'firebase/app';
import { getAnalytics, Analytics } from 'firebase/analytics';
import { getAuth, GoogleAuthProvider, Auth, browserLocalPersistence, setPersistence } from 'firebase/auth';
import { enableAnalytics } from './config/environment';
import { getConfig } from './shared/config/env.config';

const env = getConfig();

// Firebase configuration from environment variables
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

// Initialize Firebase Auth
let auth: Auth | null = null;
let googleProvider: GoogleAuthProvider | null = null;

try {
  if (typeof window !== 'undefined') {
    auth = getAuth(app);
    setPersistence(auth, browserLocalPersistence);

    googleProvider = new GoogleAuthProvider();
    googleProvider.addScope('profile');
    googleProvider.addScope('email');
    googleProvider.setCustomParameters({ prompt: 'select_account' });

    console.log('Firebase Auth initialized successfully');
  }
} catch (error) {
  console.warn('Firebase Auth initialization failed:', error);
}

// Initialize Analytics with error handling and environment check
let analytics: Analytics | null = null;
try {
  if (typeof window !== 'undefined' && enableAnalytics) {
    analytics = getAnalytics(app);
    console.log('Firebase Analytics initialized successfully');
  } else if (!enableAnalytics) {
    console.log('Firebase Analytics disabled by environment configuration');
  }
} catch (error) {
  console.warn('Firebase Analytics initialization failed:', error);
}

export { app, analytics, auth, googleProvider };
