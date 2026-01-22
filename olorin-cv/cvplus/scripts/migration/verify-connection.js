#!/usr/bin/env node

/**
 * MongoDB Atlas Connection Verification Script
 *
 * Verifies connectivity to MongoDB Atlas cluster before migration.
 *
 * Usage: node verify-connection.js
 *
 * Environment Variables Required:
 * - MONGODB_URI: MongoDB Atlas connection string
 *
 * Exit Codes:
 * - 0: Connection successful
 * - 1: Connection failed
 */

const { MongoClient } = require('mongodb');

const TIMEOUT_MS = 10000; // 10 second timeout

async function verifyMongoDBConnection() {
  const uri = process.env.MONGODB_URI;

  if (!uri) {
    console.error('❌ Error: MONGODB_URI environment variable not set');
    console.error('Please set MONGODB_URI to your MongoDB Atlas connection string');
    process.exit(1);
  }

  console.log('🔍 Verifying MongoDB Atlas connection...');
  console.log(`📍 URI: ${uri.replace(/\/\/([^:]+):([^@]+)@/, '//$1:****@')}`); // Redact password

  const client = new MongoClient(uri, {
    serverSelectionTimeoutMS: TIMEOUT_MS,
    connectTimeoutMS: TIMEOUT_MS,
  });

  try {
    console.log('⏳ Attempting to connect...');
    await client.connect();

    console.log('✅ Successfully connected to MongoDB Atlas');

    // Test database access
    console.log('🔍 Testing database access...');
    const db = client.db('admin');
    const pingResult = await db.command({ ping: 1 });

    if (pingResult.ok === 1) {
      console.log('✅ Database ping successful');
    } else {
      throw new Error('Database ping returned unexpected result');
    }

    // Get server info
    const serverInfo = await db.admin().serverInfo();
    console.log('📊 Server Information:');
    console.log(`   - MongoDB Version: ${serverInfo.version}`);
    console.log(`   - Platform: ${serverInfo.os?.type || 'Unknown'}`);

    // Test write concern
    console.log('🔍 Testing write concern...');
    const testDb = client.db('cvplus');
    const testCollection = testDb.collection('_connection_test');

    await testCollection.insertOne(
      { test: true, timestamp: new Date() },
      { writeConcern: { w: 'majority', j: true, wtimeout: 5000 } }
    );

    await testCollection.deleteOne({ test: true });
    console.log('✅ Write concern test successful');

    console.log('\n✅ MongoDB Atlas connection verification PASSED');
    console.log('   All checks completed successfully');

    process.exit(0);
  } catch (error) {
    console.error('\n❌ MongoDB Atlas connection verification FAILED');
    console.error(`   Error: ${error.message}`);

    if (error.name === 'MongoServerSelectionError') {
      console.error('\n📝 Troubleshooting:');
      console.error('   1. Check that your IP address is whitelisted in MongoDB Atlas');
      console.error('   2. Verify the connection string is correct');
      console.error('   3. Ensure network connectivity to MongoDB Atlas');
    } else if (error.name === 'MongoAuthenticationError') {
      console.error('\n📝 Troubleshooting:');
      console.error('   1. Verify the username and password are correct');
      console.error('   2. Check that the database user has proper permissions');
    }

    process.exit(1);
  } finally {
    await client.close();
  }
}

// Run verification
verifyMongoDBConnection();
