/**
 * PublicProfiles Collection Schema
 */

export const publicProfilesSchema = {
  $jsonSchema: {
    bsonType: 'object',
    required: ['_id', 'jobId', 'userId', 'slug', 'version', 'createdAt', 'updatedAt'],
    properties: {
      _id: { bsonType: 'string' },
      jobId: { bsonType: 'string' },
      userId: { bsonType: 'string' },
      slug: { bsonType: 'string', pattern: '^[a-z0-9-]+$', maxLength: 200 },
      isActive: { bsonType: 'bool' },
      viewCount: { bsonType: 'int', minimum: 0 },
      version: { bsonType: 'int', minimum: 1 },
      createdAt: { bsonType: 'date' },
      updatedAt: { bsonType: 'date' },
    },
  },
};
