/**
 * PublicProfiles Collection Indexes
 */

export const publicProfilesIndexes = [
  { key: { slug: 1 }, unique: true, name: 'slug_1' },
  { key: { jobId: 1 }, name: 'jobId_1' },
  { key: { userId: 1 }, name: 'userId_1' },
  { key: { isActive: 1 }, name: 'isActive_1' },
  { key: { createdAt: 1 }, name: 'createdAt_1' },
];
