#!/usr/bin/env node

/**
 * Post-Migration Data Verification Script
 *
 * Performs comprehensive validation of MongoDB data after migration from Firestore.
 * Verifies data integrity, schema compliance, and query performance.
 *
 * Usage: node verify-data.js
 *
 * Environment Variables Required:
 * - MONGODB_URI: MongoDB Atlas connection string
 * - MONGODB_DB_NAME: Database name (default: 'cvplus')
 *
 * Exit Codes:
 * - 0: All verifications passed
 * - 1: One or more verifications failed
 */

const { MongoClient } = require('mongodb');

const REQUIRED_COLLECTIONS = [
  'users',
  'jobs',
  'publicProfiles',
  'chatSessions',
  'chatMessages',
  'audioFiles',
  'subscriptions',
];

const REQUIRED_INDEXES = {
  users: ['uid', 'email'],
  jobs: ['userId', 'status', 'createdAt'],
  publicProfiles: ['slug', 'userId'],
  chatSessions: ['userId', 'jobId'],
  chatMessages: ['sessionId', 'timestamp'],
  audioFiles: ['userId', 'jobId'],
  subscriptions: ['userId', 'status'],
};

const QUERY_PERFORMANCE_THRESHOLD_MS = 100;

async function verifyMigrationData() {
  const uri = process.env.MONGODB_URI;
  const dbName = process.env.MONGODB_DB_NAME || 'cvplus';

  if (!uri) {
    console.error('❌ Error: MONGODB_URI environment variable not set');
    process.exit(1);
  }

  console.log('🔍 MongoDB Data Verification Started');
  console.log(`📍 Database: ${dbName}`);

  const client = new MongoClient(uri);
  let failureCount = 0;

  try {
    await client.connect();
    const db = client.db(dbName);

    console.log('✅ Connected to MongoDB\n');

    // 1. Verify all required collections exist
    console.log('📊 Step 1: Verifying Collections');
    console.log('─'.repeat(50));

    const collections = await db.listCollections().toArray();
    const collectionNames = collections.map((c) => c.name);

    for (const requiredCollection of REQUIRED_COLLECTIONS) {
      if (collectionNames.includes(requiredCollection)) {
        const count = await db.collection(requiredCollection).countDocuments();
        console.log(`✅ ${requiredCollection}: ${count} documents`);

        if (count === 0 && !['chatMessages', 'audioFiles'].includes(requiredCollection)) {
          console.warn(`⚠️  Warning: ${requiredCollection} is empty`);
        }
      } else {
        console.error(`❌ ${requiredCollection}: MISSING`);
        failureCount++;
      }
    }

    // 2. Verify indexes exist
    console.log('\n📊 Step 2: Verifying Indexes');
    console.log('─'.repeat(50));

    for (const [collectionName, requiredIndexes] of Object.entries(REQUIRED_INDEXES)) {
      if (!collectionNames.includes(collectionName)) {
        console.warn(`⚠️  Skipping ${collectionName} - collection not found`);
        continue;
      }

      const collection = db.collection(collectionName);
      const indexes = await collection.listIndexes().toArray();
      const indexFields = indexes.map((idx) => Object.keys(idx.key)[0]);

      console.log(`\n   ${collectionName}:`);
      for (const requiredIndex of requiredIndexes) {
        if (indexFields.includes(requiredIndex)) {
          console.log(`   ✅ Index on '${requiredIndex}' exists`);
        } else {
          console.error(`   ❌ Index on '${requiredIndex}' MISSING`);
          failureCount++;
        }
      }
    }

    // 3. Verify data schema compliance
    console.log('\n📊 Step 3: Verifying Data Schema');
    console.log('─'.repeat(50));

    // Verify users collection schema
    const sampleUser = await db.collection('users').findOne();
    if (sampleUser) {
      const requiredUserFields = ['_id', 'uid', 'email', 'locale', 'version', 'createdAt', 'updatedAt'];
      const missingFields = requiredUserFields.filter((field) => !(field in sampleUser));

      if (missingFields.length === 0) {
        console.log('✅ User schema valid');
        console.log(`   Sample fields: ${Object.keys(sampleUser).slice(0, 5).join(', ')}...`);
      } else {
        console.error(`❌ User schema invalid - missing: ${missingFields.join(', ')}`);
        failureCount++;
      }
    } else {
      console.warn('⚠️  No users found - cannot verify schema');
    }

    // Verify jobs collection schema
    const sampleJob = await db.collection('jobs').findOne();
    if (sampleJob) {
      const requiredJobFields = ['_id', 'userId', 'status', 'data', 'version', 'createdAt', 'updatedAt'];
      const missingFields = requiredJobFields.filter((field) => !(field in sampleJob));

      if (missingFields.length === 0) {
        console.log('✅ Job schema valid');
      } else {
        console.error(`❌ Job schema invalid - missing: ${missingFields.join(', ')}`);
        failureCount++;
      }
    }

    // 4. Verify data integrity
    console.log('\n📊 Step 4: Verifying Data Integrity');
    console.log('─'.repeat(50));

    // Check for orphaned jobs (jobs without users)
    const jobsWithoutUsers = await db
      .collection('jobs')
      .aggregate([
        {
          $lookup: {
            from: 'users',
            localField: 'userId',
            foreignField: '_id',
            as: 'user',
          },
        },
        { $match: { user: { $size: 0 } } },
        { $count: 'orphanedJobs' },
      ])
      .toArray();

    const orphanedCount = jobsWithoutUsers[0]?.orphanedJobs || 0;
    if (orphanedCount === 0) {
      console.log('✅ No orphaned jobs found');
    } else {
      console.error(`❌ Found ${orphanedCount} orphaned jobs (jobs without users)`);
      failureCount++;
    }

    // Check for duplicate email addresses
    const duplicateEmails = await db
      .collection('users')
      .aggregate([{ $group: { _id: '$email', count: { $sum: 1 } } }, { $match: { count: { $gt: 1 } } }])
      .toArray();

    if (duplicateEmails.length === 0) {
      console.log('✅ No duplicate email addresses');
    } else {
      console.error(`❌ Found ${duplicateEmails.length} duplicate email addresses`);
      failureCount++;
    }

    // 5. Verify query performance
    console.log('\n📊 Step 5: Verifying Query Performance');
    console.log('─'.repeat(50));

    const performanceTests = [
      {
        name: 'Find user by uid',
        collection: 'users',
        query: { uid: 'test-uid' },
      },
      {
        name: 'Find jobs by userId',
        collection: 'jobs',
        query: { userId: 'test-user-id' },
      },
      {
        name: 'Find public profile by slug',
        collection: 'publicProfiles',
        query: { slug: 'test-slug' },
      },
    ];

    for (const test of performanceTests) {
      const startTime = Date.now();
      await db.collection(test.collection).find(test.query).limit(10).toArray();
      const duration = Date.now() - startTime;

      if (duration < QUERY_PERFORMANCE_THRESHOLD_MS) {
        console.log(`✅ ${test.name}: ${duration}ms (< ${QUERY_PERFORMANCE_THRESHOLD_MS}ms)`);
      } else {
        console.warn(`⚠️  ${test.name}: ${duration}ms (> ${QUERY_PERFORMANCE_THRESHOLD_MS}ms)`);
      }
    }

    // 6. Verify version fields
    console.log('\n📊 Step 6: Verifying Version Fields (Optimistic Concurrency)');
    console.log('─'.repeat(50));

    const collectionsWithVersions = ['users', 'jobs', 'publicProfiles'];
    for (const collectionName of collectionsWithVersions) {
      const docsWithoutVersion = await db.collection(collectionName).countDocuments({ version: { $exists: false } });

      if (docsWithoutVersion === 0) {
        console.log(`✅ ${collectionName}: All documents have version field`);
      } else {
        console.error(`❌ ${collectionName}: ${docsWithoutVersion} documents missing version field`);
        failureCount++;
      }
    }

    // 7. Verify timestamps
    console.log('\n📊 Step 7: Verifying Timestamps');
    console.log('─'.repeat(50));

    for (const collectionName of REQUIRED_COLLECTIONS) {
      const docsWithoutTimestamps = await db
        .collection(collectionName)
        .countDocuments({ $or: [{ createdAt: { $exists: false } }, { updatedAt: { $exists: false } }] });

      if (docsWithoutTimestamps === 0) {
        console.log(`✅ ${collectionName}: All documents have timestamps`);
      } else {
        console.error(`❌ ${collectionName}: ${docsWithoutTimestamps} documents missing timestamps`);
        failureCount++;
      }
    }

    // Final summary
    console.log('\n' + '═'.repeat(50));
    if (failureCount === 0) {
      console.log('✅ DATA VERIFICATION PASSED');
      console.log('   All checks completed successfully');
      console.log('   MongoDB data is ready for production use');
      process.exit(0);
    } else {
      console.error('❌ DATA VERIFICATION FAILED');
      console.error(`   ${failureCount} check(s) failed`);
      console.error('   Review errors above and fix before proceeding');
      process.exit(1);
    }
  } catch (error) {
    console.error('\n❌ Data verification error:', error.message);
    process.exit(1);
  } finally {
    await client.close();
  }
}

// Run verification
verifyMigrationData();
