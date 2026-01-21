/**
 * Integration Test: Add Collaboration Comment
 *
 * Tests the complete flow of adding comments and collaboration features.
 * This test verifies end-to-end functionality of investigation collaboration.
 *
 * Expected to FAIL initially (TDD approach) until implementation is complete.
 */

import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { BrowserRouter } from 'react-router-dom';
import { InvestigationProvider } from '@manual-investigation/contexts/InvestigationContext';
import { CollaborationPanel } from '@manual-investigation/components/CollaborationPanel';
import { Investigation, Comment, CommentType } from '@manual-investigation/types';

// Mock investigation with existing comments
const mockInvestigation: Investigation = {
  id: 'inv_collab_test',
  title: 'Collaboration Test Investigation',
  description: 'Testing collaboration features',
  userId: 'user_analyst_001',
  priority: 'high',
  status: 'in_progress',
  createdAt: new Date(Date.now() - 7200000).toISOString(),
  updatedAt: new Date().toISOString(),
  steps: [],
  evidence: [],
  comments: [
    {
      id: 'comment_001',
      investigationId: 'inv_collab_test',
      userId: 'user_analyst_001',
      content: 'Initial analysis shows suspicious device patterns. Recommend escalating to device fingerprinting expert.',
      type: CommentType.ANALYSIS,
      createdAt: new Date(Date.now() - 5400000).toISOString(),
      metadata: {
        userRole: 'Senior Analyst',
        userName: 'Alice Johnson'
      }
    },
    {
      id: 'comment_002',
      investigationId: 'inv_collab_test',
      userId: 'user_expert_002',
      content: 'Reviewing device fingerprint data now. Will provide detailed analysis within 30 minutes.',
      type: CommentType.STATUS_UPDATE,
      createdAt: new Date(Date.now() - 3600000).toISOString(),
      metadata: {
        userRole: 'Device Expert',
        userName: 'Bob Smith'
      }
    },
    {
      id: 'comment_003',
      investigationId: 'inv_collab_test',
      userId: 'user_expert_002',
      content: 'Device analysis complete. High confidence of device spoofing detected. Risk score: 0.92',
      type: CommentType.FINDINGS,
      createdAt: new Date(Date.now() - 1800000).toISOString(),
      metadata: {
        userRole: 'Device Expert',
        userName: 'Bob Smith',
        attachments: ['device_analysis_report.pdf']
      }
    }
  ],
  tags: ['collaboration-test'],
  metadata: {},
  finalRiskScore: null,
  completedAt: null
};

// Mock current user
const mockCurrentUser = {
  id: 'user_analyst_003',
  name: 'Carol Wilson',
  role: 'Fraud Analyst',
  permissions: ['comment', 'analysis', 'evidence_add']
};

// Mock WebSocket for real-time collaboration
const mockWebSocket = {
  send: jest.fn(),
  close: jest.fn(),
  addEventListener: jest.fn(),
  removeEventListener: jest.fn(),
  readyState: WebSocket.OPEN
};

// Mock services
jest.mock('@manual-investigation/services/InvestigationService', () => ({
  InvestigationService: {
    getInvestigation: jest.fn().mockResolvedValue(mockInvestigation),
    addComment: jest.fn().mockImplementation((investigationId: string, commentData: any) =>
      Promise.resolve({
        id: `comment_new_${Date.now()}`,
        investigationId,
        userId: mockCurrentUser.id,
        content: commentData.content,
        type: commentData.type,
        createdAt: new Date().toISOString(),
        metadata: {
          userRole: mockCurrentUser.role,
          userName: mockCurrentUser.name
        }
      })
    ),
    updateComment: jest.fn().mockResolvedValue({
      id: 'comment_updated',
      content: 'Updated comment content',
      updatedAt: new Date().toISOString()
    }),
    deleteComment: jest.fn().mockResolvedValue({ success: true }),
    mentionUser: jest.fn().mockResolvedValue({ success: true })
  }
}));

jest.mock('@shared/services/WebSocketService', () => ({
  WebSocketService: {
    connect: jest.fn().mockReturnValue(mockWebSocket),
    disconnect: jest.fn(),
    subscribe: jest.fn(),
    unsubscribe: jest.fn(),
    isConnected: jest.fn().mockReturnValue(true)
  }
}));

jest.mock('@shared/services/UserService', () => ({
  UserService: {
    getCurrentUser: jest.fn().mockResolvedValue(mockCurrentUser),
    searchUsers: jest.fn().mockResolvedValue([
      { id: 'user_analyst_004', name: 'Dave Brown', role: 'Senior Analyst' },
      { id: 'user_expert_003', name: 'Eve Davis', role: 'Location Expert' }
    ]),
    getUserById: jest.fn().mockImplementation((userId: string) => {
      const users = {
        'user_analyst_001': { id: 'user_analyst_001', name: 'Alice Johnson', role: 'Senior Analyst' },
        'user_expert_002': { id: 'user_expert_002', name: 'Bob Smith', role: 'Device Expert' }
      };
      return Promise.resolve(users[userId] || null);
    })
  }
}));

// Test wrapper
const TestWrapper: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <BrowserRouter>
    <InvestigationProvider>
      {children}
    </InvestigationProvider>
  </BrowserRouter>
);

describe('Integration Test: Add Collaboration Comment', () => {
  const user = userEvent.setup();

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('Comments Display and Rendering', () => {
    it('should display existing comments with proper formatting', async () => {
      try {
        render(
          <TestWrapper>
            <CollaborationPanel investigationId="inv_collab_test" />
          </TestWrapper>
        );

        // Wait for comments to load
        await waitFor(() => {
          expect(screen.getByText('Alice Johnson')).toBeInTheDocument();
        });

        // Should display all three existing comments
        expect(screen.getByText('Alice Johnson')).toBeInTheDocument();
        expect(screen.getByText('Bob Smith')).toBeInTheDocument();

        // Should display comment content
        expect(screen.getByText(/initial analysis shows suspicious/i)).toBeInTheDocument();
        expect(screen.getByText(/reviewing device fingerprint/i)).toBeInTheDocument();
        expect(screen.getByText(/device analysis complete/i)).toBeInTheDocument();

        // Should show user roles
        expect(screen.getByText('Senior Analyst')).toBeInTheDocument();
        expect(screen.getByText('Device Expert')).toBeInTheDocument();

      } catch (error) {
        throw new Error(`Comments display test failed: ${error}. This is expected during TDD phase.`);
      }
    });

    it('should display comments with appropriate type styling', async () => {
      try {
        render(
          <TestWrapper>
            <CollaborationPanel investigationId="inv_collab_test" />
          </TestWrapper>
        );

        await waitFor(() => {
          expect(screen.getByText('Alice Johnson')).toBeInTheDocument();
        });

        // Check comment type badges
        const analysisComment = screen.getByTestId('comment-comment_001');
        expect(within(analysisComment).getByText('Analysis')).toBeInTheDocument();
        expect(within(analysisComment).getByText('Analysis')).toHaveClass('bg-blue-100', 'text-blue-800');

        const statusComment = screen.getByTestId('comment-comment_002');
        expect(within(statusComment).getByText('Status Update')).toBeInTheDocument();
        expect(within(statusComment).getByText('Status Update')).toHaveClass('bg-green-100', 'text-green-800');

        const findingsComment = screen.getByTestId('comment-comment_003');
        expect(within(findingsComment).getByText('Findings')).toBeInTheDocument();
        expect(within(findingsComment).getByText('Findings')).toHaveClass('bg-purple-100', 'text-purple-800');

      } catch (error) {
        throw new Error(`Comment type styling test failed: ${error}`);
      }
    });

    it('should show timestamps in relative format', async () => {
      try {
        render(
          <TestWrapper>
            <CollaborationPanel investigationId="inv_collab_test" />
          </TestWrapper>
        );

        await waitFor(() => {
          expect(screen.getByText('Alice Johnson')).toBeInTheDocument();
        });

        // Should show relative timestamps
        expect(screen.getByText(/hours ago/)).toBeInTheDocument();
        expect(screen.getByText(/hour ago/)).toBeInTheDocument();
        expect(screen.getByText(/minutes ago/)).toBeInTheDocument();

      } catch (error) {
        throw new Error(`Timestamp display test failed: ${error}`);
      }
    });

    it('should display attachments for comments that have them', async () => {
      try {
        render(
          <TestWrapper>
            <CollaborationPanel investigationId="inv_collab_test" />
          </TestWrapper>
        );

        await waitFor(() => {
          expect(screen.getByText('device_analysis_report.pdf')).toBeInTheDocument();
        });

        // Should show attachment with download link
        const attachmentLink = screen.getByRole('link', { name: /device_analysis_report.pdf/i });
        expect(attachmentLink).toBeInTheDocument();
        expect(attachmentLink).toHaveClass('text-blue-600', 'hover:text-blue-800');

      } catch (error) {
        throw new Error(`Attachments display test failed: ${error}`);
      }
    });
  });

  describe('Adding New Comments', () => {
    it('should allow adding a new comment', async () => {
      try {
        const { InvestigationService } = require('@manual-investigation/services/InvestigationService');

        render(
          <TestWrapper>
            <CollaborationPanel investigationId="inv_collab_test" />
          </TestWrapper>
        );

        await waitFor(() => {
          expect(screen.getByText('Alice Johnson')).toBeInTheDocument();
        });

        // Find comment input
        const commentInput = screen.getByRole('textbox', { name: /add comment/i });
        expect(commentInput).toBeInTheDocument();

        // Type new comment
        const newCommentText = 'Adding my analysis on the network patterns. Seeing unusual geolocation jumps.';
        await user.type(commentInput, newCommentText);

        // Select comment type
        const typeSelect = screen.getByRole('combobox', { name: /comment type/i });
        await user.click(typeSelect);
        await user.click(screen.getByRole('option', { name: /analysis/i }));

        // Submit comment
        const submitButton = screen.getByRole('button', { name: /post comment/i });
        await user.click(submitButton);

        // Should call API
        await waitFor(() => {
          expect(InvestigationService.addComment).toHaveBeenCalledWith(
            'inv_collab_test',
            {
              content: newCommentText,
              type: 'analysis'
            }
          );
        });

        // Should clear the input
        expect(commentInput).toHaveValue('');

      } catch (error) {
        throw new Error(`Add comment test failed: ${error}`);
      }
    });

    it('should support comment formatting with markdown', async () => {
      try {
        render(
          <TestWrapper>
            <CollaborationPanel investigationId="inv_collab_test" />
          </TestWrapper>
        );

        await waitFor(() => {
          expect(screen.getByText('Alice Johnson')).toBeInTheDocument();
        });

        const commentInput = screen.getByRole('textbox', { name: /add comment/i });

        // Type formatted comment
        const formattedComment = 'Key findings:\n\n**High Risk Indicators:**\n- Device spoofing detected\n- Impossible travel pattern\n- *VPN usage confirmed*\n\n```\nRisk Score: 0.92\n```';
        await user.type(commentInput, formattedComment);

        // Should show formatting toolbar
        expect(screen.getByRole('button', { name: /bold/i })).toBeInTheDocument();
        expect(screen.getByRole('button', { name: /italic/i })).toBeInTheDocument();
        expect(screen.getByRole('button', { name: /code/i })).toBeInTheDocument();

        // Should show preview
        const previewTab = screen.getByRole('tab', { name: /preview/i });
        await user.click(previewTab);

        // Should render markdown in preview
        await waitFor(() => {
          expect(screen.getByText('High Risk Indicators:')).toBeInTheDocument();
          expect(screen.getByText('Device spoofing detected')).toBeInTheDocument();
        });

      } catch (error) {
        throw new Error(`Comment formatting test failed: ${error}`);
      }
    });

    it('should support mentioning other users', async () => {
      try {
        const { UserService } = require('@shared/services/UserService');

        render(
          <TestWrapper>
            <CollaborationPanel investigationId="inv_collab_test" />
          </TestWrapper>
        );

        await waitFor(() => {
          expect(screen.getByText('Alice Johnson')).toBeInTheDocument();
        });

        const commentInput = screen.getByRole('textbox', { name: /add comment/i });

        // Start typing a mention
        await user.type(commentInput, '@Dave');

        // Should show user suggestions
        await waitFor(() => {
          expect(UserService.searchUsers).toHaveBeenCalledWith('Dave');
          expect(screen.getByText('Dave Brown')).toBeInTheDocument();
          expect(screen.getByText('Senior Analyst')).toBeInTheDocument();
        });

        // Select user from dropdown
        const userOption = screen.getByRole('option', { name: /dave brown/i });
        await user.click(userOption);

        // Should complete the mention
        expect(commentInput).toHaveValue('@Dave Brown ');

        // Complete the comment
        await user.type(commentInput, 'can you review the location analysis?');

        // Submit comment
        const submitButton = screen.getByRole('button', { name: /post comment/i });
        await user.click(submitButton);

        // Should call mention API
        await waitFor(() => {
          expect(InvestigationService.mentionUser).toHaveBeenCalledWith(
            'inv_collab_test',
            'user_analyst_004'
          );
        });

      } catch (error) {
        throw new Error(`User mention test failed: ${error}`);
      }
    });

    it('should support file attachments', async () => {
      try {
        render(
          <TestWrapper>
            <CollaborationPanel investigationId="inv_collab_test" />
          </TestWrapper>
        );

        await waitFor(() => {
          expect(screen.getByText('Alice Johnson')).toBeInTheDocument();
        });

        // Find file upload button
        const fileUploadButton = screen.getByRole('button', { name: /attach file/i });
        await user.click(fileUploadButton);

        // Mock file selection
        const fileInput = screen.getByLabelText(/choose file/i);
        const testFile = new File(['test content'], 'network_analysis.png', { type: 'image/png' });

        await user.upload(fileInput, testFile);

        // Should show file preview
        await waitFor(() => {
          expect(screen.getByText('network_analysis.png')).toBeInTheDocument();
          expect(screen.getByText('PNG Image')).toBeInTheDocument();
        });

        // Add comment with attachment
        const commentInput = screen.getByRole('textbox', { name: /add comment/i });
        await user.type(commentInput, 'Attached network analysis visualization');

        const submitButton = screen.getByRole('button', { name: /post comment/i });
        await user.click(submitButton);

        // Should include attachment in API call
        await waitFor(() => {
          const { InvestigationService } = require('@manual-investigation/services/InvestigationService');
          expect(InvestigationService.addComment).toHaveBeenCalledWith(
            'inv_collab_test',
            expect.objectContaining({
              content: 'Attached network analysis visualization',
              attachments: expect.arrayContaining([
                expect.objectContaining({ name: 'network_analysis.png' })
              ])
            })
          );
        });

      } catch (error) {
        throw new Error(`File attachment test failed: ${error}`);
      }
    });
  });

  describe('Comment Actions', () => {
    it('should allow editing own comments', async () => {
      try {
        // Mock current user as the comment author
        const { UserService } = require('@shared/services/UserService');
        UserService.getCurrentUser.mockResolvedValueOnce({
          ...mockCurrentUser,
          id: 'user_analyst_001' // Same as comment author
        });

        render(
          <TestWrapper>
            <CollaborationPanel investigationId="inv_collab_test" />
          </TestWrapper>
        );

        await waitFor(() => {
          expect(screen.getByText('Alice Johnson')).toBeInTheDocument();
        });

        // Find own comment and click edit
        const ownComment = screen.getByTestId('comment-comment_001');
        const editButton = within(ownComment).getByRole('button', { name: /edit/i });
        await user.click(editButton);

        // Should switch to edit mode
        const editInput = within(ownComment).getByRole('textbox');
        expect(editInput).toHaveValue('Initial analysis shows suspicious device patterns. Recommend escalating to device fingerprinting expert.');

        // Edit the comment
        await user.clear(editInput);
        await user.type(editInput, 'Updated analysis: suspicious device patterns confirmed. Escalating to device expert immediately.');

        // Save changes
        const saveButton = within(ownComment).getByRole('button', { name: /save/i });
        await user.click(saveButton);

        // Should call update API
        await waitFor(() => {
          const { InvestigationService } = require('@manual-investigation/services/InvestigationService');
          expect(InvestigationService.updateComment).toHaveBeenCalledWith(
            'comment_001',
            {
              content: 'Updated analysis: suspicious device patterns confirmed. Escalating to device expert immediately.'
            }
          );
        });

      } catch (error) {
        throw new Error(`Comment editing test failed: ${error}`);
      }
    });

    it('should allow deleting own comments with confirmation', async () => {
      try {
        // Mock current user as comment author
        const { UserService } = require('@shared/services/UserService');
        UserService.getCurrentUser.mockResolvedValueOnce({
          ...mockCurrentUser,
          id: 'user_analyst_001'
        });

        render(
          <TestWrapper>
            <CollaborationPanel investigationId="inv_collab_test" />
          </TestWrapper>
        );

        await waitFor(() => {
          expect(screen.getByText('Alice Johnson')).toBeInTheDocument();
        });

        // Click delete on own comment
        const ownComment = screen.getByTestId('comment-comment_001');
        const deleteButton = within(ownComment).getByRole('button', { name: /delete/i });
        await user.click(deleteButton);

        // Should show confirmation dialog
        await waitFor(() => {
          expect(screen.getByRole('dialog')).toBeInTheDocument();
          expect(screen.getByText(/delete this comment/i)).toBeInTheDocument();
        });

        // Confirm deletion
        const confirmButton = screen.getByRole('button', { name: /confirm delete/i });
        await user.click(confirmButton);

        // Should call delete API
        await waitFor(() => {
          const { InvestigationService } = require('@manual-investigation/services/InvestigationService');
          expect(InvestigationService.deleteComment).toHaveBeenCalledWith('comment_001');
        });

        // Comment should be removed from UI
        expect(screen.queryByTestId('comment-comment_001')).not.toBeInTheDocument();

      } catch (error) {
        throw new Error(`Comment deletion test failed: ${error}`);
      }
    });

    it('should not show edit/delete options for other users comments', async () => {
      try {
        render(
          <TestWrapper>
            <CollaborationPanel investigationId="inv_collab_test" />
          </TestWrapper>
        );

        await waitFor(() => {
          expect(screen.getByText('Bob Smith')).toBeInTheDocument();
        });

        // Other user's comment should not have edit/delete buttons
        const otherComment = screen.getByTestId('comment-comment_002');
        expect(within(otherComment).queryByRole('button', { name: /edit/i })).not.toBeInTheDocument();
        expect(within(otherComment).queryByRole('button', { name: /delete/i })).not.toBeInTheDocument();

        // Should only show reply button
        expect(within(otherComment).getByRole('button', { name: /reply/i })).toBeInTheDocument();

      } catch (error) {
        throw new Error(`Comment permissions test failed: ${error}`);
      }
    });

    it('should support replying to comments', async () => {
      try {
        render(
          <TestWrapper>
            <CollaborationPanel investigationId="inv_collab_test" />
          </TestWrapper>
        );

        await waitFor(() => {
          expect(screen.getByText('Bob Smith')).toBeInTheDocument();
        });

        // Click reply on a comment
        const comment = screen.getByTestId('comment-comment_002');
        const replyButton = within(comment).getByRole('button', { name: /reply/i });
        await user.click(replyButton);

        // Should show reply input
        const replyInput = screen.getByRole('textbox', { name: /reply to bob smith/i });
        expect(replyInput).toBeInTheDocument();

        // Type reply
        await user.type(replyInput, 'Thanks for the update. Looking forward to your detailed analysis.');

        // Submit reply
        const submitReplyButton = screen.getByRole('button', { name: /post reply/i });
        await user.click(submitReplyButton);

        // Should call API with parent comment reference
        await waitFor(() => {
          const { InvestigationService } = require('@manual-investigation/services/InvestigationService');
          expect(InvestigationService.addComment).toHaveBeenCalledWith(
            'inv_collab_test',
            expect.objectContaining({
              content: 'Thanks for the update. Looking forward to your detailed analysis.',
              parentCommentId: 'comment_002',
              type: 'reply'
            })
          );
        });

      } catch (error) {
        throw new Error(`Comment reply test failed: ${error}`);
      }
    });
  });

  describe('Real-time Collaboration', () => {
    it('should show new comments in real-time via WebSocket', async () => {
      try {
        const { WebSocketService } = require('@shared/services/WebSocketService');

        render(
          <TestWrapper>
            <CollaborationPanel investigationId="inv_collab_test" />
          </TestWrapper>
        );

        await waitFor(() => {
          expect(screen.getByText('Alice Johnson')).toBeInTheDocument();
        });

        // Verify WebSocket subscription
        expect(WebSocketService.subscribe).toHaveBeenCalledWith(
          'collaboration_updates',
          expect.any(Function)
        );

        // Simulate new comment event
        const newCommentEvent = {
          type: 'comment_added',
          investigationId: 'inv_collab_test',
          data: {
            id: 'comment_realtime_123',
            investigationId: 'inv_collab_test',
            userId: 'user_expert_003',
            content: 'Real-time comment from location expert. Travel pattern analysis shows impossible travel detected.',
            type: 'findings',
            createdAt: new Date().toISOString(),
            metadata: {
              userRole: 'Location Expert',
              userName: 'Eve Davis'
            }
          }
        };

        // Get WebSocket callback and trigger event
        const subscribeCall = WebSocketService.subscribe.mock.calls.find(
          call => call[0] === 'collaboration_updates'
        );
        const updateCallback = subscribeCall[1];
        updateCallback(newCommentEvent);

        // Should show new comment in UI
        await waitFor(() => {
          expect(screen.getByText('Eve Davis')).toBeInTheDocument();
          expect(screen.getByText(/travel pattern analysis shows/i)).toBeInTheDocument();
          expect(screen.getByText('Location Expert')).toBeInTheDocument();
        });

      } catch (error) {
        throw new Error(`Real-time comments test failed: ${error}`);
      }
    });

    it('should show typing indicators when users are typing', async () => {
      try {
        render(
          <TestWrapper>
            <CollaborationPanel investigationId="inv_collab_test" />
          </TestWrapper>
        );

        await waitFor(() => {
          expect(screen.getByText('Alice Johnson')).toBeInTheDocument();
        });

        // Simulate typing indicator event
        const typingEvent = {
          type: 'user_typing',
          investigationId: 'inv_collab_test',
          data: {
            userId: 'user_expert_003',
            userName: 'Eve Davis',
            isTyping: true
          }
        };

        const { WebSocketService } = require('@shared/services/WebSocketService');
        const subscribeCall = WebSocketService.subscribe.mock.calls.find(
          call => call[0] === 'collaboration_updates'
        );
        const updateCallback = subscribeCall[1];
        updateCallback(typingEvent);

        // Should show typing indicator
        await waitFor(() => {
          expect(screen.getByText(/eve davis is typing/i)).toBeInTheDocument();
        });

        // Simulate stop typing
        const stopTypingEvent = {
          ...typingEvent,
          data: { ...typingEvent.data, isTyping: false }
        };
        updateCallback(stopTypingEvent);

        // Should hide typing indicator
        await waitFor(() => {
          expect(screen.queryByText(/eve davis is typing/i)).not.toBeInTheDocument();
        });

      } catch (error) {
        throw new Error(`Typing indicators test failed: ${error}`);
      }
    });

    it('should show online status of collaborators', async () => {
      try {
        render(
          <TestWrapper>
            <CollaborationPanel investigationId="inv_collab_test" />
          </TestWrapper>
        );

        await waitFor(() => {
          expect(screen.getByText('Alice Johnson')).toBeInTheDocument();
        });

        // Should show collaborators sidebar
        expect(screen.getByText(/active collaborators/i)).toBeInTheDocument();

        // Simulate user online event
        const userOnlineEvent = {
          type: 'user_status_changed',
          investigationId: 'inv_collab_test',
          data: {
            userId: 'user_expert_003',
            userName: 'Eve Davis',
            status: 'online',
            lastActive: new Date().toISOString()
          }
        };

        const { WebSocketService } = require('@shared/services/WebSocketService');
        const subscribeCall = WebSocketService.subscribe.mock.calls.find(
          call => call[0] === 'collaboration_updates'
        );
        const updateCallback = subscribeCall[1];
        updateCallback(userOnlineEvent);

        // Should show user as online
        await waitFor(() => {
          expect(screen.getByText('Eve Davis')).toBeInTheDocument();
          const userStatus = screen.getByTestId('user-status-user_expert_003');
          expect(userStatus).toHaveClass('bg-green-400'); // Online indicator
        });

      } catch (error) {
        throw new Error(`Online status test failed: ${error}`);
      }
    });
  });

  describe('Error Handling and Validation', () => {
    it('should validate comment content before submission', async () => {
      try {
        render(
          <TestWrapper>
            <CollaborationPanel investigationId="inv_collab_test" />
          </TestWrapper>
        );

        await waitFor(() => {
          expect(screen.getByText('Alice Johnson')).toBeInTheDocument();
        });

        // Try to submit empty comment
        const submitButton = screen.getByRole('button', { name: /post comment/i });
        await user.click(submitButton);

        // Should show validation error
        await waitFor(() => {
          expect(screen.getByText(/comment cannot be empty/i)).toBeInTheDocument();
        });

        // Try to submit comment that's too long
        const commentInput = screen.getByRole('textbox', { name: /add comment/i });
        const longComment = 'A'.repeat(5001); // Assuming 5000 char limit
        await user.type(commentInput, longComment);

        await user.click(submitButton);

        // Should show length validation error
        await waitFor(() => {
          expect(screen.getByText(/comment is too long/i)).toBeInTheDocument();
        });

      } catch (error) {
        throw new Error(`Comment validation test failed: ${error}`);
      }
    });

    it('should handle API errors gracefully', async () => {
      try {
        const { InvestigationService } = require('@manual-investigation/services/InvestigationService');
        InvestigationService.addComment.mockRejectedValueOnce(
          new Error('Comment service temporarily unavailable')
        );

        render(
          <TestWrapper>
            <CollaborationPanel investigationId="inv_collab_test" />
          </TestWrapper>
        );

        await waitFor(() => {
          expect(screen.getByText('Alice Johnson')).toBeInTheDocument();
        });

        // Try to add comment
        const commentInput = screen.getByRole('textbox', { name: /add comment/i });
        await user.type(commentInput, 'This comment will fail to post');

        const submitButton = screen.getByRole('button', { name: /post comment/i });
        await user.click(submitButton);

        // Should show error message
        await waitFor(() => {
          expect(screen.getByText(/failed to post comment/i)).toBeInTheDocument();
          expect(screen.getByText('Comment service temporarily unavailable')).toBeInTheDocument();
        });

        // Should show retry option
        expect(screen.getByRole('button', { name: /retry/i })).toBeInTheDocument();

      } catch (error) {
        throw new Error(`API error handling test failed: ${error}`);
      }
    });

    it('should handle WebSocket disconnection gracefully', async () => {
      try {
        const { WebSocketService } = require('@shared/services/WebSocketService');
        WebSocketService.isConnected.mockReturnValue(false);

        render(
          <TestWrapper>
            <CollaborationPanel investigationId="inv_collab_test" />
          </TestWrapper>
        );

        await waitFor(() => {
          expect(screen.getByText('Alice Johnson')).toBeInTheDocument();
        });

        // Should show offline collaboration warning
        expect(screen.getByText(/real-time collaboration unavailable/i)).toBeInTheDocument();

        // Should still allow posting comments
        const commentInput = screen.getByRole('textbox', { name: /add comment/i });
        expect(commentInput).not.toBeDisabled();

        // Should show manual refresh option
        expect(screen.getByRole('button', { name: /refresh comments/i })).toBeInTheDocument();

      } catch (error) {
        throw new Error(`WebSocket disconnection handling test failed: ${error}`);
      }
    });
  });
});