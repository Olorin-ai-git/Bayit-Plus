/**
 * Jobs Collection Schema
 */

export const jobsSchema = {
  $jsonSchema: {
    bsonType: 'object',
    required: ['_id', 'userId', 'status', 'version', 'createdAt', 'updatedAt'],
    properties: {
      _id: { bsonType: 'string' },
      userId: { bsonType: 'string' },
      status: {
        bsonType: 'string',
        enum: ['pending', 'processing', 'completed', 'failed'],
      },
      publicProfile: {
        bsonType: 'object',
        properties: {
          isPublic: { bsonType: 'bool' },
          slug: { bsonType: ['string', 'null'] },
        },
      },
      version: { bsonType: 'int', minimum: 1 },
      createdAt: { bsonType: 'date' },
      updatedAt: { bsonType: 'date' },
    },
  },
};
