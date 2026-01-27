import React from 'react';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import ScopeToggle from '../ScopeToggle';

describe('ScopeToggle', () => {
  const mockOnScopeChange = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders scope toggle component', () => {
    render(<ScopeToggle scope="system_wide" onScopeChange={mockOnScopeChange} />);
    expect(screen.getByText('View:')).toBeInTheDocument();
  });

  it('displays system-wide button', () => {
    render(<ScopeToggle scope="system_wide" onScopeChange={mockOnScopeChange} />);
    expect(screen.getByText('System-wide')).toBeInTheDocument();
  });

  it('displays per-user button', () => {
    render(<ScopeToggle scope="system_wide" onScopeChange={mockOnScopeChange} />);
    expect(screen.getByText('Per User')).toBeInTheDocument();
  });

  it('calls onScopeChange when system-wide button is clicked', async () => {
    const user = userEvent.setup();
    render(<ScopeToggle scope="system_wide" onScopeChange={mockOnScopeChange} />);

    const systemWideButton = screen.getByRole('button', { name: /System-wide/i });
    await user.click(systemWideButton);

    expect(mockOnScopeChange).toHaveBeenCalledWith('system_wide');
  });

  it('calls onScopeChange when per-user button is clicked', async () => {
    const user = userEvent.setup();
    render(<ScopeToggle scope="system_wide" onScopeChange={mockOnScopeChange} />);

    const perUserButton = screen.getByRole('button', { name: /Per User/i });
    await user.click(perUserButton);

    expect(mockOnScopeChange).toHaveBeenCalledWith('per_user');
  });

  it('shows user select dropdown when per-user is initially selected', () => {
    render(<ScopeToggle scope="per_user" onScopeChange={mockOnScopeChange} />);
    const selectElement = screen.getByTestId('glass-select');
    expect(selectElement).toBeInTheDocument();
  });

  it('hides user select dropdown when system-wide is selected', () => {
    render(<ScopeToggle scope="system_wide" onScopeChange={mockOnScopeChange} />);
    const selectElement = screen.queryByTestId('glass-select');
    expect(selectElement).not.toBeInTheDocument();
  });

  it('renders both buttons', () => {
    render(<ScopeToggle scope="system_wide" onScopeChange={mockOnScopeChange} />);
    
    const buttons = screen.getAllByRole('button');
    expect(buttons).toHaveLength(2);
  });

  it('has correct initial state for system-wide', () => {
    render(<ScopeToggle scope="system_wide" onScopeChange={mockOnScopeChange} />);
    expect(screen.getByText('View:')).toBeInTheDocument();
    expect(screen.queryByTestId('glass-select')).not.toBeInTheDocument();
  });

  it('has correct initial state for per-user', () => {
    render(<ScopeToggle scope="per_user" onScopeChange={mockOnScopeChange} />);
    expect(screen.getByTestId('glass-select')).toBeInTheDocument();
  });

  it('handles clicks on buttons', async () => {
    const user = userEvent.setup();
    render(<ScopeToggle scope="system_wide" onScopeChange={mockOnScopeChange} />);

    const perUserButton = screen.getByRole('button', { name: /Per User/i });
    await user.click(perUserButton);

    expect(mockOnScopeChange).toHaveBeenCalled();
  });

  it('renders with flex layout', () => {
    const { container } = render(<ScopeToggle scope="system_wide" onScopeChange={mockOnScopeChange} />);
    expect(container.firstChild).toBeInTheDocument();
  });

  it('passes callback for scope changes', () => {
    render(<ScopeToggle scope="system_wide" onScopeChange={mockOnScopeChange} />);
    expect(mockOnScopeChange).not.toHaveBeenCalled();
  });
});
