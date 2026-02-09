/**
 * Test suite for WatchPartyCreateModal component
 * Tests rendering, options toggling, create flow, loading state, and accessibility.
 */

import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import WatchPartyCreateModal from '../WatchPartyCreateModal';

// Mock design tokens
jest.mock('@olorin/design-tokens', () => ({
  colors: {
    primary: '#6C63FF',
    text: '#FFFFFF',
    textMuted: '#999999',
  },
}));

// Mock i18n
jest.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key: string, fallback: string) => fallback || key,
    i18n: { language: 'en' },
  }),
}));

// Mock logger
jest.mock('@/utils/logger', () => ({
  __esModule: true,
  default: {
    info: jest.fn(),
    error: jest.fn(),
    warn: jest.fn(),
    debug: jest.fn(),
  },
}));

// Mock platform util
jest.mock('@bayit/shared/utils/platform', () => ({
  isTV: false,
}));

// Mock TV focus hook
jest.mock('@bayit/shared/components/hooks/useTVFocus', () => ({
  useTVFocus: () => ({
    handleFocus: jest.fn(),
    handleBlur: jest.fn(),
    isFocused: false,
    focusStyle: {},
  }),
}));

// Mock GlassModal and GlassLoadingSpinner
jest.mock('@bayit/shared/ui', () => ({
  GlassModal: ({ visible, title, onClose, dismissable, children }: any) => {
    if (!visible) return null;
    return (
      <div data-testid="glass-modal" data-dismissable={String(dismissable)}>
        <span data-testid="modal-title">{title}</span>
        <button data-testid="modal-close" onClick={onClose}>Close</button>
        {children}
      </div>
    );
  },
  GlassLoadingSpinner: ({ size, ...props }: any) => (
    <div data-testid="glass-spinner" data-size={size} {...props} />
  ),
}));

// Mock lucide-react icons
jest.mock('lucide-react', () => ({
  MessageSquare: ({ size, color }: any) => <span data-testid="icon-message-square">MessageSquare</span>,
  RefreshCw: ({ size, color }: any) => <span data-testid="icon-refresh">RefreshCw</span>,
  Check: ({ size, color }: any) => <span data-testid="icon-check">Check</span>,
  Zap: ({ size, color }: any) => <span data-testid="icon-zap">Zap</span>,
}));

// Mock styles
jest.mock('../WatchPartyCreateModal.styles', () => ({
  styles: {
    container: {},
    contentCard: {},
    contentInfo: {},
    contentLabel: {},
    contentTitle: {},
    optionsContainer: {},
    optionCard: {},
    optionCardHovered: {},
    optionText: {},
    checkbox: {},
    checkboxChecked: {},
    checkboxUnchecked: {},
    buttonRow: {},
    cancelButton: {},
    cancelButtonHovered: {},
    cancelButtonText: {},
    createButton: {},
    createButtonHovered: {},
    createButtonText: {},
    buttonDisabled: {},
  },
}));

const defaultProps = {
  isOpen: true,
  onClose: jest.fn(),
  onCreate: jest.fn().mockResolvedValue(undefined),
  contentTitle: 'Test Movie',
};

describe('WatchPartyCreateModal', () => {
  beforeEach(() => {
    defaultProps.onClose.mockClear();
    defaultProps.onCreate.mockClear().mockResolvedValue(undefined);
  });

  // MARK: - Rendering

  describe('rendering', () => {
    it('renders modal when isOpen is true', () => {
      render(<WatchPartyCreateModal {...defaultProps} />);
      expect(screen.getByTestId('glass-modal')).toBeInTheDocument();
    });

    it('does not render when isOpen is false', () => {
      render(<WatchPartyCreateModal {...defaultProps} isOpen={false} />);
      expect(screen.queryByTestId('glass-modal')).not.toBeInTheDocument();
    });

    it('renders modal title', () => {
      render(<WatchPartyCreateModal {...defaultProps} />);
      expect(screen.getByTestId('modal-title')).toHaveTextContent('Create Watch Party');
    });

    it('renders content title when provided', () => {
      render(<WatchPartyCreateModal {...defaultProps} />);
      expect(screen.getByText('Test Movie')).toBeInTheDocument();
    });

    it('renders watching label with content title', () => {
      render(<WatchPartyCreateModal {...defaultProps} />);
      expect(screen.getByText('Watching')).toBeInTheDocument();
    });

    it('does not render content card when contentTitle is not provided', () => {
      render(<WatchPartyCreateModal {...defaultProps} contentTitle={undefined} />);
      expect(screen.queryByText('Watching')).not.toBeInTheDocument();
    });

    it('renders zap icon in content card', () => {
      render(<WatchPartyCreateModal {...defaultProps} />);
      expect(screen.getByTestId('icon-zap')).toBeInTheDocument();
    });
  });

  // MARK: - Options

  describe('options', () => {
    it('renders chat enabled option', () => {
      render(<WatchPartyCreateModal {...defaultProps} />);
      expect(screen.getByText('Enable chat')).toBeInTheDocument();
    });

    it('renders sync playback option', () => {
      render(<WatchPartyCreateModal {...defaultProps} />);
      expect(screen.getByText('Sync playback')).toBeInTheDocument();
    });

    it('renders message-square icon for chat option', () => {
      render(<WatchPartyCreateModal {...defaultProps} />);
      expect(screen.getByTestId('icon-message-square')).toBeInTheDocument();
    });

    it('renders refresh icon for sync option', () => {
      render(<WatchPartyCreateModal {...defaultProps} />);
      expect(screen.getByTestId('icon-refresh')).toBeInTheDocument();
    });

    it('shows check icon when option is enabled (default)', () => {
      render(<WatchPartyCreateModal {...defaultProps} />);
      const checks = screen.getAllByTestId('icon-check');
      expect(checks.length).toBe(2);
    });

    it('toggles chat option when clicked', () => {
      render(<WatchPartyCreateModal {...defaultProps} />);
      const chatCheckbox = screen.getByLabelText('Enable chat');

      fireEvent.click(chatCheckbox);

      const checks = screen.getAllByTestId('icon-check');
      expect(checks.length).toBe(1);
    });

    it('toggles sync playback option when clicked', () => {
      render(<WatchPartyCreateModal {...defaultProps} />);
      const syncCheckbox = screen.getByLabelText('Sync playback');

      fireEvent.click(syncCheckbox);

      const checks = screen.getAllByTestId('icon-check');
      expect(checks.length).toBe(1);
    });
  });

  // MARK: - Action Buttons

  describe('action buttons', () => {
    it('renders cancel button', () => {
      render(<WatchPartyCreateModal {...defaultProps} />);
      expect(screen.getByText('Cancel')).toBeInTheDocument();
    });

    it('renders create button', () => {
      render(<WatchPartyCreateModal {...defaultProps} />);
      expect(screen.getByText('Create')).toBeInTheDocument();
    });

    it('calls onClose when cancel is clicked', () => {
      render(<WatchPartyCreateModal {...defaultProps} />);
      fireEvent.click(screen.getByLabelText('Cancel'));

      expect(defaultProps.onClose).toHaveBeenCalledTimes(1);
    });

    it('calls onCreate with default options when create is clicked', async () => {
      render(<WatchPartyCreateModal {...defaultProps} />);
      fireEvent.click(screen.getByLabelText('Create'));

      await waitFor(() => {
        expect(defaultProps.onCreate).toHaveBeenCalledWith({
          chatEnabled: true,
          syncPlayback: true,
        });
      });
    });

    it('calls onCreate with toggled options', async () => {
      render(<WatchPartyCreateModal {...defaultProps} />);

      fireEvent.click(screen.getByLabelText('Enable chat'));
      fireEvent.click(screen.getByLabelText('Create'));

      await waitFor(() => {
        expect(defaultProps.onCreate).toHaveBeenCalledWith({
          chatEnabled: false,
          syncPlayback: true,
        });
      });
    });

    it('calls onClose after successful creation', async () => {
      render(<WatchPartyCreateModal {...defaultProps} />);
      fireEvent.click(screen.getByLabelText('Create'));

      await waitFor(() => {
        expect(defaultProps.onClose).toHaveBeenCalled();
      });
    });
  });

  // MARK: - Error Handling

  describe('error handling', () => {
    it('does not call onClose when creation fails', async () => {
      const failCreate = jest.fn().mockRejectedValue(new Error('Network error'));
      render(<WatchPartyCreateModal {...defaultProps} onCreate={failCreate} />);

      fireEvent.click(screen.getByLabelText('Create'));

      await waitFor(() => {
        expect(failCreate).toHaveBeenCalled();
      });

      expect(defaultProps.onClose).not.toHaveBeenCalled();
    });
  });

  // MARK: - Accessibility

  describe('accessibility', () => {
    it('sets checkbox role on chat option', () => {
      render(<WatchPartyCreateModal {...defaultProps} />);
      const chatCheckbox = screen.getByLabelText('Enable chat');
      expect(chatCheckbox).toHaveAttribute('role', 'checkbox');
    });

    it('sets checkbox role on sync option', () => {
      render(<WatchPartyCreateModal {...defaultProps} />);
      const syncCheckbox = screen.getByLabelText('Sync playback');
      expect(syncCheckbox).toHaveAttribute('role', 'checkbox');
    });

    it('cancel button has correct accessibility label', () => {
      render(<WatchPartyCreateModal {...defaultProps} />);
      expect(screen.getByLabelText('Cancel')).toHaveAttribute('aria-label', 'Cancel');
    });

    it('create button has correct accessibility label', () => {
      render(<WatchPartyCreateModal {...defaultProps} />);
      expect(screen.getByLabelText('Create')).toHaveAttribute('aria-label', 'Create');
    });
  });
});
