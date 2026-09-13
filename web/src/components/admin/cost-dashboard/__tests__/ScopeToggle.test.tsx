import '@/__tests__/support/costDashboardI18n';
import React from 'react';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import ScopeToggle from '../ScopeToggle';

jest.mock('@/services/adminApi', () => ({ usersService: { getUsers: jest.fn().mockResolvedValue({ items: [] }) } }));

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

it('keeps the selected user visible and searches the supported users endpoint', async () => {
  const { usersService } = await import('@/services/adminApi');
  (usersService.getUsers as jest.Mock).mockResolvedValue({ items: [{ id: 'user-1', name: 'Selected User', email: 'one@example.com' }] });
  const onScopeChange = jest.fn();
  const { rerender } = render(<ScopeToggle scope="per_user" selectedUserId="user-1" onScopeChange={onScopeChange} />);
  expect(await screen.findByRole('option', { name: 'Selected User' })).toBeInTheDocument();
  expect(screen.getByTestId('glass-select')).toHaveValue('user-1');
  const user = userEvent.setup();
  await user.type(screen.getByRole('textbox', { name: 'Search' }), 'target@example.com');
  (usersService.getUsers as jest.Mock).mockResolvedValue({ items: [{ id: 'user-2', name: 'Found User', email: 'target@example.com' }] });
  await user.click(screen.getByRole('button', { name: 'Search' }));
  expect(await screen.findByRole('option', { name: 'Found User' })).toBeInTheDocument();
  expect(usersService.getUsers).toHaveBeenLastCalledWith({ search: 'target@example.com' });
  expect(screen.getByTestId('glass-select')).toHaveValue('user-1');
  await user.selectOptions(screen.getByTestId('glass-select'), 'user-2');
  expect(onScopeChange).toHaveBeenCalledWith('per_user', 'user-2');
  rerender(<ScopeToggle scope="per_user" selectedUserId="user-2" onScopeChange={onScopeChange} />);
  expect(screen.getByTestId('glass-select')).toHaveValue('user-2');
});
