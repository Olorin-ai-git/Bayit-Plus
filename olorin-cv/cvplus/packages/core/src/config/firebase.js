/**
 * Firebase Admin SDK Configuration
 * Provides centralized access to Firebase Admin services
 */
import * as admin from 'firebase-admin';
import { getFirestore } from 'firebase-admin/firestore';
import { getStorage } from 'firebase-admin/storage';
// Initialize Firebase Admin if not already initialized
if (!admin.apps.length) {
    if (process.env.FUNCTIONS_EMULATOR === 'true') {
        // Initialize for emulator environment
        admin.initializeApp({
            projectId: process.env.PROJECT_ID || 'getmycv-ai',
            storageBucket: 'getmycv-ai.firebasestorage.app'
        });
    }
    else {
        // Initialize for production
        admin.initializeApp();
    }
}
// Export commonly used services
export const db = getFirestore();
export const storage = getStorage();
export const auth = admin.auth();
// Export admin for direct access when needed
export { admin };
// Export specific admin modules
export { FieldValue } from 'firebase-admin/firestore';
//# sourceMappingURL=firebase.js.map