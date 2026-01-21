/**
 * Firebase Configuration for CVPlus Platform
*/
import * as admin from 'firebase-admin';
import { initializeApp } from 'firebase-admin/app';
import { getFirestore, Timestamp, FieldValue } from 'firebase-admin/firestore';

// Initialize Firebase Admin SDK
const app = initializeApp();

// Export Firestore database instance
export const db = getFirestore(app);

// Export Firebase Admin for other modules
export { admin };

// Export Firestore utilities
export { Timestamp, FieldValue };

// Export app instance
export { app };