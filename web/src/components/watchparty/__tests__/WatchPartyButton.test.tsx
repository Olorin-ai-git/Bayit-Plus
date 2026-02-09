/**
 * Test suite for WatchPartyButton component
 * Tests idle state, active state, host state, dropdown, and accessibility.
 */

import { render, screen, fireEvent } from '@testing-library/react';
import WatchPartyButton from '../WatchPartyButton';

// Mock design tokens
jest.mock('@olorin/design-tokens', () => ({
  colors: {
    text: '#FFFFFF',
    textSecondary: '#999999',
    primary: '#6C63FF',
  },
}));

// Mock i18n
jest.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key: string, fallback: string) => fallback || key,
    i18n: { language: 'en' },
  }),
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

// Mock lucide-react icons
jest.mock('lucide-react', () => ({
  Users: ({ size, color }: any) => <span data-testid="icon-users" data-size={size} data-color={color}>Users</span>,
  Plus: ({ size, color }: any) => <span data-testid="icon-plus" data-size={size} data-color={color}>Plus</span>,
  UserPlus: ({ size, color }: any) => <span data-testid="icon-user-plus" data-size={size} data-color={color}>UserPlus</span>,
  ChevronDown: ({ size, color }: any) => <span data-testid="icon-chevron" data-size={size} data-color={color}>ChevronDown</span>,
  Crown: ({ size, color }: any) => <span data-testid="icon-crown" data-size={size} data-color={color}>Crown</span>,
}));

// Mock styles
jest.mock('../WatchPartyButton.styles', () => ({
  styles: {
    container: {},
    button: {},
    buttonHovered: {},
    buttonText: {},
    activeButton: {},
    hostButton: {},
    activeButtonHovered: {},
    activeText: {},
    hostText: {},
    pulseContainer: {},
    pulseDot: {},
    hostPulseDot: {},
    pulseRing: {},
    hostPulseRing: {},
    dropdown: {},
    dropdownItem: {},
    dropdownItemHovered: {},
    dropdownText: {},
  },
}));

const defaultProps = {
  hasActiveParty: false,
  isHost: false,
  onCreateClick: jest.fn(),
  onJoinClick: jest.fn(),
  onPanelToggle: jest.fn(),
};

describe('WatchPartyButton', () => {
  beforeEach(() => {
    defaultProps.onCreateClick.mockClear();
    defaultProps.onJoinClick.mockClear();
    defaultProps.onPanelToggle.mockClear();
  });

  // MARK: - Idle State Rendering

  describe('idle state rendering', () => {
    it('renders the main button with Watch Party label', () => {
      render(<WatchPartyButton {...defaultProps} />);
      expect(screen.getByText('Watch Party')).toBeInTheDocument();
    });

    it('renders the users icon', () => {
      render(<WatchPartyButton {...defaultProps} />);
      expect(screen.getByTestId('icon-users')).toBeInTheDocument();
    });

    it('renders the chevron icon', () => {
      render(<WatchPartyButton {...defaultProps} />);
      expect(screen.getByTestId('icon-chevron')).toBeInTheDocument();
    });

    it('does not show dropdown initially', () => {
      render(<WatchPartyButton {...defaultProps} />);
      expect(screen.queryByText('Create')).not.toBeInTheDocument();
      expect(screen.queryByText('Join')).not.toBeInTheDocument();
    });
  });

  // MARK: - Dropdown Behavior

  describe('dropdown behavior', () => {
    it('shows dropdown when button is clicked', () => {
      render(<WatchPartyButton {...defaultProps} />);
      const mainButton = screen.getByLabelText('Watch Party');
      fireEvent.click(mainButton);

      expect(screen.getByText('Create')).toBeInTheDocument();
      expect(screen.getByText('Join')).toBeInTheDocument();
    });

    it('renders create option with plus icon', () => {
      render(<WatchPartyButton {...defaultProps} />);
      fireEvent.click(screen.getByLabelText('Watch Party'));

      expect(screen.getByTestId('icon-plus')).toBeInTheDocument();
      expect(screen.getByText('Create')).toBeInTheDocument();
    });

    it('renders join option with user-plus icon', () => {
      render(<WatchPartyButton {...defaultProps} />);
      fireEvent.click(screen.getByLabelText('Watch Party'));

      expect(screen.getByTestId('icon-user-plus')).toBeInTheDocument();
      expect(screen.getByText('Join')).toBeInTheDocument();
    });

    it('calls onCreateClick and closes dropdown when create is clicked', () => {
      render(<WatchPartyButton {...defaultProps} />);
      fireEvent.click(screen.getByLabelText('Watch Party'));
      fireEvent.click(screen.getByLabelText('Create Watch Party'));

      expect(defaultProps.onCreateClick).toHaveBeenCalledTimes(1);
      expect(screen.queryByText('Join')).not.toBeInTheDocument();
    });

    it('calls onJoinClick and closes dropdown when join is clicked', () => {
      render(<WatchPartyButton {...defaultProps} />);
      fireEvent.click(screen.getByLabelText('Watch Party'));
      fireEvent.click(screen.getByLabelText('Join Watch Party'));

      expect(defaultProps.onJoinClick).toHaveBeenCalledTimes(1);
      expect(screen.queryByText('Create')).not.toBeInTheDocument();
    });
  });

  // MARK: - Active Party State

  describe('active party state', () => {
    it('renders active label when party is active', () => {
      render(<WatchPartyButton {...defaultProps} hasActiveParty={true} />);
      expect(screen.getByText('Active')).toBeInTheDocument();
    });

    it('renders users icon for participant', () => {
      render(<WatchPartyButton {...defaultProps} hasActiveParty={true} />);
      expect(screen.getByTestId('icon-users')).toBeInTheDocument();
    });

    it('does not show dropdown in active state', () => {
      render(<WatchPartyButton {...defaultProps} hasActiveParty={true} />);
      expect(screen.queryByText('Create')).not.toBeInTheDocument();
      expect(screen.queryByText('Join')).not.toBeInTheDocument();
    });

    it('calls onPanelToggle when active button is pressed', () => {
      render(<WatchPartyButton {...defaultProps} hasActiveParty={true} />);
      const activeButton = screen.getByLabelText('Watch Party - Active');
      fireEvent.click(activeButton);

      expect(defaultProps.onPanelToggle).toHaveBeenCalledTimes(1);
    });
  });

  // MARK: - Host State

  describe('host state', () => {
    it('renders hosting label when user is host', () => {
      render(<WatchPartyButton {...defaultProps} hasActiveParty={true} isHost={true} />);
      expect(screen.getByText('Hosting')).toBeInTheDocument();
    });

    it('renders crown icon for host', () => {
      render(<WatchPartyButton {...defaultProps} hasActiveParty={true} isHost={true} />);
      expect(screen.getByTestId('icon-crown')).toBeInTheDocument();
    });

    it('calls onPanelToggle when host button is pressed', () => {
      render(<WatchPartyButton {...defaultProps} hasActiveParty={true} isHost={true} />);
      const hostButton = screen.getByLabelText('Watch Party - You are hosting');
      fireEvent.click(hostButton);

      expect(defaultProps.onPanelToggle).toHaveBeenCalledTimes(1);
    });
  });

  // MARK: - Accessibility

  describe('accessibility', () => {
    it('sets correct accessibility label in idle state', () => {
      render(<WatchPartyButton {...defaultProps} />);
      const button = screen.getByLabelText('Watch Party');
      expect(button).toHaveAttribute('aria-label', 'Watch Party');
    });

    it('has button role in idle state', () => {
      render(<WatchPartyButton {...defaultProps} />);
      const button = screen.getByLabelText('Watch Party');
      expect(button).toHaveAttribute('role', 'button');
    });

    it('sets correct accessibility label for active participant', () => {
      render(<WatchPartyButton {...defaultProps} hasActiveParty={true} />);
      expect(screen.getByLabelText('Watch Party - Active')).toBeInTheDocument();
    });

    it('sets correct accessibility label for host', () => {
      render(<WatchPartyButton {...defaultProps} hasActiveParty={true} isHost={true} />);
      expect(screen.getByLabelText('Watch Party - You are hosting')).toBeInTheDocument();
    });

    it('dropdown items have button role', () => {
      render(<WatchPartyButton {...defaultProps} />);
      fireEvent.click(screen.getByLabelText('Watch Party'));

      expect(screen.getByLabelText('Create Watch Party')).toHaveAttribute('role', 'button');
      expect(screen.getByLabelText('Join Watch Party')).toHaveAttribute('role', 'button');
    });
  });

  // MARK: - Edge Cases

  describe('edge cases', () => {
    it('defaults isHost to false', () => {
      const { onCreateClick, onJoinClick, onPanelToggle } = defaultProps;
      render(
        <WatchPartyButton
          hasActiveParty={true}
          onCreateClick={onCreateClick}
          onJoinClick={onJoinClick}
          onPanelToggle={onPanelToggle}
        />
      );
      expect(screen.getByText('Active')).toBeInTheDocument();
      expect(screen.queryByText('Hosting')).not.toBeInTheDocument();
    });
  });
});
