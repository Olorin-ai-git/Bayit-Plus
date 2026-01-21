#!/usr/bin/env node

/**
 * Clear CV Records Script
 * 
 * This script removes all saved CV records and associated data from Firebase.
 * It clears the following data:
 * - Firestore collections: jobs, publicProfiles, chatSessions, qrCodes
 * - Firebase Storage: user uploads, generated files, media content
 * 
 * Usage: node clear-cv-records.js [--dry-run] [--user-id <uid>]
 */

const admin = require('firebase-admin');
const path = require('path');

// Initialize Firebase Admin SDK
if (!admin.apps.length) {
  // Try to use service account or default credentials
  try {
    admin.initializeApp();
    console.log('✅ Firebase Admin initialized with default credentials');
  } catch (error) {
    console.error('❌ Failed to initialize Firebase Admin:', error.message);
    console.log('💡 Make sure you have Firebase Admin credentials configured');
    process.exit(1);
  }
}

const db = admin.firestore();
const storage = admin.storage();

// Parse command line arguments
const args = process.argv.slice(2);
const isDryRun = args.includes('--dry-run');
const userIdIndex = args.indexOf('--user-id');
const targetUserId = userIdIndex !== -1 && args[userIdIndex + 1] ? args[userIdIndex + 1] : null;

console.log('🔥 CV Records Clearing Script');
console.log('================================');
console.log(`📋 Mode: ${isDryRun ? 'DRY RUN (no actual deletion)' : 'LIVE DELETION'}`);
console.log(`👤 Target: ${targetUserId ? `User ID: ${targetUserId}` : 'ALL USERS'}`);
console.log('================================\n');

// Collections to clear
const COLLECTIONS_TO_CLEAR = [
  'jobs',
  'publicProfiles', 
  'chatSessions',
  'qrCodes',
  'portfolios',
  'testimonials',
  'achievements',
  'personalityInsights',
  'skillsData',
  'languageProficiency',
  'socialProfiles',
  'timelineEvents',
  'mediaContent',
  'contactForms',
  'scanAnalytics'
];

// Storage paths to clear
const STORAGE_PATHS_TO_CLEAR = [
  'users/',           // All user data
  'generated/',       // Generated CV files
  'podcasts/',        // Podcast files
  'videos/',          // Video introduction files
  'portfolios/',      // Portfolio media
  'qr-codes/',        // QR code images
  'certificates/',    // Generated certificates
  'audio/',           // Audio files
  'temp/'            // Temporary files
];

async function clearFirestoreCollection(collectionName) {
  console.log(`📂 Processing collection: ${collectionName}`);
  
  try {
    let query = db.collection(collectionName);
    
    // If targeting specific user, filter by userId
    if (targetUserId) {
      query = query.where('userId', '==', targetUserId);
    }
    
    const snapshot = await query.get();
    const docCount = snapshot.size;
    
    if (docCount === 0) {
      console.log(`   ✅ Collection ${collectionName} is empty or no matching documents found`);
      return;
    }
    
    console.log(`   📊 Found ${docCount} documents to delete`);
    
    if (!isDryRun) {
      const batch = db.batch();
      let batchCount = 0;
      const BATCH_SIZE = 500; // Firestore batch limit
      
      for (const doc of snapshot.docs) {
        console.log(`   🗑️  Deleting document: ${doc.id}`);
        batch.delete(doc.ref);
        batchCount++;
        
        // Commit batch when it reaches the limit
        if (batchCount === BATCH_SIZE) {
          await batch.commit();
          console.log(`   ✅ Committed batch of ${BATCH_SIZE} deletions`);
          batchCount = 0;
        }
      }
      
      // Commit any remaining documents in the batch
      if (batchCount > 0) {
        await batch.commit();
        console.log(`   ✅ Committed final batch of ${batchCount} deletions`);
      }
      
      console.log(`   ✅ Successfully deleted ${docCount} documents from ${collectionName}`);
    } else {
      snapshot.docs.forEach(doc => {
        console.log(`   [DRY RUN] Would delete document: ${doc.id}`);
      });
    }
    
  } catch (error) {
    console.error(`   ❌ Error processing collection ${collectionName}:`, error.message);
  }
}

async function clearStoragePath(storagePath) {
  console.log(`💾 Processing storage path: ${storagePath}`);
  
  try {
    const bucket = storage.bucket();
    let prefix = storagePath;
    
    // If targeting specific user, adjust path
    if (targetUserId && storagePath === 'users/') {
      prefix = `users/${targetUserId}/`;
    }
    
    const [files] = await bucket.getFiles({ prefix });
    const fileCount = files.length;
    
    if (fileCount === 0) {
      console.log(`   ✅ No files found at path: ${prefix}`);
      return;
    }
    
    console.log(`   📊 Found ${fileCount} files to delete`);
    
    if (!isDryRun) {
      for (const file of files) {
        console.log(`   🗑️  Deleting file: ${file.name}`);
        await file.delete();
      }
      console.log(`   ✅ Successfully deleted ${fileCount} files from ${prefix}`);
    } else {
      files.forEach(file => {
        console.log(`   [DRY RUN] Would delete file: ${file.name}`);
      });
    }
    
  } catch (error) {
    console.error(`   ❌ Error processing storage path ${storagePath}:`, error.message);
  }
}

async function clearAllData() {
  const startTime = Date.now();
  
  console.log('🚀 Starting data clearing process...\n');
  
  // Clear Firestore collections
  console.log('📂 CLEARING FIRESTORE COLLECTIONS');
  console.log('==================================');
  for (const collection of COLLECTIONS_TO_CLEAR) {
    await clearFirestoreCollection(collection);
    console.log(''); // Add spacing
  }
  
  // Clear Storage paths
  if (!targetUserId) { // Only clear storage if not targeting specific user
    console.log('💾 CLEARING FIREBASE STORAGE');
    console.log('============================');
    for (const storagePath of STORAGE_PATHS_TO_CLEAR) {
      await clearStoragePath(storagePath);
      console.log(''); // Add spacing
    }
  } else {
    console.log('💾 CLEARING USER-SPECIFIC STORAGE');
    console.log('=================================');
    await clearStoragePath('users/'); // Will be filtered by user ID
    console.log('');
  }
  
  const endTime = Date.now();
  const duration = Math.round((endTime - startTime) / 1000);
  
  console.log('🎉 DATA CLEARING COMPLETED');
  console.log('==========================');
  console.log(`⏱️  Total time: ${duration} seconds`);
  console.log(`📋 Mode: ${isDryRun ? 'DRY RUN - No data was actually deleted' : 'LIVE DELETION - Data has been permanently removed'}`);
  console.log(`👤 Scope: ${targetUserId ? `User ${targetUserId}` : 'All users'}`);
  
  if (isDryRun) {
    console.log('\n💡 To actually delete the data, run this script without --dry-run flag');
  } else {
    console.log('\n⚠️  All CV records and associated data have been permanently deleted!');
  }
}

// Handle script errors
process.on('unhandledRejection', (error) => {
  console.error('❌ Unhandled error:', error);
  process.exit(1);
});

// Run the script
clearAllData()
  .then(() => {
    console.log('\n✅ Script completed successfully');
    process.exit(0);
  })
  .catch((error) => {
    console.error('\n❌ Script failed:', error);
    process.exit(1);
  });