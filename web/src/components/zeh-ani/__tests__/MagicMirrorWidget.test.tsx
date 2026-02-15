import { render, screen, waitFor } from '@testing-library/react';
import { MagicMirrorWidget } from '../MagicMirrorWidget';
import api from '@/services/api';

jest.mock('@/services/api');
jest.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key: string) => key,
  }),
}));

describe('MagicMirrorWidget', () => {
  const mockProfileId = 'profile_123';

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders loading state initially', () => {
    (api.get as jest.Mock).mockReturnValue(new Promise(() => {}));

    render(<MagicMirrorWidget profileId={mockProfileId} />);

    expect(screen.getByText(/common.retry/i)).toBeInTheDocument();
  });

  it('renders greeting when API call succeeds', async () => {
    const mockGreeting = {
      greeting_text_he: 'שלום עולם',
      greeting_text_en: 'Hello World',
      avatar_thumbnail_url: null,
      vocabulary_word_he: 'שמח',
      vocabulary_transliteration: 'sameach',
      vocabulary_translation: 'happy',
      vocabulary_category: 'emotions',
    };

    (api.get as jest.Mock).mockResolvedValue(mockGreeting);

    render(<MagicMirrorWidget profileId={mockProfileId} />);

    await waitFor(() => {
      expect(screen.getByText('שלום עולם')).toBeInTheDocument();
      expect(screen.getByText('Hello World')).toBeInTheDocument();
    });
  });

  it('renders error state when API call fails', async () => {
    const errorMessage = 'Failed to fetch greeting';
    (api.get as jest.Mock).mockRejectedValue({
      detail: errorMessage,
    });

    render(<MagicMirrorWidget profileId={mockProfileId} />);

    await waitFor(() => {
      expect(screen.getByText(errorMessage)).toBeInTheDocument();
    });
  });

  it('calls correct API endpoint', async () => {
    (api.get as jest.Mock).mockResolvedValue({
      greeting_text_he: 'Test',
      greeting_text_en: 'Test',
    });

    render(<MagicMirrorWidget profileId={mockProfileId} />);

    await waitFor(() => {
      expect(api.get).toHaveBeenCalledWith(
        `/zeh-ani/magic-mirror/${mockProfileId}`
      );
    });
  });

  it('retries on error when retry button clicked', async () => {
    (api.get as jest.Mock).mockRejectedValueOnce({
      detail: 'Error',
    });

    const { rerender } = render(<MagicMirrorWidget profileId={mockProfileId} />);

    await waitFor(() => {
      expect(screen.getByText(/common.retry/i)).toBeInTheDocument();
    });

    (api.get as jest.Mock).mockResolvedValueOnce({
      greeting_text_he: 'Retry Success',
      greeting_text_en: 'Retry Success',
    });

    const retryButton = screen.getByText(/common.retry/i);
    retryButton.click();

    await waitFor(() => {
      expect(api.get).toHaveBeenCalledTimes(2);
    });
  });
});
