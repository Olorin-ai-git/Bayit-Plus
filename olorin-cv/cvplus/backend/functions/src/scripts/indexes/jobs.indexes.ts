/**
 * Jobs Collection Indexes
 */

export const jobsIndexes = [
  { key: { userId: 1 }, name: 'userId_1' },
  { key: { status: 1 }, name: 'status_1' },
  { key: { userId: 1, status: 1 }, name: 'userId_1_status_1' },
  { key: { 'publicProfile.slug': 1 }, sparse: true, name: 'publicProfile.slug_1' },
  { key: { createdAt: 1 }, name: 'createdAt_1' },
];
