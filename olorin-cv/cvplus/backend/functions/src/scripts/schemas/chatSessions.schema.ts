/**
 * ChatSessions Collection Schema
 */

export const chatSessionsSchema = {
  $jsonSchema: {
    bsonType: 'object',
    required: ['_id', 'userId', 'status', 'version', 'createdAt', 'updatedAt'],
    properties: {
      _id: { bsonType: 'string' },
      userId: { bsonType: 'string' },
      jobId: { bsonType: ['string', 'null'] },
      status: { bsonType: 'string', enum: ['active', 'archived'] },
      version: { bsonType: 'int', minimum: 1 },
      createdAt: { bsonType: 'date' },
      updatedAt: { bsonType: 'date' },
    },
  },
};
