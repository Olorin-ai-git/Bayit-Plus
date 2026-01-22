/**
 * MongoDB Index Setup Script
 *
 * Creates all required indexes for CVPlus MongoDB collections:
 * - users, jobs, publicProfiles, chatSessions, chatMessages, audioFiles
 *
 * Includes schema validation with $jsonSchema for data integrity.
 *
 * Usage:
 *   ts-node src/scripts/setup-mongodb-indexes.ts
 *   or
 *   npm run setup:mongodb-indexes
 *
 * Exit codes:
 *   0 - All indexes created successfully
 *   1 - Index creation failed
 */

// Load environment variables from .env file
import 'dotenv/config';

import { MongoClient } from 'mongodb';
import { getConfig } from '../config/schema';
import { COLLECTION_SCHEMAS } from './schemas';
import { COLLECTION_INDEXES } from './indexes';

/**
 * Main setup function
 */
async function setupMongoDBIndexes() {
  console.log('🔧 Starting MongoDB index setup...\n');

  const config = getConfig();
  const uri = config.mongodb.uri;

  if (!uri) {
    throw new Error('MONGODB_URI not set in configuration');
  }

  const client = new MongoClient(uri);

  try {
    await client.connect();
    console.log('✅ Connected to MongoDB\n');

    const db = client.db(config.mongodb.dbName);

    let totalIndexesCreated = 0;
    let totalSchemasApplied = 0;

    // Iterate through each collection
    for (const collectionName of Object.keys(COLLECTION_INDEXES)) {
      console.log(`📁 Processing collection: ${collectionName}`);

      const collection = db.collection(collectionName);

      // Step 1: Apply schema validation
      try {
        await db.command({
          collMod: collectionName,
          validator: COLLECTION_SCHEMAS[collectionName],
          validationLevel: 'strict',
          validationAction: 'error',
        });
        console.log(`   ✅ Schema validation applied`);
        totalSchemasApplied++;
      } catch (error: any) {
        if (error.codeName === 'NamespaceNotFound') {
          // Collection doesn't exist yet, create it with validator
          await db.createCollection(collectionName, {
            validator: COLLECTION_SCHEMAS[collectionName],
            validationLevel: 'strict',
            validationAction: 'error',
          });
          console.log(`   ✅ Collection created with schema validation`);
          totalSchemasApplied++;
        } else {
          console.error(`   ❌ Schema validation failed:`, error.message);
          throw error;
        }
      }

      // Step 2: Create indexes
      const indexes = COLLECTION_INDEXES[collectionName];
      for (const indexSpec of indexes) {
        try {
          // Build index options (only include expireAfterSeconds if defined)
          const options: any = {
            unique: indexSpec.unique || false,
            sparse: indexSpec.sparse || false,
            name: indexSpec.name,
          };

          // Only add expireAfterSeconds if it's actually defined (not null/undefined)
          if (indexSpec.expireAfterSeconds !== null && indexSpec.expireAfterSeconds !== undefined) {
            options.expireAfterSeconds = indexSpec.expireAfterSeconds;
          }

          await collection.createIndex(indexSpec.key, options);
          console.log(`   ✅ Index created: ${indexSpec.name}`);
          totalIndexesCreated++;
        } catch (error: any) {
          if (error.code === 85) {
            // Index already exists with different options
            console.log(`   ⚠️  Index ${indexSpec.name} already exists, skipping`);
          } else if (error.code === 86) {
            // Index already exists with same name
            console.log(`   ⚠️  Index ${indexSpec.name} already exists, skipping`);
          } else {
            console.error(`   ❌ Index creation failed for ${indexSpec.name}:`, error.message);
            throw error;
          }
        }
      }

      console.log('');
    }

    // Summary
    console.log('═══════════════════════════════════════════════════════');
    console.log(`Total schemas applied:   ${totalSchemasApplied}/${Object.keys(COLLECTION_SCHEMAS).length}`);
    console.log(
      `Total indexes created:   ${totalIndexesCreated}/${Object.values(COLLECTION_INDEXES).flat().length}`
    );
    console.log('═══════════════════════════════════════════════════════\n');

    console.log('✅ MongoDB index setup completed successfully');
    process.exit(0);
  } catch (error) {
    console.error('\n❌ MongoDB index setup failed:', error);
    process.exit(1);
  } finally {
    await client.close();
  }
}

// Run setup
setupMongoDBIndexes();
