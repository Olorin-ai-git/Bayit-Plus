import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import '@testing-library/jest-dom';
import CommentSidebar from '../../../src/js/components/CommentSidebar';
import { CommentMessage } from '../../../src/js/components/CommentWindow';

describe('CommentSidebar', () => {
  let baseProps: any;
  beforeEach(() => {
    baseProps = {
      isOpen: true,
      width: 320,
      investigatorComments: [],
      policyComments: [],
      onInvestigatorSend: jest.fn(),
      onPolicySend: jest.fn(),
      investigationId: 'INV-123',
      entityId: 'test-entity',
      entityType: 'user_id',
      commentPrefix: '',
      onClose: jest.fn(),
      onCommentLogUpdateRequest: jest.fn(),
      commentLog: [],
      selectedRole: 'Investigator',
      messages: [],
      onSend: jest.fn(),
      onLogUpdateRequest: jest.fn(),
      isLoading: false,
      currentInvestigationId: 'INV-123',
    };
  });

  it('renders with minimal props and investigator role', () => {
    render(<CommentSidebar {...baseProps} />);
    expect(screen.getByLabelText('Investigator')).toBeInTheDocument();
    expect(screen.getByLabelText('Policy Team')).toBeInTheDocument();
    expect(screen.getByLabelText('Close chat sidebar')).toBeInTheDocument();
    expect(screen.getByText(/Investigator Comments/i)).toBeInTheDocument();
  });

  it('renders with policy role', () => {
    render(<CommentSidebar {...baseProps} selectedRole="Policy Team" />);
    expect(screen.getByText(/Policy Team Comments/i)).toBeInTheDocument();
  });

  it('renders investigator comments', () => {
    const comment: CommentMessage = {
      sender: 'A',
      text: 'Hello',
      timestamp: Date.now(),
      investigationId: 'INV-123',
      entityId: 'test-entity',
      entityType: 'user_id',
    };
    render(<CommentSidebar {...baseProps} investigatorComments={[comment]} />);
    expect(screen.getByText(/Hello/)).toBeInTheDocument();
  });

  it('renders policy comments', () => {
    const comment: CommentMessage = {
      sender: 'B',
      text: 'Policy',
      timestamp: Date.now(),
      investigationId: 'INV-123',
      entityId: 'test-entity',
      entityType: 'user_id',
    };
    render(
      <CommentSidebar
        {...baseProps}
        selectedRole="Policy Team"
        policyComments={[comment]}
      />,
    );
    expect(screen.getByText(/Policy Team Comments/i)).toBeInTheDocument();
    const policyElements = screen.getAllByText(/Policy/);
    expect(
      policyElements.some((el) => el.textContent?.includes('Policy')),
    ).toBe(true);
  });

  it('calls onClose when close button is clicked', () => {
    const onClose = jest.fn();
    render(<CommentSidebar {...baseProps} onClose={onClose} />);
    fireEvent.click(screen.getByLabelText('Close chat sidebar'));
    expect(onClose).toHaveBeenCalled();
  });

  it('calls onCommentLogUpdateRequest when role is changed', () => {
    const onCommentLogUpdateRequest = jest.fn();
    render(
      <CommentSidebar
        {...baseProps}
        onCommentLogUpdateRequest={onCommentLogUpdateRequest}
      />,
    );
    fireEvent.click(screen.getByLabelText('Policy Team'));
    expect(onCommentLogUpdateRequest).toHaveBeenCalledWith('Policy Team');
  });

  it('renders comment log with messages', () => {
    const comment: CommentMessage = {
      sender: 'A',
      text: 'Logmessage',
      timestamp: Date.now(),
      investigationId: 'INV-123',
      entityId: 'test-entity',
      entityType: 'user_id',
    };
    render(<CommentSidebar {...baseProps} commentLog={[comment]} />);
    expect(document.body.textContent?.toLowerCase()).toContain('a:');
  });

  it('renders with special characters in comments', () => {
    const comment: CommentMessage = {
      sender: 'A',
      text: '!@#$%^&*()',
      timestamp: Date.now(),
      investigationId: 'INV-123',
      entityId: 'test-entity',
      entityType: 'user_id',
    };
    render(<CommentSidebar {...baseProps} investigatorComments={[comment]} />);
    expect(screen.getByText(/!@#\$%\^&\*\(\)/)).toBeInTheDocument();
  });

  it('renders with long comment log', () => {
    const longText = 'A'.repeat(1000);
    const comment: CommentMessage = {
      sender: 'A',
      text: longText,
      timestamp: Date.now(),
      investigationId: 'INV-123',
      entityId: 'test-entity',
      entityType: 'user_id',
    };
    render(<CommentSidebar {...baseProps} commentLog={[comment]} />);
    expect(screen.getByText(/Comment Log/i)).toBeInTheDocument();
  });

  it('renders nothing when isOpen is false', () => {
    const { container } = render(
      <CommentSidebar {...baseProps} isOpen={false} />,
    );
    expect(container.firstChild).toBeNull();
  });
});
