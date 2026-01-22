/**
 * ChatMessages Collection Schema
 */

export const chatMessagesSchema = {
  $jsonSchema: {
    bsonType: 'object',
    required: ['_id', 'sessionId', 'role', 'content', 'timestamp', 'version', 'createdAt', 'updatedAt'],
    properties: {
      _id: { bsonType: 'string' },
      sessionId: { bsonType: 'string' },
      role: { bsonType: 'string', enum: ['user', 'assistant', 'system'] },
      content: { bsonType: 'string', minLength: 1 },
      timestamp: { bsonType: 'date' },
      version: { bsonType: 'int', minimum: 1 },
      createdAt: { bsonType: 'date' },
      updatedAt: { bsonType: 'date' },
    },
  },
};
