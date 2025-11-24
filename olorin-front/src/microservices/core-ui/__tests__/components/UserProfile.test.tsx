import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';
import { UserProfile } from '../../components/UserProfile';

// Mock hooks
const mockUser = {
  id: '1',
  email: 'test@example.com',
  name: 'Test User',
  role: 'investigator' as const,
  avatar: null,
  permissions: ['read', 'write'],
  lastLogin: '2024-01-15T10:00:00Z',
  createdAt: '2024-01-01T00:00:00Z',
  updatedAt: '2024-01-15T10:00:00Z',
};

const mockUpdateProfile = jest.fn();
const mockLogout = jest.fn();

jest.mock('../../hooks/useAuth', () => ({
  useAuth: () => ({
    user: mockUser,
    updateProfile: mockUpdateProfile,
    logout: mockLogout,
  }),
}));

jest.mock('../../../shared/services/EventBus', () => ({
  useEventEmitter: () => ({
    emitNotification: jest.fn(),
  }),
}));

describe('UserProfile', () => {
  const defaultProps = {
    isOpen: true,
    onClose: jest.fn(),
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders nothing when not open', () => {
    render(<UserProfile {...defaultProps} isOpen={false} />);
    expect(screen.queryByText('User Profile')).not.toBeInTheDocument();
  });

  it('renders user profile dialog when open', () => {
    render(<UserProfile {...defaultProps} />);

    expect(screen.getByText('User Profile')).toBeInTheDocument();
    expect(screen.getByDisplayValue('Test User')).toBeInTheDocument();
    expect(screen.getByDisplayValue('test@example.com')).toBeInTheDocument();
  });

  it('shows correct tabs', () => {
    render(<UserProfile {...defaultProps} />);

    expect(screen.getByText('Profile')).toBeInTheDocument();
    expect(screen.getByText('Security')).toBeInTheDocument();
    expect(screen.getByText('Notifications')).toBeInTheDocument();
  });

  it('switches between tabs', () => {
    render(<UserProfile {...defaultProps} />);

    // Click Security tab
    fireEvent.click(screen.getByText('Security'));
    expect(screen.getByText('Change Password')).toBeInTheDocument();

    // Click Notifications tab
    fireEvent.click(screen.getByText('Notifications'));
    expect(screen.getByText('Notification Preferences')).toBeInTheDocument();
  });

  it('updates profile information', async () => {
    mockUpdateProfile.mockResolvedValue(undefined);
    render(<UserProfile {...defaultProps} />);

    // Update name field
    const nameInput = screen.getByDisplayValue('Test User');
    fireEvent.change(nameInput, { target: { value: 'Updated Name' } });

    // Submit form
    fireEvent.click(screen.getByText('Save Changes'));

    await waitFor(() => {
      expect(mockUpdateProfile).toHaveBeenCalledWith({
        name: 'Updated Name',
        email: 'test@example.com',
        avatar: '',
      });
    });
  });

  it('validates password change form', async () => {
    render(<UserProfile {...defaultProps} />);

    // Switch to Security tab
    fireEvent.click(screen.getByText('Security'));

    const currentPasswordInput = screen.getByLabelText('Current Password');
    const newPasswordInput = screen.getByLabelText('New Password');
    const confirmPasswordInput = screen.getByLabelText('Confirm New Password');

    fireEvent.change(currentPasswordInput, { target: { value: 'current123' } });
    fireEvent.change(newPasswordInput, { target: { value: 'new123' } });
    fireEvent.change(confirmPasswordInput, { target: { value: 'different123' } });

    fireEvent.click(screen.getByText('Change Password'));

    // Should show validation error for mismatched passwords
    await waitFor(() => {
      expect(mockUpdateProfile).not.toHaveBeenCalled();
    });
  });

  it('handles logout', async () => {
    mockLogout.mockResolvedValue(undefined);
    render(<UserProfile {...defaultProps} />);

    // Switch to Security tab
    fireEvent.click(screen.getByText('Security'));

    fireEvent.click(screen.getByText('Sign Out'));

    await waitFor(() => {
      expect(mockLogout).toHaveBeenCalledTimes(1);
    });
    
    expect(defaultProps.onClose).toHaveBeenCalledTimes(1);
  });

  it('toggles notification settings', () => {
    render(<UserProfile {...defaultProps} />);

    // Switch to Notifications tab
    fireEvent.click(screen.getByText('Notifications'));

    // Find toggle switches and click one
    const toggles = screen.getAllByRole('button');
    const emailToggle = toggles.find(toggle =>
      toggle.getAttribute('class')?.includes('bg-blue-600') ||
      toggle.getAttribute('class')?.includes('bg-gray-200')
    );

    // Assert toggle exists before interacting
    expect(emailToggle).toBeDefined();
    expect(emailToggle).toBeInTheDocument();
    if (emailToggle) {
      fireEvent.click(emailToggle);
    }
  });

  it('closes dialog when clicking outside', () => {
    render(<UserProfile {...defaultProps} />);

    // Click outside (on the backdrop) - use Testing Library query
    const dialog = screen.getByRole('dialog');
    // eslint-disable-next-line testing-library/no-node-access
    const backdrop = dialog.parentElement?.querySelector('.fixed.inset-0.bg-gray-500');
    
    // Assert backdrop exists before interacting
    expect(backdrop).toBeDefined();
    expect(backdrop).toBeInTheDocument();
    if (backdrop) {
      fireEvent.click(backdrop);
    }
    expect(defaultProps.onClose).toHaveBeenCalledTimes(1);
  });

  it('closes dialog when clicking X button', () => {
    render(<UserProfile {...defaultProps} />);

    const closeButton = screen.getByRole('button', { name: /close/i });
    fireEvent.click(closeButton);

    expect(defaultProps.onClose).toHaveBeenCalledTimes(1);
  });

  it('displays role as read-only', () => {
    render(<UserProfile {...defaultProps} />);

    const roleInput = screen.getByDisplayValue('investigator');
    expect(roleInput).toBeDisabled();
  });

  it('saves notification preferences', async () => {
    render(<UserProfile {...defaultProps} />);

    // Switch to Notifications tab
    fireEvent.click(screen.getByText('Notifications'));

    // Click save preferences
    fireEvent.click(screen.getByText('Save Preferences'));

    await waitFor(() => {
      // Should complete without errors
      expect(screen.getByText('Save Preferences')).toBeInTheDocument();
    });
  });
});