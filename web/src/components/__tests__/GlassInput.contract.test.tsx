import React from 'react';
import { fireEvent, render, screen } from '@testing-library/react';
import { GlassInput } from '@bayit/shared/ui/GlassInput';

test('fires each input focus callback once with its actual event', () => {
  const onFocus = jest.fn(); const onBlur = jest.fn();
  render(<GlassInput accessibilityLabel="Name" onFocus={onFocus} onBlur={onBlur} />);
  const input = screen.getByRole('textbox', { name: 'Name' });
  fireEvent.focus(input); fireEvent.blur(input);
  expect(onFocus).toHaveBeenCalledTimes(1);
  expect(onBlur).toHaveBeenCalledTimes(1);
  expect(onFocus.mock.calls[0][0]).toEqual(expect.objectContaining({ type: 'focus' }));
  expect(onBlur.mock.calls[0][0]).toEqual(expect.objectContaining({ type: 'blur' }));
});
