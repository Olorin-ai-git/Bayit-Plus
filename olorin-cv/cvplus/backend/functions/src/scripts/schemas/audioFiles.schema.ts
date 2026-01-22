/**
 * AudioFiles Collection Schema
 * Complete schema validation for audio file metadata
 */

export const audioFilesSchema = {
  $jsonSchema: {
    bsonType: 'object',
    required: [
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
    ],
    properties: {
      _id: { bsonType: 'string' },
      userId: { bsonType: 'string' },
      jobId: { bsonType: ['string', 'null'] },
      type: { bsonType: 'string', enum: ['tts', 'stt'] },
      gcsPath: { bsonType: 'string', minLength: 1 },
      format: {
        bsonType: 'string',
        enum: ['mp3', 'wav', 'ogg', 'flac', 'webm', 'opus'],
      },
      duration: { bsonType: 'number', minimum: 0 },
      size: { bsonType: 'int', minimum: 0 },
      sampleRate: { bsonType: 'int', minimum: 8000, maximum: 192000 },
      bitDepth: { bsonType: 'int', enum: [8, 16, 24, 32] },
      channels: { bsonType: 'int', enum: [1, 2] },
      bitrate: { bsonType: ['int', 'null'], minimum: 0 },
      checksum: { bsonType: 'string', minLength: 64, maxLength: 64 },
      status: {
        bsonType: 'string',
        enum: ['processing', 'ready', 'failed'],
      },
      processingError: { bsonType: ['string', 'null'] },
      provider: {
        bsonType: 'string',
        enum: ['elevenlabs', 'google', 'azure', 'upload'],
      },
      providerMetadata: {
        bsonType: ['object', 'null'],
        properties: {
          requestId: { bsonType: ['string', 'null'] },
          model: { bsonType: ['string', 'null'] },
          costCredits: { bsonType: ['number', 'null'] },
        },
      },
      metadata: {
        bsonType: 'object',
        properties: {
          language: { bsonType: ['string', 'null'] },
          voice: { bsonType: ['string', 'null'] },
          transcript: { bsonType: ['string', 'null'] },
          containsPII: { bsonType: ['bool', 'null'] },
        },
      },
      version: { bsonType: 'int', minimum: 1 },
      createdAt: { bsonType: 'date' },
      updatedAt: { bsonType: 'date' },
      expiresAt: { bsonType: ['date', 'null'] },
    },
  },
};
