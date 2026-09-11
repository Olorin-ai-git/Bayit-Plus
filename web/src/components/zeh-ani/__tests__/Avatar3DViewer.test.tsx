import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { Avatar3DViewer } from '../Avatar3DViewer';
import { useGLTF, OrbitControls } from '@react-three/drei';
import { Canvas } from '@react-three/fiber';

// JSDOM cannot create a WebGL context. Keep React/Suspense/error boundaries real;
// inspect the renderer contract and control loader resolution at its I/O boundary.
jest.mock('@react-three/fiber', () => ({
  Canvas: jest.fn(({ children }) => <div data-testid="renderer">{children}</div>),
}));
jest.mock('@react-three/drei', () => ({
  useGLTF: Object.assign(jest.fn(), { clear: jest.fn() }),
  OrbitControls: jest.fn(() => null),
}));
jest.mock('react-i18next', () => ({ useTranslation: () => ({ t: (key: string) => key }) }));

const glbUrl = 'https://example.com/avatar.glb';
const loadedModel = { scene: {} };
beforeEach(() => { jest.clearAllMocks(); (useGLTF as unknown as jest.Mock).mockReturnValue(loadedModel); });

describe('Avatar3DViewer', () => {
  it('renders loading state while the loader is suspended', () => {
    (useGLTF as unknown as jest.Mock).mockImplementation(() => { throw new Promise(() => {}); });
    render(<Avatar3DViewer avatarId="avatar" glbUrl={glbUrl} />);
    expect(screen.getByText('zehAni.viewer.loading')).toBeInTheDocument();
  });

  it('displays the model and removes loading after resolution', async () => {
    render(<Avatar3DViewer avatarId="avatar" glbUrl={glbUrl} />);
    await waitFor(() => expect(screen.queryByText('zehAni.viewer.loading')).not.toBeInTheDocument());
    expect(useGLTF).toHaveBeenCalledWith(glbUrl);
    expect(screen.getByTestId('renderer').querySelector('primitive')).toBeInTheDocument();
  });

  it('catches a thrown load error and clears rejected cache before retry', async () => {
    (useGLTF as unknown as jest.Mock).mockImplementation(() => { throw new Error('asset unavailable'); });
    const report = jest.spyOn(console, 'error').mockImplementation(() => {});
    render(<Avatar3DViewer avatarId="avatar" glbUrl={glbUrl} />);
    expect(screen.getByRole('alert')).toHaveTextContent('zehAni.viewer.errors.loadFailed');
    (useGLTF as unknown as jest.Mock).mockReturnValue(loadedModel);
    fireEvent.click(screen.getByRole('button', { name: 'common.retry' }));
    expect(useGLTF.clear).toHaveBeenCalledWith(glbUrl);
    await waitFor(() => expect(screen.queryByRole('alert')).not.toBeInTheDocument());
    report.mockRestore();
  });

  it('passes bounded camera controls to the actual renderer interface', () => {
    render(<Avatar3DViewer avatarId="avatar" glbUrl={glbUrl} />);
    const props = (OrbitControls as unknown as jest.Mock).mock.calls[0][0];
    expect(props.enablePan).toBe(false);
    expect(props.minDistance).toBeGreaterThan(0);
    expect(props.maxDistance).toBeGreaterThan(props.minDistance);
    expect(props.maxPolarAngle).toBeLessThan(Math.PI);
  });

  it('supplies a responsive canvas size and usable camera', () => {
    render(<Avatar3DViewer avatarId="avatar" glbUrl={glbUrl} />);
    const props = (Canvas as unknown as jest.Mock).mock.calls[0][0];
    expect(props.className).toBe('w-full h-full');
    expect(props.style.minHeight).toBeGreaterThan(0);
    expect(props.camera.position).toHaveLength(3);
    expect(props.camera.fov).toBeGreaterThan(0);
  });

  it('resets loaded state when the model identity changes', () => {
    const { rerender } = render(<Avatar3DViewer avatarId="avatar" glbUrl={glbUrl} />);
    expect(screen.queryByText('zehAni.viewer.loading')).not.toBeInTheDocument();
    (useGLTF as unknown as jest.Mock).mockImplementation(() => { throw new Promise(() => {}); });
    rerender(<Avatar3DViewer avatarId="next" glbUrl={`${glbUrl}?next`} />);
    expect(screen.getByText('zehAni.viewer.loading')).toBeInTheDocument();
  });
});
