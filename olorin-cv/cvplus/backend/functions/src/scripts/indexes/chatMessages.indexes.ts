/**
 * ChatMessages Collection Indexes
 */

export const chatMessagesIndexes = [
  { key: { sessionId: 1 }, name: 'sessionId_1' },
  { key: { sessionId: 1, timestamp: 1 }, name: 'sessionId_1_timestamp_1' },
  { key: { role: 1 }, name: 'role_1' },
  // TTL index for automatic deletion after 90 days (data retention)
  { key: { timestamp: 1 }, expireAfterSeconds: 7776000, name: 'timestamp_1_ttl' },
];
