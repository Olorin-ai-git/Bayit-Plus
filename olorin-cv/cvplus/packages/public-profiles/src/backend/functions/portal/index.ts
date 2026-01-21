 * One Click Portal Firebase Functions
 *
 * Central export file for all portal-related Firebase Functions.
 * Basic structure implemented in T005 - functions will be enhanced in T032-T036.
 *
 * @author CVPlus Team
 * @version 1.0.0
  */

// Portal API endpoints - basic structure implemented
export * from './generatePortal'; // T005/T032 - POST /portal/generate
export * from './getPortalStatus'; // T005/T033 - GET /portal/{portalId}/status
export * from './startChatSession'; // T005/T034 - POST /portal/{portalId}/chat/start
export * from './sendChatMessage'; // T005/T035 - POST /portal/{portalId}/chat/{sessionId}/message
export * from './getPortalAnalytics'; // T005/T036 - GET /portal/{portalId}/analytics
