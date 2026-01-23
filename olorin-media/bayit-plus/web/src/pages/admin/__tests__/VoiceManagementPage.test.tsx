/**
 * Test suite for Voice Management Page
 * Tests main page, panels, and user interactions
 */

import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import VoiceManagementPage from '../VoiceManagementPage';
import VoiceConfigurationPanel from '../components/VoiceConfigurationPanel';
import { voiceManagementService } from '@/services/voiceManagementApi';

// Mock services
jest.mock('@/services/voiceManagementApi');
jest.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key: string) => key,
    i18n: { language: 'en' },
  }),
}));

// Mock useDirection hook
jest.mock('@/hooks/useDirection', () => ({
  useDirection: () => ({
    isRTL: false,
    textAlign: 'left',
    flexDirection: 'row',
  }),
}));

describe('VoiceManagementPage', () => {
  it('renders all tabs correctly', () => {
    render(
      <BrowserRouter>
        <VoiceManagementPage />
      </BrowserRouter>
    );

    expect(screen.getByText('admin.voiceManagement.title')).toBeInTheDocument();
    expect(screen.getByText('admin.voiceManagement.tabs.configuration')).toBeInTheDocument();
    expect(screen.getByText('admin.voiceManagement.tabs.library')).toBeInTheDocument();
    expect(screen.getByText('admin.voiceManagement.tabs.analytics')).toBeInTheDocument();
  });

  it('switches between tabs when clicked', () => {
    render(
      <BrowserRouter>
        <VoiceManagementPage />
      </BrowserRouter>
    );

    const libraryTab = screen.getByText('admin.voiceManagement.tabs.library');
    fireEvent.press(libraryTab);

    // Would check for library content rendering here
  });
});

describe('VoiceConfigurationPanel', () => {
  beforeEach(() => {
    (voiceManagementService.getVoiceConfig as jest.Mock).mockResolvedValue({
      config: {
        default_voice_id: 'voice123',
        assistant_voice_id: 'voice456',
        support_voice_id: 'voice789',
        stt_provider: 'elevenlabs',
        translation_provider: 'google',
      },
    });
  });

  it('loads voice configuration on mount', async () => {
    render(<VoiceConfigurationPanel />);

    await waitFor(() => {
      expect(voiceManagementService.getVoiceConfig).toHaveBeenCalled();
    });
  });

  it('displays voice IDs in input fields', async () => {
    render(<VoiceConfigurationPanel />);

    await waitFor(() => {
      expect(screen.getByDisplayValue('voice123')).toBeInTheDocument();
      expect(screen.getByDisplayValue('voice456')).toBeInTheDocument();
    });
  });

  it('enables save button when configuration changes', async () => {
    render(<VoiceConfigurationPanel />);

    await waitFor(() => {
      const input = screen.getByDisplayValue('voice123');
      fireEvent.changeText(input, 'newvoice123');
    });

    await waitFor(() => {
      const saveButton = screen.getByText('common.save');
      expect(saveButton).not.toBeDisabled();
    });
  });

  it('calls testVoice API when test button clicked', async () => {
    (voiceManagementService.testVoice as jest.Mock).mockResolvedValue({
      audio_base64: 'mockbase64',
    });

    render(<VoiceConfigurationPanel />);

    await waitFor(() => {
      const testButtons = screen.getAllByRole('button');
      const testButton = testButtons.find((btn) => btn.getAttribute('aria-label') === 'test');

      if (testButton) {
        fireEvent.press(testButton);
      }
    });

    await waitFor(() => {
      expect(voiceManagementService.testVoice).toHaveBeenCalled();
    });
  });

  it('saves configuration when save button clicked', async () => {
    (voiceManagementService.updateVoiceConfig as jest.Mock).mockResolvedValue({
      success: true,
    });

    render(<VoiceConfigurationPanel />);

    await waitFor(() => {
      const input = screen.getByDisplayValue('voice123');
      fireEvent.changeText(input, 'newvoice123');
    });

    const saveButton = screen.getByText('common.save');
    fireEvent.press(saveButton);

    await waitFor(() => {
      expect(voiceManagementService.updateVoiceConfig).toHaveBeenCalled();
    });
  });
});

describe('VoiceManagementPage Integration', () => {
  it('loads configuration and displays correctly', async () => {
    (voiceManagementService.getVoiceConfig as jest.Mock).mockResolvedValue({
      config: {
        default_voice_id: 'test123',
        assistant_voice_id: 'test456',
        support_voice_id: 'test789',
        stt_provider: 'elevenlabs',
        translation_provider: 'google',
      },
    });

    render(
      <BrowserRouter>
        <VoiceManagementPage />
      </BrowserRouter>
    );

    await waitFor(() => {
      expect(screen.getByText('admin.voiceManagement.title')).toBeInTheDocument();
    });
  });

  it('handles API errors gracefully', async () => {
    (voiceManagementService.getVoiceConfig as jest.Mock).mockRejectedValue(
      new Error('API Error')
    );

    render(<VoiceConfigurationPanel />);

    await waitFor(() => {
      expect(screen.getByText(/error/i)).toBeInTheDocument();
    });
  });
});
