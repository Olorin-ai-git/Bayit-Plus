import React, { useState, useRef, useEffect } from 'react';
import {
  Collaborator,
  Comment,
  NotificationSettings,
  ManualInvestigation
} from '../types/manualInvestigation';

interface CollaborationPanelProps {
  investigation: ManualInvestigation;
  collaborators: Collaborator[];
  comments: Comment[];
  currentUserId: string;
  currentUserName: string;
  onAddComment: (comment: Omit<Comment, 'id' | 'createdAt' | 'authorId' | 'authorName'>) => void;
  onUpdateComment: (commentId: string, content: string) => void;
  onDeleteComment: (commentId: string) => void;
  onAddCollaborator: (collaborator: Omit<Collaborator, 'id' | 'addedAt' | 'addedBy'>) => void;
  onRemoveCollaborator: (collaboratorId: string) => void;
  onUpdatePermissions: (collaboratorId: string, permissions: Collaborator['permissions']) => void;
  onUpdateNotifications: (settings: NotificationSettings) => void;
  onMentionUser: (userId: string) => void;
  availableUsers: Omit<Collaborator, 'addedAt' | 'addedBy' | 'permissions'>[];
  notificationSettings: NotificationSettings;
  canManageTeam: boolean;
  isLoading?: boolean;
}

interface CommentFormData {
  content: string;
  relatedEntityId: string;
  relatedEntityType: 'investigation' | 'step' | 'evidence';
  isInternal: boolean;
  mentions: string[];
  attachments: string[];
}

export const CollaborationPanel: React.FC<CollaborationPanelProps> = ({
  investigation,
  collaborators,
  comments,
  currentUserId,
  currentUserName,
  onAddComment,
  onUpdateComment,
  onDeleteComment,
  onAddCollaborator,
  onRemoveCollaborator,
  onUpdatePermissions,
  onUpdateNotifications,
  onMentionUser,
  availableUsers,
  notificationSettings,
  canManageTeam,
  isLoading = false
}) => {
  const [activeTab, setActiveTab] = useState<'comments' | 'team' | 'notifications'>('comments');
  const [commentForm, setCommentForm] = useState<CommentFormData>({
    content: '',
    relatedEntityId: investigation.id,
    relatedEntityType: 'investigation',
    isInternal: true,
    mentions: [],
    attachments: []
  });
  const [showAddMemberModal, setShowAddMemberModal] = useState(false);
  const [selectedUser, setSelectedUser] = useState<string>('');
  const [editingCommentId, setEditingCommentId] = useState<string | null>(null);
  const [editContent, setEditContent] = useState('');
  const [showMentionDropdown, setShowMentionDropdown] = useState(false);
  const [mentionQuery, setMentionQuery] = useState('');
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const [cursorPosition, setCursorPosition] = useState(0);

  const filteredComments = comments
    .filter(comment => {
      if (activeTab !== 'comments') return false;
      return comment.relatedEntityType === commentForm.relatedEntityType ||
             comment.relatedEntityId === commentForm.relatedEntityId;
    })
    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

  const availableForMention = collaborators.filter(collab =>
    collab.id !== currentUserId &&
    collab.name.toLowerCase().includes(mentionQuery.toLowerCase())
  );

  const getCollaboratorRole = (collaboratorId: string) => {
    const collaborator = collaborators.find(c => c.id === collaboratorId);
    return collaborator?.role || 'observer';
  };

  const getRoleColor = (role: string) => {
    switch (role) {
      case 'lead_investigator':
        return 'bg-purple-100 text-purple-800';
      case 'investigator':
        return 'bg-blue-100 text-blue-800';
      case 'analyst':
        return 'bg-green-100 text-green-800';
      case 'reviewer':
        return 'bg-yellow-100 text-yellow-800';
      case 'observer':
        return 'bg-gray-100 text-gray-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const handleCommentSubmit = () => {
    if (!commentForm.content.trim()) return;

    onAddComment({
      content: commentForm.content,
      relatedEntityId: commentForm.relatedEntityId,
      relatedEntityType: commentForm.relatedEntityType,
      isInternal: commentForm.isInternal,
      mentions: commentForm.mentions,
      attachments: commentForm.attachments
    });

    // Notify mentioned users
    commentForm.mentions.forEach(userId => {
      onMentionUser(userId);
    });

    // Reset form
    setCommentForm({
      content: '',
      relatedEntityId: investigation.id,
      relatedEntityType: 'investigation',
      isInternal: true,
      mentions: [],
      attachments: []
    });
  };

  const handleMention = (userId: string, userName: string) => {
    const textarea = textareaRef.current;
    if (!textarea) return;

    const beforeMention = commentForm.content.substring(0, cursorPosition - mentionQuery.length - 1);
    const afterMention = commentForm.content.substring(cursorPosition);
    const newContent = `${beforeMention}@${userName} ${afterMention}`;

    setCommentForm(prev => ({
      ...prev,
      content: newContent,
      mentions: [...prev.mentions.filter(id => id !== userId), userId]
    }));

    setShowMentionDropdown(false);
    setMentionQuery('');

    // Focus back to textarea
    setTimeout(() => {
      textarea.focus();
      const newPosition = beforeMention.length + userName.length + 2;
      textarea.setSelectionRange(newPosition, newPosition);
    }, 0);
  };

  const handleContentChange = (content: string) => {
    setCommentForm(prev => ({ ...prev, content }));

    // Check for mention trigger
    if (textareaRef.current) {
      const cursorPos = textareaRef.current.selectionStart;
      setCursorPosition(cursorPos);

      const textBeforeCursor = content.substring(0, cursorPos);
      const mentionMatch = textBeforeCursor.match(/@(\w*)$/);

      if (mentionMatch) {
        setMentionQuery(mentionMatch[1]);
        setShowMentionDropdown(true);
      } else {
        setShowMentionDropdown(false);
        setMentionQuery('');
      }
    }
  };

  const startEditComment = (comment: Comment) => {
    setEditingCommentId(comment.id);
    setEditContent(comment.content);
  };

  const saveEditComment = () => {
    if (editingCommentId && editContent.trim()) {
      onUpdateComment(editingCommentId, editContent.trim());
      setEditingCommentId(null);
      setEditContent('');
    }
  };

  const cancelEditComment = () => {
    setEditingCommentId(null);
    setEditContent('');
  };

  const handleAddMember = () => {
    if (!selectedUser) return;

    const user = availableUsers.find(u => u.id === selectedUser);
    if (!user) return;

    onAddCollaborator({
      ...user,
      permissions: {
        canEdit: user.role === 'lead_investigator' || user.role === 'investigator',
        canAddEvidence: user.role !== 'observer',
        canAssignSteps: user.role === 'lead_investigator' || user.role === 'investigator',
        canReview: user.role !== 'observer',
        canExport: user.role !== 'observer'
      }
    });

    setSelectedUser('');
    setShowAddMemberModal(false);
  };

  const formatTime = (timestamp: string) => {
    const date = new Date(timestamp);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMins / 60);
    const diffDays = Math.floor(diffHours / 24);

    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    if (diffDays < 7) return `${diffDays}d ago`;
    return date.toLocaleDateString();
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-blue-500"></div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-lg border border-gray-200 h-full flex flex-col">
      {/* Header */}
      <div className="px-6 py-4 border-b border-gray-200">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">Collaboration</h2>

        {/* Tab Navigation */}
        <nav className="flex space-x-6">
          {(['comments', 'team', 'notifications'] as const).map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`pb-2 border-b-2 font-medium text-sm capitalize transition-colors ${
                activeTab === tab
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700'
              }`}
            >
              {tab}
              {tab === 'comments' && (
                <span className="ml-2 bg-gray-100 text-gray-600 py-1 px-2 rounded-full text-xs">
                  {comments.length}
                </span>
              )}
              {tab === 'team' && (
                <span className="ml-2 bg-gray-100 text-gray-600 py-1 px-2 rounded-full text-xs">
                  {collaborators.length}
                </span>
              )}
            </button>
          ))}
        </nav>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-hidden">
        {activeTab === 'comments' && (
          <div className="h-full flex flex-col">
            {/* Comment Form */}
            <div className="p-4 border-b border-gray-200">
              <div className="space-y-3">
                <div className="grid grid-cols-2 gap-3">
                  <select
                    value={commentForm.relatedEntityType}
                    onChange={(e) => setCommentForm(prev => ({
                      ...prev,
                      relatedEntityType: e.target.value as 'investigation' | 'step' | 'evidence'
                    }))}
                    className="px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="investigation">Investigation</option>
                    <option value="step">Step</option>
                    <option value="evidence">Evidence</option>
                  </select>

                  <label className="flex items-center">
                    <input
                      type="checkbox"
                      checked={commentForm.isInternal}
                      onChange={(e) => setCommentForm(prev => ({ ...prev, isInternal: e.target.checked }))}
                      className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                    />
                    <span className="ml-2 text-sm text-gray-700">Internal only</span>
                  </label>
                </div>

                <div className="relative">
                  <textarea
                    ref={textareaRef}
                    value={commentForm.content}
                    onChange={(e) => handleContentChange(e.target.value)}
                    placeholder="Add a comment... Use @username to mention team members"
                    rows={3}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />

                  {/* Mention Dropdown */}
                  {showMentionDropdown && availableForMention.length > 0 && (
                    <div className="absolute z-10 w-full mt-1 bg-white border border-gray-300 rounded-md shadow-lg max-h-48 overflow-y-auto">
                      {availableForMention.map(user => (
                        <button
                          key={user.id}
                          onClick={() => handleMention(user.id, user.name)}
                          className="w-full px-3 py-2 text-left hover:bg-gray-50 flex items-center gap-2"
                        >
                          <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center text-sm font-medium">
                            {user.name.charAt(0).toUpperCase()}
                          </div>
                          <div>
                            <div className="font-medium text-sm">{user.name}</div>
                            <div className="text-xs text-gray-500">{user.role.replace('_', ' ')}</div>
                          </div>
                        </button>
                      ))}
                    </div>
                  )}
                </div>

                <button
                  onClick={handleCommentSubmit}
                  disabled={!commentForm.content.trim()}
                  className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                  Add Comment
                </button>
              </div>
            </div>

            {/* Comments List */}
            <div className="flex-1 overflow-y-auto p-4 space-y-4">
              {filteredComments.map(comment => (
                <div key={comment.id} className="border border-gray-200 rounded-lg p-4">
                  <div className="flex items-start justify-between mb-2">
                    <div className="flex items-center gap-2">
                      <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center text-sm font-medium">
                        {comment.authorName.charAt(0).toUpperCase()}
                      </div>
                      <div>
                        <span className="font-medium text-sm">{comment.authorName}</span>
                        <span className="text-xs text-gray-500 ml-2">{formatTime(comment.createdAt)}</span>
                        {comment.isInternal && (
                          <span className="ml-2 px-2 py-1 bg-yellow-100 text-yellow-800 rounded text-xs">
                            Internal
                          </span>
                        )}
                      </div>
                    </div>

                    {comment.authorId === currentUserId && (
                      <div className="flex gap-1">
                        <button
                          onClick={() => startEditComment(comment)}
                          className="p-1 text-gray-400 hover:text-gray-600"
                        >
                          ✏️
                        </button>
                        <button
                          onClick={() => onDeleteComment(comment.id)}
                          className="p-1 text-gray-400 hover:text-red-600"
                        >
                          🗑️
                        </button>
                      </div>
                    )}
                  </div>

                  {editingCommentId === comment.id ? (
                    <div className="space-y-2">
                      <textarea
                        value={editContent}
                        onChange={(e) => setEditContent(e.target.value)}
                        rows={3}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                      />
                      <div className="flex gap-2">
                        <button
                          onClick={saveEditComment}
                          className="px-3 py-1 bg-blue-600 text-white rounded text-sm hover:bg-blue-700"
                        >
                          Save
                        </button>
                        <button
                          onClick={cancelEditComment}
                          className="px-3 py-1 bg-gray-600 text-white rounded text-sm hover:bg-gray-700"
                        >
                          Cancel
                        </button>
                      </div>
                    </div>
                  ) : (
                    <div>
                      <p className="text-gray-700 text-sm whitespace-pre-wrap">{comment.content}</p>
                      {comment.mentions.length > 0 && (
                        <div className="mt-2 flex flex-wrap gap-1">
                          {comment.mentions.map(userId => {
                            const user = collaborators.find(c => c.id === userId);
                            return user ? (
                              <span key={userId} className="px-2 py-1 bg-blue-100 text-blue-800 rounded text-xs">
                                @{user.name}
                              </span>
                            ) : null;
                          })}
                        </div>
                      )}
                      {comment.updatedAt && comment.updatedAt !== comment.createdAt && (
                        <p className="text-xs text-gray-500 mt-1">Edited {formatTime(comment.updatedAt)}</p>
                      )}
                    </div>
                  )}
                </div>
              ))}

              {filteredComments.length === 0 && (
                <div className="text-center py-8">
                  <div className="text-4xl mb-2">💬</div>
                  <p className="text-gray-600">No comments yet. Start the conversation!</p>
                </div>
              )}
            </div>
          </div>
        )}

        {activeTab === 'team' && (
          <div className="p-4 space-y-4">
            {/* Add Member Button */}
            {canManageTeam && (
              <button
                onClick={() => setShowAddMemberModal(true)}
                className="w-full px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors"
              >
                Add Team Member
              </button>
            )}

            {/* Team Members List */}
            <div className="space-y-3">
              {collaborators.map(collaborator => (
                <div key={collaborator.id} className="border border-gray-200 rounded-lg p-4">
                  <div className="flex items-start justify-between">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center text-sm font-medium">
                        {collaborator.name.charAt(0).toUpperCase()}
                      </div>
                      <div>
                        <h4 className="font-medium text-gray-900">{collaborator.name}</h4>
                        <p className="text-sm text-gray-600">{collaborator.email}</p>
                        <p className="text-sm text-gray-500">{collaborator.department}</p>
                        <span className={`inline-block px-2 py-1 rounded text-xs font-medium mt-1 ${getRoleColor(collaborator.role)}`}>
                          {collaborator.role.replace('_', ' ')}
                        </span>
                      </div>
                    </div>

                    {canManageTeam && collaborator.id !== investigation.leadInvestigator && (
                      <button
                        onClick={() => onRemoveCollaborator(collaborator.id)}
                        className="p-1 text-gray-400 hover:text-red-600"
                      >
                        🗑️
                      </button>
                    )}
                  </div>

                  {/* Permissions */}
                  <div className="mt-3 pt-3 border-t border-gray-100">
                    <h5 className="text-sm font-medium text-gray-700 mb-2">Permissions</h5>
                    <div className="grid grid-cols-2 gap-2 text-xs">
                      {Object.entries(collaborator.permissions).map(([key, value]) => (
                        <div key={key} className={`flex items-center gap-1 ${value ? 'text-green-600' : 'text-gray-400'}`}>
                          <span>{value ? '✓' : '✗'}</span>
                          <span>{key.replace('can', '').replace(/([A-Z])/g, ' $1').toLowerCase()}</span>
                        </div>
                      ))}
                    </div>
                  </div>

                  <div className="mt-2 text-xs text-gray-500">
                    Added by {collaborator.addedBy} on {new Date(collaborator.addedAt).toLocaleDateString()}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {activeTab === 'notifications' && (
          <div className="p-4 space-y-6">
            <h3 className="font-medium text-gray-900">Notification Settings</h3>

            <div className="space-y-4">
              {Object.entries(notificationSettings).map(([key, value]) => (
                <label key={key} className="flex items-center justify-between">
                  <span className="text-sm text-gray-700 capitalize">
                    {key.replace(/([A-Z])/g, ' $1').toLowerCase()}
                  </span>
                  <input
                    type="checkbox"
                    checked={value}
                    onChange={(e) => onUpdateNotifications({
                      ...notificationSettings,
                      [key]: e.target.checked
                    })}
                    className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                  />
                </label>
              ))}
            </div>

            <div className="pt-4 border-t border-gray-200">
              <h4 className="font-medium text-gray-900 mb-2">Email Digest</h4>
              <p className="text-sm text-gray-600 mb-3">
                Receive a daily summary of investigation activity
              </p>
              <button className="px-4 py-2 bg-gray-600 text-white rounded-md hover:bg-gray-700 transition-colors">
                Configure Email Settings
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Add Member Modal */}
      {showAddMemberModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-xl max-w-md w-full">
            <div className="px-6 py-4 border-b border-gray-200">
              <h3 className="text-lg font-semibold text-gray-900">Add Team Member</h3>
            </div>

            <div className="px-6 py-4">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Select User
              </label>
              <select
                value={selectedUser}
                onChange={(e) => setSelectedUser(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="">Choose a user...</option>
                {availableUsers
                  .filter(user => !collaborators.some(c => c.id === user.id))
                  .map(user => (
                    <option key={user.id} value={user.id}>
                      {user.name} ({user.role.replace('_', ' ')}) - {user.department}
                    </option>
                  ))}
              </select>
            </div>

            <div className="px-6 py-4 border-t border-gray-200 flex items-center justify-end gap-3">
              <button
                onClick={() => setShowAddMemberModal(false)}
                className="px-4 py-2 text-gray-600 hover:text-gray-800 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleAddMember}
                disabled={!selectedUser}
                className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50 transition-colors"
              >
                Add Member
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};