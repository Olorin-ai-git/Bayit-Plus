import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { V2VPracticePanel } from '../V2VPracticePanel';
import api from '@/services/api';

jest.mock('@/services/api');
jest.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key: string) => key,
  }),
}));

describe('V2VPracticePanel', () => {
  const mockProfileId = 'profile-123';
  const mockAvatarId = 'avatar-456';

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders practice panel with target phrase', () => {
    render(<V2VPracticePanel profileId={mockProfileId} avatarId={mockAvatarId} />);

    expect(screen.getByText(/target phrase/i)).toBeInTheDocument();
  });

  it('starts recording on button click', async () => {
    render(<V2VPracticePanel profileId={mockProfileId} avatarId={mockAvatarId} />);

    const recordButton = screen.getByRole('button', { name: /start recording/i });
    fireEvent.click(recordButton);

    await waitFor(() => {
      expect(screen.getByText(/recording/i)).toBeInTheDocument();
    });
  });

  it('stops recording and processes audio', async () => {
    (api.post as jest.Mock).mockResolvedValue({
      transformed_audio_url: 'https://example.com/transformed.wav',
      score: 0.85,
      feedback: 'Great job!'
    });

    render(<V2VPracticePanel profileId={mockProfileId} avatarId={mockAvatarId} />);

    const recordButton = screen.getByRole('button', { name: /start recording/i });
    fireEvent.click(recordButton);

    await waitFor(() => {
      const stopButton = screen.getByRole('button', { name: /stop recording/i });
      fireEvent.click(stopButton);
    });

    await waitFor(() => {
      expect(screen.getByText(/score: 0.85/i)).toBeInTheDocument();
      expect(screen.getByText(/great job/i)).toBeInTheDocument();
    });
  });

  it('displays error on recording failure', async () => {
    (api.post as jest.Mock).mockRejectedValue(new Error('Recording failed'));

    render(<V2VPracticePanel profileId={mockProfileId} avatarId={mockAvatarId} />);

    const recordButton = screen.getByRole('button', { name: /start recording/i });
    fireEvent.click(recordButton);

    await waitFor(() => {
      expect(screen.getByText(/error/i)).toBeInTheDocument();
    });
  });

  it('shows practice history', async () => {
    const mockHistory = [
      { session_id: 's1', target_phrase: 'שלום', score: 0.90, created_at: '2026-02-15T10:00:00Z' },
      { session_id: 's2', target_phrase: 'תודה', score: 0.75, created_at: '2026-02-15T11:00:00Z' }
    ];

    (api.get as jest.Mock).mockResolvedValue(mockHistory);

    render(<V2VPracticePanel profileId={mockProfileId} avatarId={mockAvatarId} showHistory={true} />);

    await waitFor(() => {
      expect(screen.getByText('שלום')).toBeInTheDocument();
      expect(screen.getByText(/0.90/)).toBeInTheDocument();
    });
  });
});
