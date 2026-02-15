import { render, screen, waitFor } from '@testing-library/react';
import { Avatar3DViewer } from '../Avatar3DViewer';

jest.mock('@/services/api');

describe('Avatar3DViewer', () => {
  const mockGlbUrl = 'https://example.com/avatar.glb';

  it('renders loading state initially', () => {
    render(<Avatar3DViewer glbUrl={mockGlbUrl} />);
    expect(screen.getByText(/loading/i)).toBeInTheDocument();
  });

  it('displays 3D viewer when loaded', async () => {
    render(<Avatar3DViewer glbUrl={mockGlbUrl} />);
    await waitFor(() => {
      const canvas = document.querySelector('canvas');
      expect(canvas).toBeInTheDocument();
    });
  });

  it('shows error message on load failure', async () => {
    const invalidUrl = 'invalid-url';
    render(<Avatar3DViewer glbUrl={invalidUrl} />);
    await waitFor(() => {
      expect(screen.getByText(/error loading avatar/i)).toBeInTheDocument();
    });
  });

  it('supports camera controls', async () => {
    render(<Avatar3DViewer glbUrl={mockGlbUrl} enableControls={true} />);
    await waitFor(() => {
      const canvas = document.querySelector('canvas');
      expect(canvas).toHaveAttribute('data-controls', 'true');
    });
  });

  it('renders with custom size', () => {
    render(<Avatar3DViewer glbUrl={mockGlbUrl} width={500} height={500} />);
    const container = screen.getByTestId('avatar-3d-container');
    expect(container).toHaveStyle({ width: '500px', height: '500px' });
  });
});
