/**
 * Firebase Configuration for Bayit+ Web Platform
 *
 * This file demonstrates how to integrate @bayit/firebase-config
 * package for centralized Firebase configuration.
 *
 * USAGE:
 * 1. Rename this file to firebase.ts
 * 2. Set environment variables in .env:
 *    - VITE_FIREBASE_API_KEY
 *    - VITE_FIREBASE_AUTH_DOMAIN
 *    - VITE_FIREBASE_PROJECT_ID
 *    - VITE_FIREBASE_STORAGE_BUCKET
 *    - VITE_FIREBASE_MESSAGING_SENDER_ID
 *    - VITE_FIREBASE_APP_ID
 *    - VITE_FIREBASE_MEASUREMENT_ID (optional)
 * 3. Import this file where Firebase is needed
 */

import { getFirebaseConfig } from '@bayit/firebase-config';
import { initializeApp, FirebaseApp } from 'firebase/app';
import { getAuth, Auth } from 'firebase/auth';
import { getFirestore, Firestore } from 'firebase/firestore';
import { getStorage, FirebaseStorage } from 'firebase/storage';
import { getAnalytics, Analytics } from 'firebase/analytics';

// Get validated Firebase configuration from shared package
// Fails fast if any required configuration is missing
const firebaseConfig = getFirebaseConfig();

// Initialize Firebase app
const app: FirebaseApp = initializeApp(firebaseConfig);

// Initialize Firebase services
export const auth: Auth = getAuth(app);
export const db: Firestore = getFirestore(app);
export const storage: FirebaseStorage = getStorage(app);

// Analytics (conditional - only in browser environment)
let analytics: Analytics | null = null;
if (typeof window !== 'undefined' && firebaseConfig.measurementId) {
  analytics = getAnalytics(app);
}

export { analytics };

// Export the initialized app
export default app;

/**
 * Example usage in components:
 *
 * import { auth, db } from '@/config/firebase';
 * import { signInWithEmailAndPassword } from 'firebase/auth';
 * import { collection, query, getDocs } from 'firebase/firestore';
 *
 * // Authentication
 * await signInWithEmailAndPassword(auth, email, password);
 *
 * // Firestore
 * const q = query(collection(db, 'users'));
 * const querySnapshot = await getDocs(q);
 */
