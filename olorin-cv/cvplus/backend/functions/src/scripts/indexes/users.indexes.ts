/**
 * Users Collection Indexes
 */

export const usersIndexes = [
  { key: { uid: 1 }, unique: true, name: 'uid_1' },
  { key: { email: 1 }, unique: true, name: 'email_1' },
  { key: { createdAt: 1 }, name: 'createdAt_1' },
];
