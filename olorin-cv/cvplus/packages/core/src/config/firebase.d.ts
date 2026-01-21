/**
 * Firebase Admin SDK Configuration
 * Provides centralized access to Firebase Admin services
  */
import * as admin from 'firebase-admin';
export declare const db: admin.firestore.Firestore;
export declare const storage: import("firebase-admin/storage").Storage;
export declare const auth: import("firebase-admin/auth").Auth;
export { admin };
export { FieldValue } from 'firebase-admin/firestore';
//# sourceMappingURL=firebase.d.ts.map