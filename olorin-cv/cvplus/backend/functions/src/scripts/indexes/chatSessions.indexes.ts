/**
 * ChatSessions Collection Indexes
 */

export const chatSessionsIndexes = [
  { key: { userId: 1 }, name: 'userId_1' },
  { key: { jobId: 1 }, sparse: true, name: 'jobId_1' },
  { key: { status: 1 }, name: 'status_1' },
  { key: { userId: 1, status: 1 }, name: 'userId_1_status_1' },
  { key: { createdAt: 1 }, name: 'createdAt_1' },
];
