import { CommentMessage } from '../components/CommentWindow';
import { processCommentData } from '../utils/investigationDataUtils';
import { CommentResponse } from '../types/ApiResponses';
import { isDemoModeActive } from '../utils/urlParams';

/**
 * Saves a comment for a given investigation and user.
 * @param {string} investigationId - The investigation ID
 * @param {string} entityId - The entity ID (user ID or device ID)
 * @param {string} entityType - The entity type ('user_id' or 'device_id')
 * @param {Omit<CommentMessage, 'investigationId' | 'entityId' | 'entityType'>} message - The comment message
 * @returns {Promise<any>} The saved comment response
 */
export async function saveComment(
  investigationId: string,
  entityId: string,
  entityType: string,
  message: Omit<CommentMessage, 'investigationId' | 'entityId' | 'entityType'>,
): Promise<CommentMessage> {
  // Check for demo mode - simulate save without API calls
  if (isDemoModeActive()) {
    console.log('Demo mode active - simulating comment save');
    // Simulate network delay for realistic demo experience
    await new Promise(resolve => setTimeout(resolve, 200));
    return {
      ...message,
      investigationId,
      entityId,
      entityType,
    };
  }

  const res = await fetch(`/api/investigation/${investigationId}/comment`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      entity_id: entityId,
      entity_type: entityType,
      ...message,
    }),
  });
  if (!res.ok) throw new Error('Failed to save comment');
  const data = await res.json();
  const processedData = processCommentData(data);
  // Return first item since save returns a single comment
  return processedData[0];
}

/**
 * Fetches all comment messages for a given investigation.
 * @param {string} investigationId - The investigation ID
 * @param {string} entityType - The entity type ('user_id' or 'device_id')
 * @returns {Promise<CommentMessage[]>} The list of comment messages
 */
export async function fetchCommentMessages(
  investigationId: string,
  entityType: string = 'user_id',
): Promise<CommentMessage[]> {
  // Check for demo mode - use mock data instead of API calls
  if (isDemoModeActive()) {
    console.log('Demo mode active - using mock comment messages');
    // Simulate network delay for realistic demo experience
    await new Promise(resolve => setTimeout(resolve, 150));
    return getMockMessages('Investigator', entityType);
  }

  const res = await fetch(
    `/api/investigation/${investigationId}/comment?entity_type=${encodeURIComponent(
      entityType,
    )}`,
  );
  if (!res.ok) throw new Error('Failed to fetch comment messages');
  const data = await res.json();
  return processCommentData(data);
}

// Alias for compatibility with old usage
export const fetchChatMessages = fetchCommentMessages;

/**
 * Fetches the comment log for a given investigation and sender.
 * @param {string} investigationId - The investigation ID
 * @param {string} sender - The sender role
 * @param {string} entityType - The entity type ('user_id' or 'device_id')
 * @returns {Promise<CommentMessage[]>} The comment log
 */
export async function fetchCommentLog(
  investigationId: string,
  sender: 'Investigator' | 'Policy Team',
  entityType: string = 'user_id',
): Promise<CommentMessage[]> {
  if (isDemoModeActive()) {
    console.log('Demo mode active - using mock comment log');
    // Simulate network delay for realistic demo experience
    await new Promise(resolve => setTimeout(resolve, 150));
    return getMockMessages(sender, entityType);
  }
  const res = await fetch(
    `/api/investigation/${investigationId}/comment?sender=${encodeURIComponent(
      sender,
    )}&entity_type=${encodeURIComponent(entityType)}`,
  );
  if (!res.ok) throw new Error('Failed to fetch comment log');
  const data = await res.json();
  return processCommentData(data);
}

export const getMockMessages = (
  sender: string,
  entityType: string = 'user_id',
): CommentMessage[] => {
  const now = Date.now();
  if (sender === 'Investigator') {
    return [
      {
        entityId: 'user1',
        entityType,
        sender: 'Investigator',
        text: 'Started investigation.',
        timestamp: now - 60000,
        investigationId: 'INV-123',
      },
      {
        entityId: 'user1',
        entityType,
        sender: 'Investigator',
        text: 'Reviewed login history.',
        timestamp: now - 40000,
        investigationId: 'INV-123',
      },
      {
        entityId: 'user1',
        entityType,
        sender: 'Investigator',
        text: 'No anomalies found in device signals.',
        timestamp: now - 20000,
        investigationId: 'INV-123',
      },
    ];
  }
  return [
    {
      entityId: 'user1',
      entityType,
      sender: 'Policy Team',
      text: "Please check the user's recent location changes.",
      timestamp: now - 55000,
      investigationId: 'INV-123',
    },
    {
      entityId: 'user1',
      entityType,
      sender: 'Policy Team',
      text: 'Policy review in progress.',
      timestamp: now - 30000,
      investigationId: 'INV-123',
    },
    {
      entityId: 'user1',
      entityType,
      sender: 'Policy Team',
      text: 'Escalate if risk score is high.',
      timestamp: now - 10000,
      investigationId: 'INV-123',
    },
  ];
};

// Alias for compatibility with old usage
export const fetchChatLog = fetchCommentLog;

/**
 * Saves a chat message for a given investigation and user (alias for saveComment).
 * @param investigationId - The investigation ID
 * @param entityId - The entity ID (user ID or device ID)
 * @param entityType - The entity type ('user_id' or 'device_id')
 * @param message - The comment message (without investigationId, entityId, or entityType)
 * @returns The saved comment response
 */
export async function saveChatMessage(
  investigationId: string,
  entityId: string,
  entityType: string,
  message: Omit<CommentMessage, 'investigationId' | 'entityId' | 'entityType'>,
): Promise<CommentMessage> {
  return saveComment(investigationId, entityId, entityType, message);
}
