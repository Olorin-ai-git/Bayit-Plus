#!/usr/bin/env node

/**
 * Firestore Snapshot Creation Script
 *
 * Creates a complete backup snapshot of Firestore data before migration.
 * Exports data to Google Cloud Storage bucket for disaster recovery.
 *
 * Usage: node create-snapshot.js
 *
 * Environment Variables Required:
 * - FIREBASE_PROJECT_ID: Firebase project ID
 * - GCS_BACKUP_BUCKET: GCS bucket name (e.g., 'cvplus-backups')
 * - GOOGLE_APPLICATION_CREDENTIALS: Path to service account JSON
 *
 * Exit Codes:
 * - 0: Snapshot created successfully
 * - 1: Snapshot creation failed
 */

const admin = require('firebase-admin');
const { exec } = require('child_process');
const { promisify } = require('util');
const path = require('path');

const execAsync = promisify(exec);

const COLLECTIONS_TO_BACKUP = [
  'users',
  'jobs',
  'publicProfiles',
  'chatSessions',
  'chatMessages',
  'audioFiles',
  'subscriptions',
];

async function createFirestoreSnapshot() {
  try {
    console.log('📸 Creating Firestore snapshot...');

    // Validate environment variables
    const projectId = process.env.FIREBASE_PROJECT_ID;
    const backupBucket = process.env.GCS_BACKUP_BUCKET;
    const credentialsPath = process.env.GOOGLE_APPLICATION_CREDENTIALS;

    if (!projectId) {
      console.error('❌ Error: FIREBASE_PROJECT_ID not set');
      process.exit(1);
    }

    if (!backupBucket) {
      console.error('❌ Error: GCS_BACKUP_BUCKET not set');
      process.exit(1);
    }

    if (!credentialsPath) {
      console.error('❌ Error: GOOGLE_APPLICATION_CREDENTIALS not set');
      process.exit(1);
    }

    console.log(`📍 Project: ${projectId}`);
    console.log(`📍 Backup Bucket: gs://${backupBucket}`);

    // Generate timestamp for snapshot
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const snapshotName = `firestore-${timestamp}`;
    const outputUri = `gs://${backupBucket}/${snapshotName}`;

    console.log(`📍 Snapshot Name: ${snapshotName}`);

    // Initialize Firebase Admin
    admin.initializeApp({
      credential: admin.credential.applicationDefault(),
      projectId: projectId,
    });

    const firestore = admin.firestore();

    // Count documents in each collection
    console.log('\n📊 Pre-snapshot statistics:');
    const collectionStats = {};
    let totalDocuments = 0;

    for (const collectionName of COLLECTIONS_TO_BACKUP) {
      try {
        const snapshot = await firestore.collection(collectionName).count().get();
        const count = snapshot.data().count;
        collectionStats[collectionName] = count;
        totalDocuments += count;
        console.log(`   - ${collectionName}: ${count} documents`);
      } catch (error) {
        console.warn(`   ⚠️  ${collectionName}: Could not count (${error.message})`);
        collectionStats[collectionName] = 0;
      }
    }

    console.log(`   📊 Total: ${totalDocuments} documents across ${COLLECTIONS_TO_BACKUP.length} collections`);

    // Create Firestore export using gcloud CLI
    console.log('\n⏳ Creating Firestore export (this may take several minutes)...');
    const collectionIds = COLLECTIONS_TO_BACKUP.join(',');

    const exportCommand = `gcloud firestore export ${outputUri} \
      --project=${projectId} \
      --collection-ids=${collectionIds} \
      --format=json`;

    console.log(`🔧 Command: ${exportCommand.replace(collectionIds, '<collections>')}`);

    const { stdout, stderr } = await execAsync(exportCommand, {
      maxBuffer: 10 * 1024 * 1024, // 10MB buffer
    });

    if (stderr && !stderr.includes('WARNING')) {
      console.warn(`⚠️  Warning: ${stderr}`);
    }

    console.log('✅ Firestore export completed');

    // Verify backup exists in GCS
    console.log('\n🔍 Verifying backup in GCS...');
    const listCommand = `gsutil ls -l ${outputUri}`;
    const { stdout: lsOutput } = await execAsync(listCommand);

    if (lsOutput.includes(snapshotName)) {
      console.log('✅ Backup verified in GCS');
      console.log(`   Location: ${outputUri}`);
    } else {
      throw new Error('Backup not found in GCS after export');
    }

    // Create metadata file
    console.log('\n📝 Creating snapshot metadata...');
    const metadata = {
      snapshotName,
      timestamp: new Date().toISOString(),
      projectId,
      outputUri,
      collections: COLLECTIONS_TO_BACKUP,
      collectionStats,
      totalDocuments,
      createdBy: 'create-snapshot.js',
      purpose: 'pre-migration-backup',
    };

    const metadataPath = `/tmp/${snapshotName}-metadata.json`;
    const fs = require('fs');
    fs.writeFileSync(metadataPath, JSON.stringify(metadata, null, 2));

    // Upload metadata to GCS
    const uploadCommand = `gsutil cp ${metadataPath} ${outputUri}/metadata.json`;
    await execAsync(uploadCommand);
    console.log('✅ Metadata uploaded to GCS');

    // Store snapshot reference in Firestore for tracking
    console.log('\n📝 Recording snapshot in Firestore...');
    await firestore.collection('_migration_snapshots').add({
      ...metadata,
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
    });
    console.log('✅ Snapshot recorded in Firestore');

    console.log('\n✅ Firestore snapshot creation SUCCEEDED');
    console.log(`   Snapshot: ${snapshotName}`);
    console.log(`   Location: ${outputUri}`);
    console.log(`   Documents: ${totalDocuments}`);
    console.log('\n📝 To restore this snapshot:');
    console.log(`   gcloud firestore import ${outputUri} --project=${projectId}`);

    process.exit(0);
  } catch (error) {
    console.error('\n❌ Firestore snapshot creation FAILED');
    console.error(`   Error: ${error.message}`);

    if (error.message.includes('gcloud: command not found')) {
      console.error('\n📝 Troubleshooting:');
      console.error('   1. Install Google Cloud SDK: https://cloud.google.com/sdk/docs/install');
      console.error('   2. Run: gcloud auth login');
      console.error('   3. Run: gcloud config set project <PROJECT_ID>');
    } else if (error.message.includes('Permission denied')) {
      console.error('\n📝 Troubleshooting:');
      console.error('   1. Ensure service account has "Cloud Datastore Import Export Admin" role');
      console.error('   2. Verify GCS bucket exists and is writable');
      console.error('   3. Check GOOGLE_APPLICATION_CREDENTIALS path is correct');
    }

    process.exit(1);
  }
}

// Run snapshot creation
createFirestoreSnapshot();
