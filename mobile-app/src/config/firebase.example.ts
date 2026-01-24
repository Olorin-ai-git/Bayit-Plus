/**
 * Firebase Configuration for Bayit+ Mobile Platform
 *
 * This file demonstrates how to integrate @bayit/firebase-config
 * package for centralized Firebase configuration in React Native.
 *
 * USAGE:
 * 1. Rename this file to firebase.ts
 * 2. Set environment variables in .env:
 *    - FIREBASE_API_KEY
 *    - FIREBASE_AUTH_DOMAIN
 *    - FIREBASE_PROJECT_ID
 *    - FIREBASE_STORAGE_BUCKET
 *    - FIREBASE_MESSAGING_SENDER_ID
 *    - FIREBASE_APP_ID
 *    - FIREBASE_MEASUREMENT_ID (optional)
 * 3. Import this file where Firebase is needed
 *
 * IMPORTANT: React Native requires special persistence configuration
 * for Firebase Auth using AsyncStorage.
 */

import { getFirebaseConfig } from '@bayit/firebase-config';
import { initializeApp, FirebaseApp } from 'firebase/app';
import {
  initializeAuth,
  getReactNativePersistence,
  Auth,
} from 'firebase/auth';
import { getFirestore, Firestore } from 'firebase/firestore';
import { getStorage, FirebaseStorage } from 'firebase/storage';
import AsyncStorage from '@react-native-async-storage/async-storage';

// Get validated Firebase configuration from shared package
// Fails fast if any required configuration is missing
const firebaseConfig = getFirebaseConfig();

// Initialize Firebase app
const app: FirebaseApp = initializeApp(firebaseConfig);

// Initialize Firebase Auth with React Native persistence
// CRITICAL: Must use getReactNativePersistence for mobile
export const auth: Auth = initializeAuth(app, {
  persistence: getReactNativePersistence(AsyncStorage),
});

// Initialize other Firebase services
export const db: Firestore = getFirestore(app);
export const storage: FirebaseStorage = getStorage(app);

// Export the initialized app
export default app;

/**
 * Example usage in React Native components:
 *
 * import { auth, db } from '@/config/firebase';
 * import { signInWithEmailAndPassword } from 'firebase/auth';
 * import { collection, query, getDocs } from 'firebase/firestore';
 *
 * // Authentication
 * const handleLogin = async () => {
 *   try {
 *     const userCredential = await signInWithEmailAndPassword(
 *       auth,
 *       email,
 *       password
 *     );
 *     console.log('User logged in:', userCredential.user);
 *   } catch (error) {
 *     console.error('Login error:', error);
 *   }
 * };
 *
 * // Firestore
 * const fetchUsers = async () => {
 *   const q = query(collection(db, 'users'));
 *   const querySnapshot = await getDocs(q);
 *   querySnapshot.forEach((doc) => {
 *     console.log(doc.id, doc.data());
 *   });
 * };
 */
