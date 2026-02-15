import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { BiometricConsentDialog } from '../BiometricConsentDialog';
import api from '@/services/api';

jest.mock('@/services/api');
jest.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key: string) => key,
  }),
}));

describe('BiometricConsentDialog', () => {
  const mockOnConsent = jest.fn();
  const mockOnCancel = jest.fn();
  const mockProfileId = 'profile-123';

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders consent dialog with all consent types', () => {
    render(
      <BiometricConsentDialog
        open={true}
        profileId={mockProfileId}
        consentType="mesh_generation"
        onConsent={mockOnConsent}
        onCancel={mockOnCancel}
      />
    );

    expect(screen.getByText(/biometric consent/i)).toBeInTheDocument();
    expect(screen.getByText(/mesh generation/i)).toBeInTheDocument();
  });

  it('requires PIN input before granting consent', async () => {
    render(
      <BiometricConsentDialog
        open={true}
        profileId={mockProfileId}
        consentType="voice_v2v"
        onConsent={mockOnConsent}
        onCancel={mockOnCancel}
      />
    );

    const submitButton = screen.getByRole('button', { name: /grant consent/i });
    expect(submitButton).toBeDisabled();

    const pinInput = screen.getByLabelText(/pin/i);
    await userEvent.type(pinInput, '123456');

    expect(submitButton).toBeEnabled();
  });

  it('validates PIN length', async () => {
    render(
      <BiometricConsentDialog
        open={true}
        profileId={mockProfileId}
        consentType="latent_features"
        onConsent={mockOnConsent}
        onCancel={mockOnCancel}
      />
    );

    const pinInput = screen.getByLabelText(/pin/i);
    await userEvent.type(pinInput, '12345'); // Only 5 digits

    const submitButton = screen.getByRole('button', { name: /grant consent/i });
    expect(submitButton).toBeDisabled();
  });

  it('calls onConsent with correct data on submit', async () => {
    (api.post as jest.Mock).mockResolvedValue({ success: true });

    render(
      <BiometricConsentDialog
        open={true}
        profileId={mockProfileId}
        consentType="mesh_generation"
        onConsent={mockOnConsent}
        onCancel={mockOnCancel}
      />
    );

    const pinInput = screen.getByLabelText(/pin/i);
    await userEvent.type(pinInput, '123456');

    const submitButton = screen.getByRole('button', { name: /grant consent/i });
    fireEvent.click(submitButton);

    await waitFor(() => {
      expect(api.post).toHaveBeenCalledWith('/zeh-ani/consent/biometric', {
        profile_id: mockProfileId,
        consent_type: 'mesh_generation',
        pin: '123456'
      });
      expect(mockOnConsent).toHaveBeenCalled();
    });
  });

  it('displays error on invalid PIN', async () => {
    (api.post as jest.Mock).mockRejectedValue(new Error('Invalid PIN'));

    render(
      <BiometricConsentDialog
        open={true}
        profileId={mockProfileId}
        consentType="voice_v2v"
        onConsent={mockOnConsent}
        onCancel={mockOnCancel}
      />
    );

    const pinInput = screen.getByLabelText(/pin/i);
    await userEvent.type(pinInput, '000000');

    const submitButton = screen.getByRole('button', { name: /grant consent/i });
    fireEvent.click(submitButton);

    await waitFor(() => {
      expect(screen.getByText(/invalid pin/i)).toBeInTheDocument();
    });
  });

  it('calls onCancel when cancel button clicked', () => {
    render(
      <BiometricConsentDialog
        open={true}
        profileId={mockProfileId}
        consentType="mesh_generation"
        onConsent={mockOnConsent}
        onCancel={mockOnCancel}
      />
    );

    const cancelButton = screen.getByRole('button', { name: /cancel/i });
    fireEvent.click(cancelButton);

    expect(mockOnCancel).toHaveBeenCalled();
  });
});
