/**
 * AudioPlayer Component Tests
 *
 * Validates:
 * - Component renders without errors
 * - Accessibility compliance (WCAG 2.1 Level AA)
 * - Glass UI integration
 * - Audio controls functionality
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import { AudioPlayer } from '../AudioPlayer';

// Mock Web Audio API
beforeEach(() => {
  global.AudioContext = vi.fn().mockImplementation(() => ({
    createMediaElementSource: vi.fn().mockReturnValue({
      connect: vi.fn(),
    }),
    createGain: vi.fn().mockReturnValue({
      connect: vi.fn(),
      gain: { value: 1 },
    }),
    createAnalyser: vi.fn().mockReturnValue({
      connect: vi.fn(),
      fftSize: 2048,
      frequencyBinCount: 1024,
      getByteTimeDomainData: vi.fn(),
    }),
    destination: {},
  })) as any;
});

describe('AudioPlayer Component', () => {
  const mockProps = {
    src: 'https://example.com/test-audio.mp3',
    title: 'Test Audio File',
  };

  it('renders without crashing', () => {
    const { container } = render(<AudioPlayer {...mockProps} />);
    expect(container).toBeTruthy();
  });

  it('displays audio title', () => {
    render(<AudioPlayer {...mockProps} />);
    expect(screen.getByText('Test Audio File')).toBeInTheDocument();
  });

  it('uses Glass UI components', () => {
    const { container } = render(<AudioPlayer {...mockProps} />);

    // Check for glassmorphic styling
    const glassCard = container.querySelector('.bg-white\\/5');
    expect(glassCard).toBeTruthy();

    const backdropBlur = container.querySelector('.backdrop-blur-xl');
    expect(backdropBlur).toBeTruthy();
  });

  it('has accessible audio controls', () => {
    render(<AudioPlayer {...mockProps} />);

    // Check for control buttons with accessible labels
    const playButton = screen.getByRole('button', { name: /play|pause/i });
    expect(playButton).toBeInTheDocument();

    // Volume control should be accessible
    const volumeControl = screen.getByLabelText(/volume/i);
    expect(volumeControl).toBeInTheDocument();
  });

  it('canvas waveform is decorative (aria-hidden)', () => {
    const { container } = render(<AudioPlayer {...mockProps} />);

    const canvas = container.querySelector('canvas');
    expect(canvas).toBeTruthy();
    expect(canvas?.getAttribute('aria-hidden')).toBe('true');
  });

  it('progress bar has proper ARIA attributes', () => {
    render(<AudioPlayer {...mockProps} />);

    const progressBar = screen.getByRole('slider', { name: /audio progress/i });
    expect(progressBar).toBeInTheDocument();
    expect(progressBar).toHaveAttribute('aria-valuemin', '0');
    expect(progressBar).toHaveAttribute('aria-valuemax', '180');
  });

  it('displays formatted duration', () => {
    render(<AudioPlayer {...mockProps} />);

    // 180 seconds = 3:00
    expect(screen.getByText('3:00')).toBeInTheDocument();
  });

  it('touch targets meet iOS HIG minimum (44x44pt)', () => {
    const { container } = render(<AudioPlayer {...mockProps} />);

    const buttons = container.querySelectorAll('button');
    buttons.forEach((button) => {
      const styles = window.getComputedStyle(button);
      const minHeight = parseInt(styles.minHeight);
      expect(minHeight).toBeGreaterThanOrEqual(44);
    });
  });
});
