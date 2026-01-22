/**
 * AudioFiles Collection Indexes
 */

export const audioFilesIndexes = [
  { key: { userId: 1 }, name: 'userId_1' },
  { key: { userId: 1, type: 1 }, name: 'userId_1_type_1' },
  { key: { userId: 1, status: 1 }, name: 'userId_1_status_1' },
  { key: { jobId: 1 }, sparse: true, name: 'jobId_1' },
  { key: { type: 1 }, name: 'type_1' },
  { key: { gcsPath: 1 }, unique: true, name: 'gcsPath_1' },
  { key: { status: 1 }, name: 'status_1' },
  { key: { createdAt: 1 }, name: 'createdAt_1' },
  // TTL index for temporary audio files
  { key: { expiresAt: 1 }, expireAfterSeconds: 0, name: 'expiresAt_1_ttl' },
];
