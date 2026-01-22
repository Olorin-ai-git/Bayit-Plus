#!/usr/bin/env node

/**
 * Firestore Connection Verification Script
 *
 * Verifies connectivity and data integrity in Firestore before migration.
 *
 * Usage: node verify-firestore.js
 *
 * Environment Variables Required:
 * - GOOGLE_APPLICATION_CREDENTIALS: Path to Firebase service account JSON
 * - FIREBASE_PROJECT_ID: Firebase project ID
 *
 * Exit Codes:
 * - 0: Connection successful
 * - 1: Connection failed
 */

const admin = require('firebase-admin');

const REQUIRED_COLLECTIONS = ['users', 'jobs', 'publicProfiles'];

async function verifyFirestoreConnection() {
  try {
    console.log('🔍 Verifying Firestore connection...');

    // Check environment variables
    const projectId = process.env.FIREBASE_PROJECT_ID;
    const credentialsPath = process.env.GOOGLE_APPLICATION_CREDENTIALS;

    if (!projectId) {
      console.error('❌ Error: FIREBASE_PROJECT_ID environment variable not set');
      process.exit(1);
    }

    if (!credentialsPath) {
      console.error('❌ Error: GOOGLE_APPLICATION_CREDENTIALS environment variable not set');
      process.exit(1);
    }

    console.log(`📍 Project ID: ${projectId}`);
    console.log(`📍 Credentials: ${credentialsPath}`);

    // Initialize Firebase Admin
    console.log('⏳ Initializing Firebase Admin SDK...');
    admin.initializeApp({
      credential: admin.credential.applicationDefault(),
      projectId: projectId,
    });

    const firestore = admin.firestore();
    console.log('✅ Firebase Admin SDK initialized');

    // Test Firestore read access
    console.log('🔍 Testing Firestore read access...');
    const testDoc = await firestore.collection('users').limit(1).get();
    console.log('✅ Firestore read access confirmed');

    // Verify required collections exist
    console.log('\n📊 Verifying required collections...');
    const collectionCounts = {};

    for (const collectionName of REQUIRED_COLLECTIONS) {
      const snapshot = await firestore.collection(collectionName).count().get();
      const count = snapshot.data().count;
      collectionCounts[collectionName] = count;
      console.log(`   - ${collectionName}: ${count} documents`);
    }

    // Validate minimum data requirements
    console.log('\n🔍 Validating data requirements...');
    const userCount = collectionCounts['users'];

    if (userCount === 0) {
      console.warn('⚠️  Warning: No users found in Firestore');
      console.warn('   Migration may not be necessary if no data exists');
    } else {
      console.log(`✅ Found ${userCount} users ready for migration`);
    }

    // Test Firestore write access
    console.log('\n🔍 Testing Firestore write access...');
    const testRef = firestore.collection('_connection_test').doc('test');
    await testRef.set({
      test: true,
      timestamp: admin.firestore.FieldValue.serverTimestamp(),
    });
    console.log('✅ Firestore write access confirmed');

    // Clean up test document
    await testRef.delete();
    console.log('✅ Test document cleaned up');

    // Sample data validation
    console.log('\n🔍 Validating sample user data structure...');
    const sampleUserSnapshot = await firestore.collection('users').limit(1).get();

    if (!sampleUserSnapshot.empty) {
      const sampleUser = sampleUserSnapshot.docs[0].data();
      const requiredFields = ['email', 'uid'];
      const missingFields = requiredFields.filter((field) => !(field in sampleUser));

      if (missingFields.length > 0) {
        console.error(`❌ Sample user missing required fields: ${missingFields.join(', ')}`);
        process.exit(1);
      }

      console.log('✅ Sample user data structure valid');
      console.log(`   Fields present: ${Object.keys(sampleUser).join(', ')}`);
    }

    console.log('\n✅ Firestore connection verification PASSED');
    console.log('   All checks completed successfully');
    console.log(`   Total documents across collections: ${Object.values(collectionCounts).reduce((a, b) => a + b, 0)}`);

    process.exit(0);
  } catch (error) {
    console.error('\n❌ Firestore connection verification FAILED');
    console.error(`   Error: ${error.message}`);

    if (error.code === 'PERMISSION_DENIED') {
      console.error('\n📝 Troubleshooting:');
      console.error('   1. Check that service account has proper Firestore permissions');
      console.error('   2. Verify Firebase project ID is correct');
      console.error('   3. Ensure Firestore is enabled in Firebase Console');
    } else if (error.code === 'UNAUTHENTICATED') {
      console.error('\n📝 Troubleshooting:');
      console.error('   1. Verify GOOGLE_APPLICATION_CREDENTIALS path is correct');
      console.error('   2. Check that service account JSON file is valid');
      console.error('   3. Ensure service account has not been deleted');
    }

    process.exit(1);
  }
}

// Run verification
verifyFirestoreConnection();
