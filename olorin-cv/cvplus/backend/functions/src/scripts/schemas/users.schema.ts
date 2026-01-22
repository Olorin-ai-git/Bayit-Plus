/**
 * Users Collection Schema
 */

export const usersSchema = {
  $jsonSchema: {
    bsonType: 'object',
    required: ['_id', 'uid', 'email', 'version', 'createdAt', 'updatedAt'],
    properties: {
      _id: { bsonType: 'string', description: 'User ID' },
      uid: { bsonType: 'string', description: 'Firebase UID' },
      email: { bsonType: 'string', pattern: '^[^@]+@[^@]+\\.[^@]+$' },
      phoneNumber: { bsonType: ['string', 'null'] },
      displayName: { bsonType: ['string', 'null'] },
      photoURL: { bsonType: ['string', 'null'] },
      locale: {
        bsonType: 'string',
        enum: ['en', 'es', 'fr', 'de', 'pt', 'ja', 'zh', 'ar', 'ru', 'nl', 'he'],
        description: 'User locale',
      },
      textDirection: {
        bsonType: 'string',
        enum: ['ltr', 'rtl'],
        description: 'Text direction',
      },
      accessibility: {
        bsonType: 'object',
        properties: {
          screenReader: { bsonType: 'bool' },
          highContrast: { bsonType: 'bool' },
          fontSize: { bsonType: 'string', enum: ['normal', 'large', 'xlarge'] },
          reducedMotion: { bsonType: 'bool' },
          keyboardOnly: { bsonType: 'bool' },
          colorBlindMode: {
            bsonType: 'string',
            enum: ['none', 'protanopia', 'deuteranopia', 'tritanopia'],
          },
        },
      },
      version: { bsonType: 'int', minimum: 1 },
      createdAt: { bsonType: 'date' },
      updatedAt: { bsonType: 'date' },
    },
  },
};
