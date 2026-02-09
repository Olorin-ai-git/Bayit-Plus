/**
 * Test suite for WatchPartyParticipants component
 * Tests participant list rendering, host indicator, audio status, and edge cases.
 */

import { render, screen } from '@testing-library/react';
import WatchPartyParticipants from '../WatchPartyParticipants';

// Mock react-native
jest.mock('react-native', () => ({
  View: ({ children, style, ...props }: any) => <div style={style} {...props}>{children}</div>,
  Text: ({ children, style, numberOfLines, ...props }: any) => (
    <span style={style} {...props}>{children}</span>
  ),
  StyleSheet: {
    create: (styles: any) => styles,
    flatten: (s: any) => s,
  },
}));

// Mock design tokens
jest.mock('@olorin/design-tokens', () => ({
  colors: {
    text: '#FFFFFF',
    textMuted: '#999999',
  },
}));

// Mock i18n
jest.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key: string) => {
      const translations: Record<string, string> = {
        'watchParty.participants': 'Participants',
        'watchParty.you': 'You',
        'watchParty.host': 'Host',
      };
      return translations[key] || key;
    },
    i18n: { language: 'en' },
  }),
}));

// Mock platform util
jest.mock('@bayit/shared/utils/platform', () => ({
  isTV: false,
}));

// Mock lucide-react icons
jest.mock('lucide-react', () => ({
  Crown: ({ size, color }: any) => <span data-testid="icon-crown" data-color={color}>Crown</span>,
  Mic: ({ size, color }: any) => <span data-testid="icon-mic" data-color={color}>Mic</span>,
  MicOff: ({ size, color }: any) => <span data-testid="icon-mic-off" data-color={color}>MicOff</span>,
  User: ({ size, color }: any) => <span data-testid="icon-user" data-color={color}>User</span>,
}));

// Mock styles
jest.mock('../WatchPartyParticipants.styles', () => ({
  styles: {
    container: {},
    header: {},
    list: {},
    participantCard: {},
    participantSpeaking: {},
    participantNormal: {},
    avatar: {},
    avatarHost: {},
    avatarNormal: {},
    infoContainer: {},
    nameRow: {},
    userName: {},
    youLabel: {},
    hostLabel: {},
    micContainer: {},
  },
}));

const hostId = 'user-host';
const currentUserId = 'user-1';

const sampleParticipants = [
  { user_id: 'user-host', user_name: 'Host Alice', is_muted: false, is_speaking: false },
  { user_id: 'user-1', user_name: 'Bob', is_muted: false, is_speaking: false },
  { user_id: 'user-2', user_name: 'Charlie', is_muted: true, is_speaking: false },
  { user_id: 'user-3', user_name: 'Diana', is_muted: false, is_speaking: true },
];

describe('WatchPartyParticipants', () => {
  // MARK: - Basic Rendering

  describe('basic rendering', () => {
    it('renders header with participant count', () => {
      render(
        <WatchPartyParticipants
          participants={sampleParticipants}
          hostId={hostId}
          currentUserId={currentUserId}
        />
      );
      expect(screen.getByText(/Participants/)).toBeInTheDocument();
      expect(screen.getByText(/\(4\)/)).toBeInTheDocument();
    });

    it('renders all participant names', () => {
      render(
        <WatchPartyParticipants
          participants={sampleParticipants}
          hostId={hostId}
          currentUserId={currentUserId}
        />
      );
      expect(screen.getByText('Host Alice')).toBeInTheDocument();
      expect(screen.getByText('Bob')).toBeInTheDocument();
      expect(screen.getByText('Charlie')).toBeInTheDocument();
      expect(screen.getByText('Diana')).toBeInTheDocument();
    });
  });

  // MARK: - Empty State

  describe('empty state', () => {
    it('returns null when participants list is empty', () => {
      const { container } = render(
        <WatchPartyParticipants
          participants={[]}
          hostId={hostId}
          currentUserId={currentUserId}
        />
      );
      expect(container.firstChild).toBeNull();
    });

    it('returns null when participants is undefined', () => {
      const { container } = render(
        <WatchPartyParticipants
          participants={undefined as any}
          hostId={hostId}
          currentUserId={currentUserId}
        />
      );
      expect(container.firstChild).toBeNull();
    });
  });

  // MARK: - Host Indicator

  describe('host indicator', () => {
    it('renders crown icon for the host', () => {
      render(
        <WatchPartyParticipants
          participants={sampleParticipants}
          hostId={hostId}
          currentUserId={currentUserId}
        />
      );
      expect(screen.getByTestId('icon-crown')).toBeInTheDocument();
    });

    it('renders Host label for the host participant', () => {
      render(
        <WatchPartyParticipants
          participants={sampleParticipants}
          hostId={hostId}
          currentUserId={currentUserId}
        />
      );
      expect(screen.getByText('Host')).toBeInTheDocument();
    });

    it('renders user icon for non-host participants', () => {
      render(
        <WatchPartyParticipants
          participants={sampleParticipants}
          hostId={hostId}
          currentUserId={currentUserId}
        />
      );
      const userIcons = screen.getAllByTestId('icon-user');
      expect(userIcons.length).toBe(3);
    });
  });

  // MARK: - Current User Indicator

  describe('current user indicator', () => {
    it('shows (You) label for the current user', () => {
      render(
        <WatchPartyParticipants
          participants={sampleParticipants}
          hostId={hostId}
          currentUserId={currentUserId}
        />
      );
      expect(screen.getByText('(You)')).toBeInTheDocument();
    });

    it('does not show (You) for other users', () => {
      render(
        <WatchPartyParticipants
          participants={sampleParticipants}
          hostId={hostId}
          currentUserId={currentUserId}
        />
      );
      const youLabels = screen.getAllByText('(You)');
      expect(youLabels.length).toBe(1);
    });

    it('shows (You) on host when current user is host', () => {
      render(
        <WatchPartyParticipants
          participants={sampleParticipants}
          hostId={hostId}
          currentUserId={hostId}
        />
      );
      expect(screen.getByText('(You)')).toBeInTheDocument();
      expect(screen.getByText('Host')).toBeInTheDocument();
    });
  });

  // MARK: - Audio Status

  describe('audio status', () => {
    it('renders mic icon for unmuted participants', () => {
      const unmutedParticipants = [
        { user_id: 'user-1', user_name: 'Bob', is_muted: false, is_speaking: false },
      ];
      render(
        <WatchPartyParticipants
          participants={unmutedParticipants}
          hostId={hostId}
          currentUserId={currentUserId}
        />
      );
      expect(screen.getByTestId('icon-mic')).toBeInTheDocument();
    });

    it('renders mic-off icon for muted participants', () => {
      const mutedParticipants = [
        { user_id: 'user-2', user_name: 'Charlie', is_muted: true, is_speaking: false },
      ];
      render(
        <WatchPartyParticipants
          participants={mutedParticipants}
          hostId={hostId}
          currentUserId={currentUserId}
        />
      );
      expect(screen.getByTestId('icon-mic-off')).toBeInTheDocument();
    });

    it('renders green mic for speaking participants', () => {
      const speakingParticipants = [
        { user_id: 'user-3', user_name: 'Diana', is_muted: false, is_speaking: true },
      ];
      render(
        <WatchPartyParticipants
          participants={speakingParticipants}
          hostId={hostId}
          currentUserId={currentUserId}
        />
      );
      const mic = screen.getByTestId('icon-mic');
      expect(mic).toHaveAttribute('data-color', '#34D399');
    });

    it('renders muted-color mic for non-speaking participants', () => {
      const silentParticipants = [
        { user_id: 'user-1', user_name: 'Bob', is_muted: false, is_speaking: false },
      ];
      render(
        <WatchPartyParticipants
          participants={silentParticipants}
          hostId={hostId}
          currentUserId={currentUserId}
        />
      );
      const mic = screen.getByTestId('icon-mic');
      expect(mic).toHaveAttribute('data-color', '#999999');
    });

    it('renders red mic-off for muted participants', () => {
      const mutedParticipants = [
        { user_id: 'user-2', user_name: 'Charlie', is_muted: true, is_speaking: false },
      ];
      render(
        <WatchPartyParticipants
          participants={mutedParticipants}
          hostId={hostId}
          currentUserId={currentUserId}
        />
      );
      const micOff = screen.getByTestId('icon-mic-off');
      expect(micOff).toHaveAttribute('data-color', '#F87171');
    });
  });

  // MARK: - Sorting

  describe('sorting', () => {
    it('sorts host to the top of the list', () => {
      const unsortedParticipants = [
        { user_id: 'user-1', user_name: 'Bob', is_muted: false, is_speaking: false },
        { user_id: 'user-host', user_name: 'Host Alice', is_muted: false, is_speaking: false },
        { user_id: 'user-2', user_name: 'Charlie', is_muted: false, is_speaking: false },
      ];
      render(
        <WatchPartyParticipants
          participants={unsortedParticipants}
          hostId={hostId}
          currentUserId={currentUserId}
        />
      );

      const list = screen.getByText('Host Alice').closest('div');
      const allNames = screen.getAllByText(/Host Alice|Bob|Charlie/);
      expect(allNames[0]).toHaveTextContent('Host Alice');
    });
  });

  // MARK: - Edge Cases

  describe('edge cases', () => {
    it('renders single participant', () => {
      const solo = [
        { user_id: 'user-host', user_name: 'Solo Host', is_muted: false, is_speaking: false },
      ];
      render(
        <WatchPartyParticipants
          participants={solo}
          hostId={hostId}
          currentUserId={currentUserId}
        />
      );
      expect(screen.getByText('Solo Host')).toBeInTheDocument();
      expect(screen.getByText(/\(1\)/)).toBeInTheDocument();
    });

    it('handles participants with undefined is_muted', () => {
      const noMuteInfo = [
        { user_id: 'user-1', user_name: 'Bob' },
      ];
      render(
        <WatchPartyParticipants
          participants={noMuteInfo}
          hostId={hostId}
          currentUserId={currentUserId}
        />
      );
      expect(screen.getByText('Bob')).toBeInTheDocument();
      expect(screen.getByTestId('icon-mic')).toBeInTheDocument();
    });

    it('handles participants with undefined is_speaking', () => {
      const noSpeakInfo = [
        { user_id: 'user-1', user_name: 'Bob', is_muted: false },
      ];
      render(
        <WatchPartyParticipants
          participants={noSpeakInfo}
          hostId={hostId}
          currentUserId={currentUserId}
        />
      );
      expect(screen.getByText('Bob')).toBeInTheDocument();
    });
  });
});
