import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import NavigationBar from '../../../src/js/components/NavigationBar';

describe('NavigationBar', () => {
  const onTabChange = jest.fn();

  afterEach(() => {
    onTabChange.mockClear();
  });

  it('renders all tab buttons', () => {
    render(
      <NavigationBar activeTab="investigation" onTabChange={onTabChange} />,
    );
    expect(screen.getByLabelText('Current Investigation')).toBeInTheDocument();
    expect(screen.getByLabelText('All Investigations')).toBeInTheDocument();
    expect(screen.getByLabelText('Settings')).toBeInTheDocument();
  });

  it('highlights the active tab', () => {
    const { rerender } = render(
      <NavigationBar activeTab="investigation" onTabChange={onTabChange} />,
    );
    const currentBtn = screen.getByLabelText('Current Investigation');
    const allBtn = screen.getByLabelText('All Investigations');
    const settingsBtn = screen.getByLabelText('Settings');

    expect(currentBtn).toHaveClass('bg-blue-100');
    expect(allBtn).not.toHaveClass('bg-blue-100');
    expect(settingsBtn).not.toHaveClass('bg-blue-100');

    rerender(
      <NavigationBar activeTab="investigations" onTabChange={onTabChange} />,
    );
    expect(allBtn).toHaveClass('bg-blue-100');
    expect(currentBtn).not.toHaveClass('bg-blue-100');
    expect(settingsBtn).not.toHaveClass('bg-blue-100');

    rerender(<NavigationBar activeTab="settings" onTabChange={onTabChange} />);
    expect(settingsBtn).toHaveClass('bg-blue-100');
    expect(currentBtn).not.toHaveClass('bg-blue-100');
    expect(allBtn).not.toHaveClass('bg-blue-100');
  });

  it('calls onTabChange when a tab is clicked', () => {
    render(
      <NavigationBar activeTab="investigation" onTabChange={onTabChange} />,
    );
    fireEvent.click(screen.getByLabelText('All Investigations'));
    expect(onTabChange).toHaveBeenCalledWith('investigations');
    fireEvent.click(screen.getByLabelText('Current Investigation'));
    expect(onTabChange).toHaveBeenCalledWith('investigation');
    fireEvent.click(screen.getByLabelText('Settings'));
    expect(onTabChange).toHaveBeenCalledWith('settings');
  });

  it.skip('has accessible labels and tooltips', () => {});

  it('does not crash if onTabChange is a no-op', () => {
    render(<NavigationBar activeTab="investigation" onTabChange={() => {}} />);
    fireEvent.click(screen.getByLabelText('All Investigations'));
    fireEvent.click(screen.getByLabelText('Current Investigation'));
    fireEvent.click(screen.getByLabelText('Settings'));
    // No error thrown
  });
});
