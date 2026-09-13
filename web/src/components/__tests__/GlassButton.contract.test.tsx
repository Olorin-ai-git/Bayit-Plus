import React from 'react';
import { fireEvent, render, screen } from '@testing-library/react';
import { GlassButton } from '@bayit/shared/ui/GlassButton';

test('renders the children declared by its public button contract', () => {
  render(<GlassButton accessibilityLabel="Action"><span>Visible caption</span></GlassButton>);
  expect(screen.getByRole('button', { name: 'Action' })).toHaveTextContent('Visible caption');
});

test('forwards switch role and checked state to assistive technology', () => {
  render(<GlassButton accessibilityLabel="Mode" accessibilityRole="switch" accessibilityState={{ checked: true }} />);
  expect(screen.getByRole('switch', { name: 'Mode' })).toHaveAttribute('aria-checked', 'true');
});

test('reports caller selection while keeping disabled state authoritative', () => {
  render(<GlassButton title="Selected" disabled accessibilityState={{ selected: true, disabled: false }} />);
  expect(screen.getByRole('button', { name: 'Selected' })).toHaveAttribute('aria-selected', 'true');
  expect(screen.getByRole('button', { name: 'Selected' })).toHaveAttribute('aria-disabled', 'true');
});

test('composes caller focus callbacks with its focus styling', () => {
  const onFocus = jest.fn();
  const onBlur = jest.fn();
  render(<GlassButton title="Focus" variant="ghost" onFocus={onFocus} onBlur={onBlur} />);
  fireEvent.focus(screen.getByRole('button', { name: 'Focus' }));
  fireEvent.blur(screen.getByRole('button', { name: 'Focus' }));
  expect(onFocus).toHaveBeenCalledTimes(1);
  expect(onBlur).toHaveBeenCalledTimes(1);
});

for (const variant of ['primary', 'ghost'] as const) {
  test(`${variant} buttons preserve test identity, text children and press behavior`, () => {
    const onPress = jest.fn();
    render(<GlassButton variant={variant} testID="contract-button" onPress={onPress}>Text caption</GlassButton>);
    const button = screen.getByTestId('contract-button');
    expect(button).toHaveTextContent('Text caption');
    fireEvent.click(button);
    expect(onPress).toHaveBeenCalledTimes(1);
  });
}
