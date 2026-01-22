/**
 * MongoDB Collection Indexes
 * Exports all index definitions for collections
 */

export { usersIndexes } from './users.indexes';
export { jobsIndexes } from './jobs.indexes';
export { publicProfilesIndexes } from './publicProfiles.indexes';
export { chatSessionsIndexes } from './chatSessions.indexes';
export { chatMessagesIndexes } from './chatMessages.indexes';
export { audioFilesIndexes } from './audioFiles.indexes';

export const COLLECTION_INDEXES: Record<string, any[]> = {
  users: require('./users.indexes').usersIndexes,
  jobs: require('./jobs.indexes').jobsIndexes,
  publicProfiles: require('./publicProfiles.indexes').publicProfilesIndexes,
  chatSessions: require('./chatSessions.indexes').chatSessionsIndexes,
  chatMessages: require('./chatMessages.indexes').chatMessagesIndexes,
  audioFiles: require('./audioFiles.indexes').audioFilesIndexes,
};
