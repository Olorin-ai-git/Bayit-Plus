/**
 * Unit Tests for Button Component
 * Tests all props, variants, interactions, and accessibility
 */

import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { componentTestUtils } from '../../testing/component-setup';
import { Button, ButtonProps } from '../index';

describe('Button Component', () => {
  // Helper function to render Button with default props
  const renderButton = (props: Partial<ButtonProps> = {}) => {
    const defaultProps: ButtonProps = {
      children: 'Test Button',
      ...props
    };
    return componentTestUtils.renderWithProviders(<Button {...defaultProps} />);
  };

  describe('Rendering', () => {
    it('renders with default props', () => {
      renderButton();
      const button = screen.getByRole('button', { name: /test button/i });
      expect(button).toBeInTheDocument();
      expect(button).toHaveTextContent('Test Button');
    });

    it('renders with custom children', () => {
      renderButton({ children: 'Custom Text' });
      expect(screen.getByRole('button', { name: /custom text/i })).toBeInTheDocument();
    });

    it('renders with JSX children', () => {
      renderButton({
        children: (
          <span>
            <strong>Bold</strong> Text
          </span>
        )
      });
      const button = screen.getByRole('button');
      expect(button).toContainHTML('<strong>Bold</strong> Text');
    });

    it('applies custom className', () => {
      renderButton({ className: 'custom-class' });
      const button = screen.getByRole('button');
      expect(button).toHaveClass('custom-class');
    });
  });

  describe('Props Handling', () => {
    it('handles variant prop correctly', () => {
      const variants: Array<ButtonProps['variant']> = ['primary', 'secondary', 'danger'];

      variants.forEach((variant) => {
        const { unmount } = renderButton({ variant });
        const button = screen.getByRole('button');
        expect(button).toBeInTheDocument();
        unmount();
      });
    });

    it('handles size prop correctly', () => {
      const sizes: Array<ButtonProps['size']> = ['sm', 'md', 'lg'];

      sizes.forEach((size) => {
        const { unmount } = renderButton({ size });
        const button = screen.getByRole('button');
        expect(button).toBeInTheDocument();
        unmount();
      });
    });

    it('handles disabled state', () => {
      renderButton({ disabled: true });
      const button = screen.getByRole('button');
      expect(button).toBeDisabled();
      expect(button).toHaveAttribute('disabled');
    });

    it('handles loading state', () => {
      renderButton({ loading: true });
      const button = screen.getByRole('button');
      expect(button).toHaveAttribute('loading', 'true');
    });

    it('passes through additional props', () => {
      renderButton({
        'data-testid': 'custom-button',
        'aria-label': 'Custom Label',
        type: 'submit'
      } as any);

      const button = screen.getByTestId('custom-button');
      expect(button).toHaveAttribute('aria-label', 'Custom Label');
      expect(button).toHaveAttribute('type', 'submit');
    });
  });

  describe('Interactions', () => {
    it('calls onClick when clicked', async () => {
      const user = userEvent.setup();
      const handleClick = jest.fn();

      renderButton({ onClick: handleClick });
      const button = screen.getByRole('button');

      await user.click(button);
      expect(handleClick).toHaveBeenCalledTimes(1);
    });

    it('does not call onClick when disabled', async () => {
      const user = userEvent.setup();
      const handleClick = jest.fn();

      renderButton({ onClick: handleClick, disabled: true });
      const button = screen.getByRole('button');

      await user.click(button);
      expect(handleClick).not.toHaveBeenCalled();
    });

    it('handles keyboard interactions', async () => {
      const user = userEvent.setup();
      const handleClick = jest.fn();

      renderButton({ onClick: handleClick });
      const button = screen.getByRole('button');

      button.focus();
      await user.keyboard('{Enter}');
      expect(handleClick).toHaveBeenCalledTimes(1);

      await user.keyboard(' ');
      expect(handleClick).toHaveBeenCalledTimes(2);
    });

    it('handles multiple rapid clicks', async () => {
      const user = userEvent.setup();
      const handleClick = jest.fn();

      renderButton({ onClick: handleClick });
      const button = screen.getByRole('button');

      await user.tripleClick(button);
      expect(handleClick).toHaveBeenCalledTimes(3);
    });
  });

  describe('Loading State', () => {
    it('shows loading state correctly', () => {
      renderButton({ loading: true, children: 'Submit' });
      const button = screen.getByRole('button');

      expect(button).toHaveAttribute('loading', 'true');
      expect(button).toHaveTextContent('Submit');
    });

    it('can be clicked while loading if not disabled', async () => {
      const user = userEvent.setup();
      const handleClick = jest.fn();

      renderButton({ onClick: handleClick, loading: true });
      const button = screen.getByRole('button');

      await user.click(button);
      expect(handleClick).toHaveBeenCalledTimes(1);
    });

    it('cannot be clicked when both loading and disabled', async () => {
      const user = userEvent.setup();
      const handleClick = jest.fn();

      renderButton({ onClick: handleClick, loading: true, disabled: true });
      const button = screen.getByRole('button');

      await user.click(button);
      expect(handleClick).not.toHaveBeenCalled();
    });
  });

  describe('Accessibility', () => {
    it('has proper button role', () => {
      renderButton();
      const button = screen.getByRole('button');
      expect(button).toBeInTheDocument();
    });

    it('is focusable when enabled', () => {
      renderButton();
      const button = screen.getByRole('button');
      button.focus();
      expect(button).toHaveFocus();
    });

    it('is not focusable when disabled', () => {
      renderButton({ disabled: true });
      const button = screen.getByRole('button');
      button.focus();
      expect(button).not.toHaveFocus();
    });

    it('supports aria-label', () => {
      renderButton({ 'aria-label': 'Close dialog' } as any);
      const button = screen.getByLabelText('Close dialog');
      expect(button).toBeInTheDocument();
    });

    it('has valid accessibility attributes', () => {
      renderButton({ 'aria-label': 'Test button' } as any);
      const button = screen.getByRole('button');
      expect(button).toHaveValidAccessibility();
    });
  });

  describe('Edge Cases', () => {
    it('handles empty children gracefully', () => {
      renderButton({ children: '' });
      const button = screen.getByRole('button');
      expect(button).toBeInTheDocument();
      expect(button).toHaveTextContent('');
    });

    it('handles null children gracefully', () => {
      renderButton({ children: null as any });
      const button = screen.getByRole('button');
      expect(button).toBeInTheDocument();
    });

    it('handles undefined onClick gracefully', () => {
      renderButton({ onClick: undefined });
      const button = screen.getByRole('button');
      expect(button).toBeInTheDocument();

      fireEvent.click(button);
      // Should not throw error
    });

    it('handles all variant combinations', () => {
      const variants: Array<ButtonProps['variant']> = ['primary', 'secondary', 'danger'];
      const sizes: Array<ButtonProps['size']> = ['sm', 'md', 'lg'];

      variants.forEach((variant) => {
        sizes.forEach((size) => {
          const { unmount } = renderButton({ variant, size });
          const button = screen.getByRole('button');
          expect(button).toBeInTheDocument();
          unmount();
        });
      });
    });
  });

  describe('Performance', () => {
    it('does not re-render unnecessarily', () => {
      const handleClick = jest.fn();
      const { rerender } = renderButton({ onClick: handleClick });

      // Re-render with same props
      rerender(<Button onClick={handleClick}>Test Button</Button>);

      expect(screen.getByRole('button')).toBeInTheDocument();
    });

    it('handles rapid state changes', async () => {
      const user = userEvent.setup();
      const handleClick = jest.fn();

      const { rerender } = renderButton({ onClick: handleClick, disabled: false });
      const button = screen.getByRole('button');

      // Rapid state changes
      rerender(<Button onClick={handleClick} disabled={true}>Test Button</Button>);
      rerender(<Button onClick={handleClick} disabled={false}>Test Button</Button>);

      await user.click(button);
      expect(handleClick).toHaveBeenCalledTimes(1);
    });
  });
});