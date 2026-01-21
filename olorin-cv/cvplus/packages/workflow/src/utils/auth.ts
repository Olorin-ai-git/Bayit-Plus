export {
  AuthenticatedUser,
  requireGoogleAuth,
  requireCalendarPermissions,
  getGoogleAccessToken,
  updateUserLastLogin
} from '@cvplus/core';

// Additional workflow-specific auth utilities can be added here
export interface WorkflowAuthContext {
  userId: string;
  jobId?: string;
  permissions: string[];
}

export function createWorkflowAuthContext(
  user: { uid: string },
  jobId?: string,
  permissions: string[] = []
): WorkflowAuthContext {
  return {
    userId: user.uid,
    jobId,
    permissions
  };
}

export function hasWorkflowPermission(
  context: WorkflowAuthContext,
  permission: string
): boolean {
  return context.permissions.includes(permission) || context.permissions.includes('*');
}