/**
 * Firebase Admin SDK Initialization
 * Follows Olorin ecosystem Firebase patterns from olorin-fraud
 */

import * as admin from 'firebase-admin';
import { getConfig } from './schema';

// Initialize Firebase Admin SDK
const config = getConfig();

if (!admin.apps.length) {
  const serviceAccount = config.firebase.credentialsJson
    ? JSON.parse(config.firebase.credentialsJson)
    : undefined;

  admin.initializeApp({
    credential: serviceAccount
      ? admin.credential.cert(serviceAccount)
      : admin.credential.applicationDefault(),
    projectId: config.firebase.projectId,
    storageBucket: config.storage.bucketName,
  });

  console.log('✅ Firebase Admin SDK initialized');
  console.log(`   Project: ${config.firebase.projectId}`);
  console.log(`   Storage Bucket: ${config.storage.bucketName}`);
}

// Export commonly used Firebase services
export const auth = admin.auth();
export const firestore = admin.firestore();
export const storage = admin.storage();
export const messaging = admin.messaging();

// Export admin for advanced usage
export { admin };
