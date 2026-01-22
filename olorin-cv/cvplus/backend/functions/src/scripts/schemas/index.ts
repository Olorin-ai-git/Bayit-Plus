/**
 * MongoDB Collection Schemas
 * Exports all $jsonSchema validators for collections
 */

export { usersSchema } from './users.schema';
export { jobsSchema } from './jobs.schema';
export { publicProfilesSchema } from './publicProfiles.schema';
export { chatSessionsSchema } from './chatSessions.schema';
export { chatMessagesSchema } from './chatMessages.schema';
export { audioFilesSchema } from './audioFiles.schema';

export const COLLECTION_SCHEMAS: Record<string, any> = {
  users: require('./users.schema').usersSchema,
  jobs: require('./jobs.schema').jobsSchema,
  publicProfiles: require('./publicProfiles.schema').publicProfilesSchema,
  chatSessions: require('./chatSessions.schema').chatSessionsSchema,
  chatMessages: require('./chatMessages.schema').chatMessagesSchema,
  audioFiles: require('./audioFiles.schema').audioFilesSchema,
};
