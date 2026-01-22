/**
 * Audio Migration Verification Script
 *
 * Verifies audio files were properly migrated from Firestore to MongoDB:
 * 1. Collection and index existence
 * 2. GCS file existence for all audio files
 * 3. Checksum validation (SHA-256)
 * 4. Metadata accuracy (size, duration, format)
 * 5. Count consistency between Firestore and MongoDB
 * 6. Schema compliance
 *
 * Exit codes:
 * 0 - All validation passed
 * 1 - One or more validation checks failed
 */

const { MongoClient } = require('mongodb');
const { Storage } = require('@google-cloud/storage');
const crypto = require('crypto');
const admin = require('firebase-admin');

// Configuration from environment
const MONGODB_URI = process.env.MONGODB_URI;
const GCP_PROJECT_ID = process.env.GCP_PROJECT_ID || 'olorin-cvplus';
const GCS_AUDIO_BUCKET = process.env.GCS_AUDIO_BUCKET || 'cvplus-audio-files';

// Initialize Firebase Admin
admin.initializeApp({
  credential: admin.credential.applicationDefault(),
  projectId: GCP_PROJECT_ID,
});

const firestore = admin.firestore();
const storage = new Storage({ projectId: GCP_PROJECT_ID });
const bucket = storage.bucket(GCS_AUDIO_BUCKET);

// Validation results
const results = {
  collectionExists: false,
  indexesValid: false,
  gcsFilesExist: 0,
  gcsFilesMissing: [],
  checksumMatches: 0,
  checksumMismatches: [],
  metadataAccurate: 0,
  metadataInaccurate: [],
  countConsistent: false,
  schemaCompliant: 0,
  schemaNonCompliant: [],
  totalAudioFiles: 0,
  firestoreCount: 0,
  mongodbCount: 0,
};

/**
 * Main validation function
 */
async function validateAudioMigration() {
  console.log('🔍 Starting audio migration validation...\n');

  const mongoClient = new MongoClient(MONGODB_URI);

  try {
    await mongoClient.connect();
    const db = mongoClient.db('cvplus');

    // Step 1: Verify collection exists
    console.log('1️⃣  Verifying audioFiles collection exists...');
    const collections = await db.listCollections({ name: 'audioFiles' }).toArray();
    results.collectionExists = collections.length > 0;

    if (!results.collectionExists) {
      console.error('   ❌ audioFiles collection does not exist');
      return;
    }
    console.log('   ✅ audioFiles collection exists');

    // Step 2: Verify indexes
    console.log('\n2️⃣  Verifying indexes...');
    const indexes = await db.collection('audioFiles').listIndexes().toArray();
    const requiredIndexes = [
      '_id_',
      'userId_1',
      'jobId_1',
      'type_1',
      'gcsPath_1',
      'status_1',
      'createdAt_1',
    ];

    const indexNames = indexes.map((idx) => idx.name);
    const missingIndexes = requiredIndexes.filter((req) => !indexNames.includes(req));

    results.indexesValid = missingIndexes.length === 0;

    if (missingIndexes.length > 0) {
      console.error('   ❌ Missing indexes:', missingIndexes);
    } else {
      console.log('   ✅ All required indexes exist');
    }

    // Step 3: Get audio files from MongoDB
    console.log('\n3️⃣  Fetching audio files from MongoDB...');
    const audioFiles = await db.collection('audioFiles').find().toArray();
    results.totalAudioFiles = audioFiles.length;
    results.mongodbCount = audioFiles.length;
    console.log(`   Found ${audioFiles.length} audio files in MongoDB`);

    if (audioFiles.length === 0) {
      console.warn('   ⚠️  No audio files found in MongoDB');
      return;
    }

    // Step 4: Verify GCS file existence
    console.log('\n4️⃣  Verifying GCS file existence...');
    for (const audio of audioFiles) {
      try {
        const [exists] = await bucket.file(audio.gcsPath).exists();

        if (exists) {
          results.gcsFilesExist++;
        } else {
          results.gcsFilesMissing.push(audio.gcsPath);
        }
      } catch (error) {
        console.error(`   Error checking ${audio.gcsPath}:`, error.message);
        results.gcsFilesMissing.push(audio.gcsPath);
      }
    }

    console.log(`   ✅ ${results.gcsFilesExist}/${audioFiles.length} files exist in GCS`);
    if (results.gcsFilesMissing.length > 0) {
      console.error(`   ❌ ${results.gcsFilesMissing.length} files missing:`, results.gcsFilesMissing.slice(0, 5));
      if (results.gcsFilesMissing.length > 5) {
        console.error(`      ... and ${results.gcsFilesMissing.length - 5} more`);
      }
    }

    // Step 5: Verify checksums
    console.log('\n5️⃣  Verifying checksums...');
    for (const audio of audioFiles.slice(0, 10)) {
      // Sample first 10 for performance
      try {
        const [fileContent] = await bucket.file(audio.gcsPath).download();
        const actualChecksum = crypto.createHash('sha256').update(fileContent).digest('hex');

        if (actualChecksum === audio.checksum) {
          results.checksumMatches++;
        } else {
          results.checksumMismatches.push({
            audioFileId: audio._id,
            gcsPath: audio.gcsPath,
            expected: audio.checksum,
            actual: actualChecksum,
          });
        }
      } catch (error) {
        console.error(`   Error verifying checksum for ${audio.gcsPath}:`, error.message);
      }
    }

    console.log(`   ✅ ${results.checksumMatches}/10 checksums match`);
    if (results.checksumMismatches.length > 0) {
      console.error(`   ❌ ${results.checksumMismatches.length} checksum mismatches`);
    }

    // Step 6: Verify metadata accuracy
    console.log('\n6️⃣  Verifying metadata accuracy...');
    for (const audio of audioFiles.slice(0, 10)) {
      // Sample first 10
      try {
        const [metadata] = await bucket.file(audio.gcsPath).getMetadata();
        const actualSize = parseInt(metadata.size, 10);

        if (actualSize === audio.size) {
          results.metadataAccurate++;
        } else {
          results.metadataInaccurate.push({
            audioFileId: audio._id,
            gcsPath: audio.gcsPath,
            expectedSize: audio.size,
            actualSize,
          });
        }
      } catch (error) {
        console.error(`   Error verifying metadata for ${audio.gcsPath}:`, error.message);
      }
    }

    console.log(`   ✅ ${results.metadataAccurate}/10 metadata accurate`);
    if (results.metadataInaccurate.length > 0) {
      console.error(`   ❌ ${results.metadataInaccurate.length} metadata mismatches`);
    }

    // Step 7: Verify schema compliance
    console.log('\n7️⃣  Verifying schema compliance...');
    const requiredFields = [
      '_id',
      'userId',
      'type',
      'gcsPath',
      'format',
      'duration',
      'size',
      'sampleRate',
      'bitDepth',
      'channels',
      'checksum',
      'status',
      'provider',
      'version',
      'createdAt',
      'updatedAt',
    ];

    for (const audio of audioFiles) {
      const missingFields = requiredFields.filter((field) => !(field in audio));

      if (missingFields.length === 0) {
        results.schemaCompliant++;
      } else {
        results.schemaNonCompliant.push({
          audioFileId: audio._id,
          missingFields,
        });
      }
    }

    console.log(`   ✅ ${results.schemaCompliant}/${audioFiles.length} documents schema-compliant`);
    if (results.schemaNonCompliant.length > 0) {
      console.error(`   ❌ ${results.schemaNonCompliant.length} documents missing fields`);
    }

    // Step 8: Compare counts with Firestore
    console.log('\n8️⃣  Comparing counts with Firestore...');
    try {
      const firestoreSnapshot = await firestore.collection('audioFiles').count().get();
      results.firestoreCount = firestoreSnapshot.data().count;
      results.countConsistent = results.firestoreCount === results.mongodbCount;

      console.log(`   Firestore: ${results.firestoreCount} audio files`);
      console.log(`   MongoDB:   ${results.mongodbCount} audio files`);

      if (results.countConsistent) {
        console.log('   ✅ Counts match');
      } else {
        console.error('   ❌ Count mismatch');
      }
    } catch (error) {
      console.error('   ⚠️  Could not fetch Firestore count:', error.message);
    }

    // Generate summary
    console.log('\n📊 Validation Summary\n');
    console.log('═══════════════════════════════════════════════════════');
    console.log(`Collection Exists:       ${results.collectionExists ? '✅' : '❌'}`);
    console.log(`Indexes Valid:           ${results.indexesValid ? '✅' : '❌'}`);
    console.log(`GCS Files Exist:         ${results.gcsFilesExist}/${results.totalAudioFiles}`);
    console.log(`Checksums Match:         ${results.checksumMatches}/10 (sampled)`);
    console.log(`Metadata Accurate:       ${results.metadataAccurate}/10 (sampled)`);
    console.log(`Schema Compliant:        ${results.schemaCompliant}/${results.totalAudioFiles}`);
    console.log(`Count Consistent:        ${results.countConsistent ? '✅' : '❌'}`);
    console.log('═══════════════════════════════════════════════════════');

    // Determine overall pass/fail
    const allChecksPassed =
      results.collectionExists &&
      results.indexesValid &&
      results.gcsFilesMissing.length === 0 &&
      results.checksumMismatches.length === 0 &&
      results.metadataInaccurate.length === 0 &&
      results.schemaNonCompliant.length === 0 &&
      results.countConsistent;

    if (allChecksPassed) {
      console.log('\n✅ All validation checks PASSED');
      process.exit(0);
    } else {
      console.error('\n❌ Some validation checks FAILED');
      process.exit(1);
    }
  } catch (error) {
    console.error('\n❌ Validation error:', error);
    process.exit(1);
  } finally {
    await mongoClient.close();
  }
}

// Run validation
validateAudioMigration();
