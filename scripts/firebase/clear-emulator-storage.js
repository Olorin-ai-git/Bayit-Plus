#!/usr/bin/env node

/**
 * Clear Firebase Storage Emulator
 * This script clears all files from the Firebase Storage emulator
 */

const path = require('path');

// Adjust path to find firebase-admin in functions directory
const modulePath = path.join(__dirname, '../../functions/node_modules/firebase-admin');
const admin = require(modulePath);

// Initialize Firebase Admin with emulator settings
process.env.FIREBASE_STORAGE_EMULATOR_HOST = 'localhost:9199';
process.env.FIRESTORE_EMULATOR_HOST = 'localhost:8090';

if (!admin.apps.length) {
  admin.initializeApp({
    projectId: 'getmycv-ai',
    storageBucket: 'getmycv-ai.firebasestorage.app'
  });
}

const bucket = admin.storage().bucket();

async function clearStorage() {
  console.log('🗑️  Clearing Firebase Storage Emulator...');
  console.log('=========================================');
  console.log('');
  
  try {
    // Get all files in the bucket
    const [files] = await bucket.getFiles();
    
    if (files.length === 0) {
      console.log('✅ Storage is already empty');
      return;
    }
    
    console.log(`Found ${files.length} files to delete:`);
    console.log('');
    
    // Group files by directory
    const filesByDir = {};
    files.forEach(file => {
      const dir = path.dirname(file.name);
      if (!filesByDir[dir]) {
        filesByDir[dir] = [];
      }
      filesByDir[dir].push(file);
    });
    
    // Show summary by directory
    Object.entries(filesByDir).forEach(([dir, dirFiles]) => {
      console.log(`  📁 ${dir === '.' ? 'root' : dir}/: ${dirFiles.length} files`);
    });
    
    console.log('');
    console.log('Deleting files...');
    
    // Delete all files
    let deletedCount = 0;
    const deletePromises = files.map(async (file) => {
      try {
        await file.delete();
        deletedCount++;
        if (deletedCount % 10 === 0) {
          console.log(`  Deleted ${deletedCount}/${files.length} files...`);
        }
        return { success: true, name: file.name };
      } catch (error) {
        return { success: false, name: file.name, error: error.message };
      }
    });
    
    const results = await Promise.all(deletePromises);
    
    // Check results
    const successful = results.filter(r => r.success);
    const failed = results.filter(r => !r.success);
    
    console.log('');
    console.log('🎯 Storage Clearing Results:');
    console.log('============================');
    console.log(`✅ Successfully deleted: ${successful.length} files`);
    
    if (failed.length > 0) {
      console.log(`❌ Failed to delete: ${failed.length} files`);
      failed.forEach(f => {
        console.log(`   - ${f.name}: ${f.error}`);
      });
    }
    
    console.log('');
    console.log('✨ Storage emulator has been cleared!');
    
  } catch (error) {
    console.error('❌ Error clearing storage:', error.message);
    process.exit(1);
  }
}

// Run the clearing process
clearStorage()
  .then(() => {
    console.log('');
    console.log('📋 Storage paths that were cleared:');
    console.log('  • users/      (uploaded CVs)');
    console.log('  • generated/  (generated CVs)');
    console.log('  • podcasts/   (audio content)');
    console.log('  • videos/     (video content)');
    console.log('  • portfolios/ (portfolio items)');
    console.log('  • qr-codes/   (QR code images)');
    console.log('  • temp/       (temporary files)');
    process.exit(0);
  })
  .catch(error => {
    console.error('Fatal error:', error);
    process.exit(1);
  });